/**
 * Behaviour every `Store` implementation must share. Each store's test file runs this suite, so
 * the memory, file and Supabase stores stay interchangeable.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AUTH_PROVIDERS } from '@canvas/shared';
import { completeAnswers } from '@canvas/shared/testing';
import type { ProjectPatch, Store } from './types.js';

export interface StoreHarness {
  store: Store;
}

/** `create(now)` builds a fresh, empty store whose clock is `now`. */
export function describeStoreContract(name: string, create: (now: () => Date) => StoreHarness) {
  describe(`${name} store contract`, () => {
    let clock: Date;
    let store: Store;

    beforeEach(() => {
      clock = new Date('2026-01-01T00:00:00Z');
      store = create(() => clock).store;
    });

    afterEach(async () => {
      await store.close?.();
    });

    const advance = (ms: number) => {
      clock = new Date(clock.getTime() + ms);
    };

    const createUser = (email = 'asha@example.com') =>
      store.users.upsertByEmail({ email, name: 'Asha', provider: 'dev' });

    describe('users', () => {
      it('creates users with normalised emails and finds them', async () => {
        const user = await store.users.upsertByEmail({
          email: 'Asha@Example.com',
          name: 'Asha',
          provider: 'dev',
        });
        expect(user).toEqual({
          id: expect.any(String),
          email: 'asha@example.com',
          name: 'Asha',
          provider: 'dev',
        });
        expect(await store.users.findById(user.id)).toEqual(user);
        expect(await store.users.findByEmail('ASHA@example.com')).toEqual(user);
      });

      it('updates an existing user instead of duplicating', async () => {
        const first = await store.users.upsertByEmail({
          email: 'a@b.co',
          name: 'A',
          avatarUrl: 'https://img.example/a.png',
          provider: 'dev',
        });
        expect(first.avatarUrl).toBe('https://img.example/a.png');
        const second = await store.users.upsertByEmail({
          email: 'A@B.co',
          name: 'Anita',
          provider: 'google',
        });
        expect(second).toEqual({
          id: first.id,
          email: 'a@b.co',
          name: 'Anita',
          provider: 'google',
        });
        expect(await store.users.findById(first.id)).toEqual(second);
      });

      it('supports every sign-in provider', async () => {
        for (const provider of AUTH_PROVIDERS) {
          const user = await store.users.upsertByEmail({
            email: `${provider}@x.co`,
            name: provider,
            provider,
          });
          expect((await store.users.findById(user.id))?.provider).toBe(provider);
        }
      });

      it('returns null for unknown users', async () => {
        expect(await store.users.findById('missing')).toBeNull();
        expect(await store.users.findById('00000000-0000-4000-8000-000000000000')).toBeNull();
        expect(await store.users.findByEmail('missing@x.co')).toBeNull();
      });
    });

    describe('sessions', () => {
      it('issues opaque tokens that resolve to the session', async () => {
        const user = await createUser();
        const { token, session } = await store.sessions.create(user.id, 1000);
        expect(token.length).toBeGreaterThanOrEqual(40);
        expect(session).toEqual({ userId: user.id, expiresAt: new Date('2026-01-01T00:00:01Z') });
        expect(await store.sessions.find(token)).toEqual(session);
        expect(await store.sessions.find('wrong')).toBeNull();
      });

      it('issues a different token every time', async () => {
        const user = await createUser();
        const a = await store.sessions.create(user.id, 1000);
        const b = await store.sessions.create(user.id, 1000);
        expect(a.token).not.toBe(b.token);
        expect(await store.sessions.find(a.token)).not.toBeNull();
        expect(await store.sessions.find(b.token)).not.toBeNull();
      });

      it('expires sessions after their ttl', async () => {
        const user = await createUser();
        const { token } = await store.sessions.create(user.id, 1000);
        advance(999);
        expect(await store.sessions.find(token)).not.toBeNull();
        advance(1);
        expect(await store.sessions.find(token)).toBeNull();
        // Still gone if the clock were turned back: expired sessions are deleted.
        advance(-500);
        expect(await store.sessions.find(token)).toBeNull();
      });

      it('deletes sessions', async () => {
        const user = await createUser();
        const { token } = await store.sessions.create(user.id, 1000);
        await store.sessions.delete(token);
        expect(await store.sessions.find(token)).toBeNull();
        await expect(store.sessions.delete(token)).resolves.toBeUndefined();
      });
    });

    describe('projects', () => {
      it('creates draft projects', async () => {
        const owner = await createUser();
        const project = await store.projects.create({ ownerId: owner.id, name: 'My site' });
        expect(project).toEqual({
          id: expect.any(String),
          ownerId: owner.id,
          name: 'My site',
          status: 'draft',
          answers: {},
          completedSteps: [],
          site: null,
          prompt: null,
          files: [],
          messages: [],
          versions: [],
          currentVersionId: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        });
        expect(await store.projects.findById(project.id)).toEqual(project);
      });

      it('keeps the prompt a project was started from', async () => {
        const owner = await createUser();
        const project = await store.projects.create({
          ownerId: owner.id,
          name: 'Bakery',
          prompt: 'A site for my bakery',
        });
        expect((await store.projects.findById(project.id))?.prompt).toBe('A site for my bakery');
      });

      it('lists only the owner’s projects, most recently updated first', async () => {
        const owner = await createUser('u1@example.com');
        const other = await createUser('u2@example.com');
        const a = await store.projects.create({ ownerId: owner.id, name: 'A' });
        advance(10);
        const b = await store.projects.create({ ownerId: owner.id, name: 'B' });
        await store.projects.create({ ownerId: other.id, name: 'Other' });
        advance(10);
        await store.projects.update(a.id, { name: 'A2' });

        const list = await store.projects.listByOwner(owner.id);
        expect(list.map((p) => p.name)).toEqual(['A2', 'B']);
        expect(list.map((p) => p.id)).toEqual([a.id, b.id]);
        expect(await store.projects.listByOwner('nobody')).toEqual([]);
      });

      it('updates fields and bumps updatedAt', async () => {
        const owner = await createUser();
        const project = await store.projects.create({ ownerId: owner.id, name: 'A' });
        advance(5000);
        const updated = await store.projects.update(project.id, {
          answers: { brand: completeAnswers.brand },
          completedSteps: ['brand'],
        });
        expect(updated?.answers.brand?.brandName).toBe('Sunrise Dental');
        expect(updated?.completedSteps).toEqual(['brand']);
        expect(updated?.name).toBe('A');
        expect(updated?.updatedAt).toBe('2026-01-01T00:00:05.000Z');
        expect(updated?.createdAt).toBe(project.createdAt);
        expect(await store.projects.findById(project.id)).toEqual(updated);
      });

      it('stores generated files, chat and versions', async () => {
        const owner = await createUser();
        const project = await store.projects.create({ ownerId: owner.id, name: 'A' });
        const files = [{ path: 'src/App.tsx', content: 'export default () => null;' }];
        const patch: ProjectPatch = {
          status: 'generated',
          files,
          messages: [
            {
              id: 'm1',
              role: 'user',
              content: 'Make it blue',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          versions: [
            {
              id: 'v1',
              number: 1,
              summary: 'First version',
              files,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          currentVersionId: 'v1',
        };
        const updated = await store.projects.update(project.id, patch);
        expect(updated).toMatchObject(patch);
        expect(await store.projects.findById(project.id)).toEqual(updated);
      });

      it('returns null / false for missing projects', async () => {
        const missing = '00000000-0000-4000-8000-000000000000';
        expect(await store.projects.findById('missing')).toBeNull();
        expect(await store.projects.findById(missing)).toBeNull();
        expect(await store.projects.update('missing', { name: 'x' })).toBeNull();
        expect(await store.projects.update(missing, { name: 'x' })).toBeNull();
        expect(await store.projects.delete('missing')).toBe(false);
        expect(await store.projects.delete(missing)).toBe(false);
      });

      it('deletes projects', async () => {
        const owner = await createUser();
        const project = await store.projects.create({ ownerId: owner.id, name: 'A' });
        expect(await store.projects.delete(project.id)).toBe(true);
        expect(await store.projects.findById(project.id)).toBeNull();
        expect(await store.projects.delete(project.id)).toBe(false);
      });

      it('does not leak internal state by reference', async () => {
        const owner = await createUser();
        const project = await store.projects.create({ ownerId: owner.id, name: 'A' });
        project.name = 'mutated';
        project.completedSteps.push('brand');
        const fresh = await store.projects.findById(project.id);
        expect(fresh?.name).toBe('A');
        expect(fresh?.completedSteps).toEqual([]);
      });
    });
  });
}
