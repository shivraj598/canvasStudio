import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, describe, expect, it } from 'vitest';
import { describeStoreContract } from './contract.js';
import { hashToken } from './memory.js';
import { createSqliteStore, SQLITE_SCHEMA_VERSION } from './sqlite.js';

const dirs: string[] = [];
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'canvas-sqlite-'));
  dirs.push(dir);
  return dir;
};

afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

describeStoreContract('sqlite (:memory:)', (now) => ({
  store: createSqliteStore({ path: ':memory:', now }),
}));

describeStoreContract('sqlite (file)', (now) => ({
  store: createSqliteStore({ path: join(tempDir(), 'canvas.db'), now }),
}));

describe('sqlite store on disk', () => {
  it('reopens with users, sessions and projects still there', async () => {
    const path = join(tempDir(), 'nested', 'canvas.db');
    const first = createSqliteStore({ path });
    const user = await first.users.upsertByEmail({
      email: 'asha@example.com',
      name: 'Asha',
      avatarUrl: 'https://img.example/a.png',
      provider: 'dev',
    });
    const { token, session } = await first.sessions.create(user.id, 60_000);
    const project = await first.projects.create({ ownerId: user.id, name: 'Site', prompt: 'p' });
    const updated = await first.projects.update(project.id, {
      completedSteps: ['brand'],
      files: [{ path: 'src/App.tsx', content: 'export default 1;' }],
    });
    await first.close();

    const second = createSqliteStore({ path });
    expect(await second.users.findById(user.id)).toEqual(user);
    expect(await second.sessions.find(token)).toEqual(session);
    expect(await second.projects.findById(project.id)).toEqual(updated);
    expect(await second.projects.listByOwner(user.id)).toEqual([updated]);
    await second.close();
  });

  it('creates the schema once and records its version', async () => {
    const path = join(tempDir(), 'canvas.db');
    await createSqliteStore({ path }).close();
    await createSqliteStore({ path }).close(); // reopening must not re-run the migration

    const db = new DatabaseSync(path);
    expect(db.prepare('PRAGMA user_version').get()).toEqual({
      user_version: SQLITE_SCHEMA_VERSION,
    });
    expect(db.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' });
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => row.name);
    expect(tables).toEqual(['projects', 'sessions', 'users']);
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE '%_idx'")
      .all()
      .map((row) => row.name);
    expect(indexes).toContain('projects_owner_updated_idx');
    db.close();
  });

  it('refuses a database written by newer code', async () => {
    const path = join(tempDir(), 'canvas.db');
    const db = new DatabaseSync(path);
    db.exec(`PRAGMA user_version = ${SQLITE_SCHEMA_VERSION + 1}`);
    db.close();
    expect(() => createSqliteStore({ path })).toThrow(/newer than this code/);
  });

  it('stores only token hashes, and JSON columns as text', async () => {
    const path = join(tempDir(), 'canvas.db');
    const store = createSqliteStore({ path });
    const user = await store.users.upsertByEmail({ email: 'a@b.co', name: 'A', provider: 'dev' });
    const { token } = await store.sessions.create(user.id, 60_000);
    const project = await store.projects.create({ ownerId: user.id, name: 'A' });
    await store.projects.update(project.id, { completedSteps: ['brand'] });
    await store.close();

    const db = new DatabaseSync(path);
    expect(db.prepare('SELECT token_hash FROM sessions').all()).toEqual([
      { token_hash: hashToken(token) },
    ]);
    expect(db.prepare('SELECT answers, completed_steps, site FROM projects').get()).toEqual({
      answers: '{}',
      completed_steps: '["brand"]',
      site: null,
    });
    db.close();
  });

  it('cascades deletes from users to their sessions and projects', async () => {
    const path = join(tempDir(), 'canvas.db');
    const store = createSqliteStore({ path });
    const user = await store.users.upsertByEmail({ email: 'a@b.co', name: 'A', provider: 'dev' });
    const { token } = await store.sessions.create(user.id, 60_000);
    const project = await store.projects.create({ ownerId: user.id, name: 'A' });
    await store.close();

    const db = new DatabaseSync(path);
    db.exec('PRAGMA foreign_keys = ON');
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    db.close();

    const reopened = createSqliteStore({ path });
    expect(await reopened.sessions.find(token)).toBeNull();
    expect(await reopened.projects.findById(project.id)).toBeNull();
    await reopened.close();
  });

  it('rejects sessions and projects for users that do not exist', async () => {
    const store = createSqliteStore({ path: ':memory:' });
    await expect(store.sessions.create('ghost', 1000)).rejects.toThrow(/FOREIGN KEY/);
    await expect(store.projects.create({ ownerId: 'ghost', name: 'A' })).rejects.toThrow(
      /FOREIGN KEY/,
    );
    await store.close();
    await store.close(); // closing twice is harmless
  });
});
