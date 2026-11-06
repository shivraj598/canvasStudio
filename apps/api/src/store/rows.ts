/**
 * Database row shapes (snake_case, matching supabase/migrations and the SQLite schema) and their
 * mapping to the camelCase API types, shared by the SQL-backed stores.
 */
import { AUTH_PROVIDERS, type AuthProviderId, type AuthUser, type Project } from '@canvas/shared';
import type { ProjectPatch } from './types.js';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  provider: string;
  created_at: string;
}

export interface SessionRow {
  token_hash: string;
  user_id: string;
  expires_at: string;
}

export interface ProjectRow {
  id: string;
  owner_id: string;
  name: string;
  status: Project['status'];
  prompt: string | null;
  answers: Project['answers'];
  completed_steps: Project['completedSteps'];
  site: Project['site'];
  files: Project['files'];
  messages: Project['messages'];
  versions: Project['versions'];
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Project columns holding JSON (jsonb in Postgres, TEXT in SQLite). */
export const PROJECT_JSON_COLUMNS = [
  'answers',
  'completed_steps',
  'site',
  'files',
  'messages',
  'versions',
] as const satisfies readonly (keyof ProjectRow)[];

/** Which column each patchable project field is stored in. */
export const PROJECT_PATCH_COLUMNS = {
  name: 'name',
  status: 'status',
  answers: 'answers',
  completedSteps: 'completed_steps',
  site: 'site',
  files: 'files',
  messages: 'messages',
  versions: 'versions',
  currentVersionId: 'current_version_id',
} as const satisfies Record<keyof ProjectPatch, keyof ProjectRow>;

/** The columns a patch sets (fields left undefined are untouched). */
export function projectPatchColumns(patch: ProjectPatch): Partial<ProjectRow> {
  const columns: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(PROJECT_PATCH_COLUMNS)) {
    const value = patch[key as keyof ProjectPatch];
    if (value !== undefined) columns[column] = value;
  }
  return columns as Partial<ProjectRow>;
}

/** The row for a new project, with the same defaults as the memory store. */
export function newProjectRow(input: {
  id: string;
  ownerId: string;
  name: string;
  prompt?: string;
  timestamp: string;
}): ProjectRow {
  return {
    id: input.id,
    owner_id: input.ownerId,
    name: input.name,
    status: 'draft',
    prompt: input.prompt ?? null,
    answers: {},
    completed_steps: [],
    site: null,
    files: [],
    messages: [],
    versions: [],
    current_version_id: null,
    created_at: input.timestamp,
    updated_at: input.timestamp,
  };
}

function toProvider(value: string): AuthProviderId {
  if ((AUTH_PROVIDERS as readonly string[]).includes(value)) return value as AuthProviderId;
  throw new Error(`Unknown sign-in provider "${value}" in the users table`);
}

/** Normalises database timestamps (e.g. Postgres `...+00:00`) to the API's ISO 8601. */
const toIso = (timestamp: string) => new Date(timestamp).toISOString();

export function toUser(row: UserRow): AuthUser {
  const user: AuthUser = {
    id: row.id,
    email: row.email,
    name: row.name,
    provider: toProvider(row.provider),
  };
  if (row.avatar_url) user.avatarUrl = row.avatar_url;
  return user;
}

export function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    status: row.status,
    answers: row.answers ?? {},
    completedSteps: row.completed_steps ?? [],
    site: row.site ?? null,
    prompt: row.prompt ?? null,
    files: row.files ?? [],
    messages: row.messages ?? [],
    versions: row.versions ?? [],
    currentVersionId: row.current_version_id ?? null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}
