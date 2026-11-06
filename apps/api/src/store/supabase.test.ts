import { beforeEach, describe, expect, it } from 'vitest';
import { createFakePostgrest, type FakePostgrest } from '../test/fake-postgrest.js';
import { describeStoreContract } from './contract.js';
import { hashToken } from './memory.js';
import { createSupabaseStore, SupabaseStoreError } from './supabase.js';
import type { Store } from './types.js';

const URL = 'https://project.supabase.test';
const KEY = 'service-role-key';

describeStoreContract('supabase', (now) => {
  const fake = createFakePostgrest({ url: URL, serviceRoleKey: KEY });
  return { store: createSupabaseStore({ url: URL, serviceRoleKey: KEY, fetch: fake.fetch, now }) };
});

describe('supabase store requests', () => {
  let fake: FakePostgrest;
  let store: Store;
  let clock: Date;

  beforeEach(() => {
    clock = new Date('2026-01-01T00:00:00Z');
    fake = createFakePostgrest({ url: URL, serviceRoleKey: KEY });
    store = createSupabaseStore({
      url: URL,
      serviceRoleKey: KEY,
      fetch: fake.fetch,
      now: () => clock,
    });
  });

  const last = () => fake.requests.at(-1)!;
  const signUp = () =>
    store.users.upsertByEmail({ email: 'Asha@Example.com', name: 'Asha', provider: 'google' });

  it('authenticates every request with the service-role key', async () => {
    await signUp();
    for (const request of fake.requests) {
      expect(request.headers.get('apikey')).toBe(KEY);
      expect(request.headers.get('authorization')).toBe(`Bearer ${KEY}`);
    }
  });

  it('upserts users on email conflict with snake_case columns', async () => {
    await signUp();
    expect(last()).toMatchObject({
      method: 'POST',
      table: 'users',
      body: {
        email: 'asha@example.com',
        name: 'Asha',
        avatar_url: null,
        provider: 'google',
      },
    });
    expect(last().params.get('on_conflict')).toBe('email');
    expect(last().headers.get('prefer')).toContain('resolution=merge-duplicates');
    expect(last().headers.get('prefer')).toContain('return=representation');
    expect(fake.rows('users')).toEqual([
      expect.objectContaining({ email: 'asha@example.com', provider: 'google' }),
    ]);
  });

  it('looks users up by lowercased email', async () => {
    await store.users.findByEmail('ASHA@example.com');
    expect(last()).toMatchObject({ method: 'GET', table: 'users' });
    expect(last().params.get('email')).toBe('eq.asha@example.com');
  });

  it('does not query Postgres with ids that are not uuids', async () => {
    expect(await store.users.findById('not-a-uuid')).toBeNull();
    expect(await store.projects.findById('not-a-uuid')).toBeNull();
    expect(fake.requests).toHaveLength(0);
  });

  it('stores only the sha256 hash of session tokens', async () => {
    const user = await signUp();
    const { token } = await store.sessions.create(user.id, 60_000);
    expect(last()).toMatchObject({
      method: 'POST',
      table: 'sessions',
      body: {
        token_hash: hashToken(token),
        user_id: user.id,
        expires_at: '2026-01-01T00:01:00.000Z',
      },
    });
    expect(JSON.stringify(fake.rows('sessions'))).not.toContain(token);

    await store.sessions.find(token);
    expect(last().params.get('token_hash')).toBe(`eq.${hashToken(token)}`);
  });

  it('deletes a session row once it is found expired', async () => {
    const user = await signUp();
    const { token } = await store.sessions.create(user.id, 1000);
    clock = new Date('2026-01-01T00:00:01Z');
    expect(await store.sessions.find(token)).toBeNull();
    expect(last()).toMatchObject({ method: 'DELETE', table: 'sessions' });
    expect(last().params.get('token_hash')).toBe(`eq.${hashToken(token)}`);
    expect(fake.rows('sessions')).toEqual([]);
  });

  it('writes project patches as snake_case columns with a fresh updated_at', async () => {
    const user = await signUp();
    const project = await store.projects.create({ ownerId: user.id, name: 'Site' });
    clock = new Date('2026-01-01T00:00:05Z');
    await store.projects.update(project.id, { completedSteps: ['brand'], currentVersionId: 'v1' });
    expect(last()).toMatchObject({
      method: 'PATCH',
      table: 'projects',
      body: {
        completed_steps: ['brand'],
        current_version_id: 'v1',
        updated_at: '2026-01-01T00:00:05.000Z',
      },
    });
    expect(last().params.get('id')).toBe(`eq.${project.id}`);
    expect(Object.keys(last().body as object).sort()).toEqual([
      'completed_steps',
      'current_version_id',
      'updated_at',
    ]);
  });

  it('lists projects ordered by updated_at descending', async () => {
    const user = await signUp();
    await store.projects.listByOwner(user.id);
    expect(last().params.get('owner_id')).toBe(`eq.${user.id}`);
    expect(last().params.get('order')).toBe('updated_at.desc');
  });

  it('cascades: deleting a user in Postgres removes their sessions and projects', async () => {
    // Guards the migration's `on delete cascade`, mirrored by the fake.
    const user = await signUp();
    await store.sessions.create(user.id, 1000);
    await store.projects.create({ ownerId: user.id, name: 'Site' });
    await fake.fetch(`${URL}/rest/v1/users?id=eq.${user.id}`, {
      method: 'DELETE',
      headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
    });
    expect(fake.rows('sessions')).toEqual([]);
    expect(fake.rows('projects')).toEqual([]);
  });

  it('turns Supabase errors into clear exceptions', async () => {
    // Foreign key violation: the owner does not exist.
    const error = await store.projects
      .create({ ownerId: '00000000-0000-4000-8000-000000000000', name: 'Orphan' })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SupabaseStoreError);
    expect((error as Error).message).toMatch(/^Supabase projects\.create failed: .*\(23503\)$/);

    const wrongKey = createSupabaseStore({ url: URL, serviceRoleKey: 'nope', fetch: fake.fetch });
    await expect(wrongKey.users.findByEmail('a@b.co')).rejects.toThrow(
      /Supabase users\.findByEmail failed: Invalid API key/,
    );
  });
});
