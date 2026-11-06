import { beforeEach, describe, expect, it } from 'vitest';
import { completeAnswers } from '@canvas/shared/testing';
import { createMemoryStore } from './memory.js';
import type { Store } from './types.js';

let clock: Date;
let store: Store;

beforeEach(() => {
  clock = new Date('2026-01-01T00:00:00Z');
  store = createMemoryStore({ now: () => clock });
});

const advance = (ms: number) => {
  clock = new Date(clock.getTime() + ms);
};

describe('users', () => {
  it('creates users with normalised emails and finds them', async () => {
    const user = await store.users.upsertByEmail({
      email: 'Asha@Example.com',
      name: 'Asha',
      provider: 'dev',
    });
    expect(user).toMatchObject({ email: 'asha@example.com', name: 'Asha', provider: 'dev' });
    expect(user.id).toBeTruthy();
    expect(await store.users.findById(user.id)).toEqual(user);
    expect(await store.users.findByEmail('ASHA@example.com')).toEqual(user);
  });

  it('updates an existing user instead of duplicating', async () => {
    const first = await store.users.upsertByEmail({ email: 'a@b.co', name: 'A', provider: 'dev' });
    const second = await store.users.upsertByEmail({
      email: 'A@B.co',
      name: 'Anita',
      provider: 'google',
    });
    expect(second.id).toBe(first.id);
    expect(second).toMatchObject({ name: 'Anita', provider: 'google' });
  });

  it('returns null for unknown users', async () => {
    expect(await store.users.findById('missing')).toBeNull();
    expect(await store.users.findByEmail('missing@x.co')).toBeNull();
  });
});

describe('sessions', () => {
  it('issues opaque tokens that resolve to the session', async () => {
    const { token, session } = await store.sessions.create('user-1', 1000);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(session.expiresAt.toISOString()).toBe('2026-01-01T00:00:01.000Z');
    expect(await store.sessions.find(token)).toEqual(session);
    expect(await store.sessions.find('wrong')).toBeNull();
  });

  it('issues a different token every time', async () => {
    const a = await store.sessions.create('user-1', 1000);
    const b = await store.sessions.create('user-1', 1000);
    expect(a.token).not.toBe(b.token);
  });

  it('expires sessions after their ttl', async () => {
    const { token } = await store.sessions.create('user-1', 1000);
    advance(999);
    expect(await store.sessions.find(token)).not.toBeNull();
    advance(1);
    expect(await store.sessions.find(token)).toBeNull();
  });

  it('deletes sessions', async () => {
    const { token } = await store.sessions.create('user-1', 1000);
    await store.sessions.delete(token);
    expect(await store.sessions.find(token)).toBeNull();
  });
});

describe('projects', () => {
  it('creates draft projects', async () => {
    const project = await store.projects.create({ ownerId: 'u1', name: 'My site' });
    expect(project).toMatchObject({
      ownerId: 'u1',
      name: 'My site',
      status: 'draft',
      answers: {},
      completedSteps: [],
      site: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('lists only the owner’s projects, most recently updated first', async () => {
    const a = await store.projects.create({ ownerId: 'u1', name: 'A' });
    advance(10);
    const b = await store.projects.create({ ownerId: 'u1', name: 'B' });
    await store.projects.create({ ownerId: 'u2', name: 'Other' });
    advance(10);
    await store.projects.update(a.id, { name: 'A2' });

    const list = await store.projects.listByOwner('u1');
    expect(list.map((p) => p.name)).toEqual(['A2', 'B']);
    expect(list.map((p) => p.id)).toEqual([a.id, b.id]);
  });

  it('updates fields and bumps updatedAt', async () => {
    const project = await store.projects.create({ ownerId: 'u1', name: 'A' });
    advance(5000);
    const updated = await store.projects.update(project.id, {
      answers: { brand: completeAnswers.brand },
      completedSteps: ['brand'],
    });
    expect(updated?.answers.brand?.brandName).toBe('Sunrise Dental');
    expect(updated?.completedSteps).toEqual(['brand']);
    expect(updated?.updatedAt).toBe('2026-01-01T00:00:05.000Z');
    expect(updated?.createdAt).toBe(project.createdAt);
  });

  it('returns null / false for missing projects', async () => {
    expect(await store.projects.findById('missing')).toBeNull();
    expect(await store.projects.update('missing', { name: 'x' })).toBeNull();
    expect(await store.projects.delete('missing')).toBe(false);
  });

  it('deletes projects', async () => {
    const project = await store.projects.create({ ownerId: 'u1', name: 'A' });
    expect(await store.projects.delete(project.id)).toBe(true);
    expect(await store.projects.findById(project.id)).toBeNull();
  });

  it('does not leak internal state by reference', async () => {
    const project = await store.projects.create({ ownerId: 'u1', name: 'A' });
    project.name = 'mutated';
    project.completedSteps.push('brand');
    const fresh = await store.projects.findById(project.id);
    expect(fresh?.name).toBe('A');
    expect(fresh?.completedSteps).toEqual([]);
  });
});
