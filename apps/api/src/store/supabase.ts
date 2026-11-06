import { randomBytes, randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hashToken } from './memory.js';
import {
  newProjectRow,
  projectPatchColumns,
  toProject,
  toUser,
  type ProjectRow,
  type SessionRow,
  type UserRow,
} from './rows.js';
import type { Session, Store } from './types.js';

/**
 * Postgres persistence through Supabase's REST API (PostgREST), using the service-role key.
 * The tables live in supabase/migrations and have row-level security enabled with no policies,
 * so only this server-side key can read or write them.
 */
export interface SupabaseStoreOptions {
  url: string;
  serviceRoleKey: string;
  /** Custom fetch, e.g. a fake PostgREST in tests. */
  fetch?: typeof fetch;
  now?: () => Date;
}

export class SupabaseStoreError extends Error {
  constructor(
    readonly operation: string,
    readonly detail: {
      message: string;
      code?: string;
      details?: string | null;
      hint?: string | null;
    },
  ) {
    super(
      `Supabase ${operation} failed: ${detail.message}${detail.code ? ` (${detail.code})` : ''}`,
    );
    this.name = 'SupabaseStoreError';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Ids are uuid columns; anything else can never match and would make Postgres error. */
const isUuid = (id: string) => UUID.test(id);

/** Unwraps a supabase-js result, turning `error` into a thrown SupabaseStoreError. */
function unwrap<T>(operation: string, result: { data: T; error: unknown }): T {
  if (result.error) {
    throw new SupabaseStoreError(operation, result.error as SupabaseStoreError['detail']);
  }
  return result.data;
}

/** Like unwrap, for `.single()` queries that must return a row. */
function unwrapRow<T>(operation: string, result: { data: T | null; error: unknown }): T {
  const row = unwrap(operation, result);
  if (row === null) {
    throw new SupabaseStoreError(operation, { message: 'no row was returned' });
  }
  return row;
}

function createSupabaseClient(
  url: string,
  key: string,
  customFetch?: typeof fetch,
): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: customFetch ? { fetch: customFetch } : {},
  });
}

export function createSupabaseStore({
  url,
  serviceRoleKey,
  fetch: customFetch,
  now = () => new Date(),
}: SupabaseStoreOptions): Store {
  const db = createSupabaseClient(url, serviceRoleKey, customFetch);

  return {
    users: {
      async findById(id) {
        if (!isUuid(id)) return null;
        const row = unwrap(
          'users.findById',
          await db.from('users').select('*').eq('id', id).maybeSingle<UserRow>(),
        );
        return row ? toUser(row) : null;
      },
      async findByEmail(email) {
        const row = unwrap(
          'users.findByEmail',
          await db
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .maybeSingle<UserRow>(),
        );
        return row ? toUser(row) : null;
      },
      async upsertByEmail(input) {
        const row = unwrapRow(
          'users.upsertByEmail',
          await db
            .from('users')
            .upsert(
              {
                email: input.email.toLowerCase(),
                name: input.name,
                avatar_url: input.avatarUrl ?? null,
                provider: input.provider,
              },
              { onConflict: 'email' },
            )
            .select('*')
            .single<UserRow>(),
        );
        return toUser(row);
      },
    },

    sessions: {
      async create(userId, ttlMs) {
        const token = randomBytes(32).toString('base64url');
        const session: Session = { userId, expiresAt: new Date(now().getTime() + ttlMs) };
        unwrap(
          'sessions.create',
          await db.from('sessions').insert({
            token_hash: hashToken(token),
            user_id: userId,
            expires_at: session.expiresAt.toISOString(),
          } satisfies SessionRow),
        );
        return { token, session };
      },
      async find(token) {
        const tokenHash = hashToken(token);
        const row = unwrap(
          'sessions.find',
          await db
            .from('sessions')
            .select('user_id, expires_at')
            .eq('token_hash', tokenHash)
            .maybeSingle<Pick<SessionRow, 'user_id' | 'expires_at'>>(),
        );
        if (!row) return null;
        const expiresAt = new Date(row.expires_at);
        if (expiresAt <= now()) {
          unwrap('sessions.find', await db.from('sessions').delete().eq('token_hash', tokenHash));
          return null;
        }
        return { userId: row.user_id, expiresAt };
      },
      async delete(token) {
        unwrap(
          'sessions.delete',
          await db.from('sessions').delete().eq('token_hash', hashToken(token)),
        );
      },
    },

    projects: {
      async create({ ownerId, name, prompt }) {
        const timestamp = now().toISOString();
        const row = unwrapRow(
          'projects.create',
          await db
            .from('projects')
            .insert(newProjectRow({ id: randomUUID(), ownerId, name, prompt, timestamp }))
            .select('*')
            .single<ProjectRow>(),
        );
        return toProject(row);
      },
      async findById(id) {
        if (!isUuid(id)) return null;
        const row = unwrap(
          'projects.findById',
          await db.from('projects').select('*').eq('id', id).maybeSingle<ProjectRow>(),
        );
        return row ? toProject(row) : null;
      },
      async listByOwner(ownerId) {
        if (!isUuid(ownerId)) return [];
        const rows = unwrap(
          'projects.listByOwner',
          await db
            .from('projects')
            .select('*')
            .eq('owner_id', ownerId)
            .order('updated_at', { ascending: false })
            .overrideTypes<ProjectRow[], { merge: false }>(),
        );
        return (rows ?? []).map(toProject);
      },
      async update(id, patch) {
        if (!isUuid(id)) return null;
        const row = unwrap(
          'projects.update',
          await db
            .from('projects')
            .update({ ...projectPatchColumns(patch), updated_at: now().toISOString() })
            .eq('id', id)
            .select('*')
            .maybeSingle<ProjectRow>(),
        );
        return row ? toProject(row) : null;
      },
      async delete(id) {
        if (!isUuid(id)) return false;
        const rows = unwrap(
          'projects.delete',
          await db
            .from('projects')
            .delete()
            .eq('id', id)
            .select('id')
            .overrideTypes<{ id: string }[], { merge: false }>(),
        );
        return (rows ?? []).length > 0;
      },
    },
  };
}
