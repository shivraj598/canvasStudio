import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
// Node's built-in SQLite (no native dependency). Node 22 prints a one-time ExperimentalWarning
// when it loads; the API's scripts pass --disable-warning=ExperimentalWarning to hide it.
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { hashToken } from './memory.js';
import {
  PROJECT_JSON_COLUMNS,
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
 * Local-development persistence in a SQLite file (default apps/api/.data/canvas.db). Same tables
 * and columns as supabase/migrations, with JSON stored as TEXT. Pass `path: ':memory:'` for a
 * throwaway database.
 */
export interface SqliteStoreOptions {
  path: string;
  now?: () => Date;
}

export interface SqliteStore extends Store {
  close(): Promise<void>;
}

/**
 * Schema migrations, applied in order. `PRAGMA user_version` records how many have run, so
 * opening an existing database only applies the new ones. Append; never edit a shipped entry.
 */
const MIGRATIONS = [
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
    name TEXT NOT NULL,
    avatar_url TEXT,
    provider TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);
  CREATE INDEX sessions_user_id_idx ON sessions (user_id);

  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated')),
    prompt TEXT,
    answers TEXT NOT NULL DEFAULT '{}',
    completed_steps TEXT NOT NULL DEFAULT '[]',
    site TEXT,
    files TEXT NOT NULL DEFAULT '[]',
    messages TEXT NOT NULL DEFAULT '[]',
    versions TEXT NOT NULL DEFAULT '[]',
    current_version_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX projects_owner_updated_idx ON projects (owner_id, updated_at DESC);
  `,
];

export const SQLITE_SCHEMA_VERSION = MIGRATIONS.length;

function migrate(db: DatabaseSync) {
  const { user_version: current } = db.prepare('PRAGMA user_version').get() as {
    user_version: number;
  };
  if (current > MIGRATIONS.length) {
    throw new Error(
      `The SQLite database is at schema version ${current}, newer than this code (${MIGRATIONS.length}).`,
    );
  }
  for (let version = current; version < MIGRATIONS.length; version++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[version]!);
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

type StoredProjectRow = Omit<ProjectRow, (typeof PROJECT_JSON_COLUMNS)[number]> &
  Record<(typeof PROJECT_JSON_COLUMNS)[number], string | null>;

const isJsonColumn = (column: string): column is (typeof PROJECT_JSON_COLUMNS)[number] =>
  (PROJECT_JSON_COLUMNS as readonly string[]).includes(column);

/** Converts a value for binding: JSON columns become text, undefined becomes NULL. */
const bindValue = (column: string, value: unknown): SQLInputValue =>
  isJsonColumn(column)
    ? value === null || value === undefined
      ? null
      : JSON.stringify(value)
    : ((value ?? null) as SQLInputValue);

function readProject(stored: StoredProjectRow): ProjectRow {
  const row = { ...stored } as Record<string, unknown>;
  for (const column of PROJECT_JSON_COLUMNS) {
    const text = stored[column];
    row[column] = text === null ? null : JSON.parse(text);
  }
  return row as unknown as ProjectRow;
}

export function createSqliteStore({
  path,
  now = () => new Date(),
}: SqliteStoreOptions): SqliteStore {
  const inMemory = path === ':memory:';
  if (!inMemory) mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  if (!inMemory) db.exec('PRAGMA journal_mode = WAL');
  migrate(db);

  const sql = {
    userById: db.prepare('SELECT * FROM users WHERE id = ?'),
    userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    upsertUser: db.prepare(`
      INSERT INTO users (id, email, name, avatar_url, provider, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (email) DO UPDATE SET
        name = excluded.name,
        avatar_url = excluded.avatar_url,
        provider = excluded.provider
      RETURNING *
    `),
    insertSession: db.prepare(
      'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    ),
    sessionByHash: db.prepare('SELECT * FROM sessions WHERE token_hash = ?'),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    projectById: db.prepare('SELECT * FROM projects WHERE id = ?'),
    projectsByOwner: db.prepare(
      'SELECT * FROM projects WHERE owner_id = ? ORDER BY updated_at DESC, rowid ASC',
    ),
    deleteProject: db.prepare('DELETE FROM projects WHERE id = ?'),
  };

  let open = true;

  return {
    users: {
      async findById(id) {
        const row = sql.userById.get(id) as UserRow | undefined;
        return row ? toUser(row) : null;
      },
      async findByEmail(email) {
        const row = sql.userByEmail.get(email.toLowerCase()) as UserRow | undefined;
        return row ? toUser(row) : null;
      },
      async upsertByEmail(input) {
        const row = sql.upsertUser.get(
          randomUUID(),
          input.email.toLowerCase(),
          input.name,
          input.avatarUrl ?? null,
          input.provider,
          now().toISOString(),
        ) as unknown as UserRow;
        return toUser(row);
      },
    },

    sessions: {
      async create(userId, ttlMs) {
        const token = randomBytes(32).toString('base64url');
        const session: Session = { userId, expiresAt: new Date(now().getTime() + ttlMs) };
        sql.insertSession.run(hashToken(token), userId, session.expiresAt.toISOString());
        return { token, session };
      },
      async find(token) {
        const tokenHash = hashToken(token);
        const row = sql.sessionByHash.get(tokenHash) as SessionRow | undefined;
        if (!row) return null;
        const expiresAt = new Date(row.expires_at);
        if (expiresAt <= now()) {
          sql.deleteSession.run(tokenHash);
          return null;
        }
        return { userId: row.user_id, expiresAt };
      },
      async delete(token) {
        sql.deleteSession.run(hashToken(token));
      },
    },

    projects: {
      async create({ ownerId, name, prompt }) {
        const row = newProjectRow({
          id: randomUUID(),
          ownerId,
          name,
          prompt,
          timestamp: now().toISOString(),
        });
        const columns = Object.keys(row);
        const stored = db
          .prepare(
            `INSERT INTO projects (${columns.join(', ')})
             VALUES (${columns.map(() => '?').join(', ')}) RETURNING *`,
          )
          .get(
            ...columns.map((column) => bindValue(column, row[column as keyof ProjectRow])),
          ) as unknown as StoredProjectRow;
        return toProject(readProject(stored));
      },
      async findById(id) {
        const stored = sql.projectById.get(id) as StoredProjectRow | undefined;
        return stored ? toProject(readProject(stored)) : null;
      },
      async listByOwner(ownerId) {
        const rows = sql.projectsByOwner.all(ownerId) as unknown as StoredProjectRow[];
        return rows.map((stored) => toProject(readProject(stored)));
      },
      async update(id, patch) {
        const changes: Record<string, unknown> = {
          ...projectPatchColumns(patch),
          updated_at: now().toISOString(),
        };
        const columns = Object.keys(changes);
        const stored = db
          .prepare(
            `UPDATE projects SET ${columns.map((c) => `${c} = ?`).join(', ')}
             WHERE id = ? RETURNING *`,
          )
          .get(...columns.map((column) => bindValue(column, changes[column])), id) as
          StoredProjectRow | undefined;
        return stored ? toProject(readProject(stored)) : null;
      },
      async delete(id) {
        return Number(sql.deleteProject.run(id).changes) > 0;
      },
    },

    async close() {
      if (!open) return;
      open = false;
      db.close();
    },
  };
}
