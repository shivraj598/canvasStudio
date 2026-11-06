import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { AuthUser, Project } from '@canvas/shared';
import type { Session, Store } from './types.js';

export interface MemoryStoreOptions {
  now?: () => Date;
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Clones values going in and out so callers can never mutate stored state by reference. */
const clone = <T>(value: T): T => structuredClone(value);

export function createMemoryStore({ now = () => new Date() }: MemoryStoreOptions = {}): Store {
  const users = new Map<string, AuthUser>();
  const sessions = new Map<string, Session>();
  const projects = new Map<string, Project>();

  return {
    users: {
      async findById(id) {
        const user = users.get(id);
        return user ? clone(user) : null;
      },
      async findByEmail(email) {
        const normalized = email.toLowerCase();
        const user = [...users.values()].find((u) => u.email === normalized);
        return user ? clone(user) : null;
      },
      async upsertByEmail(input) {
        const email = input.email.toLowerCase();
        const existing = [...users.values()].find((u) => u.email === email);
        const user: AuthUser = {
          id: existing?.id ?? randomUUID(),
          ...input,
          email,
        };
        users.set(user.id, user);
        return clone(user);
      },
    },

    sessions: {
      async create(userId, ttlMs) {
        const token = randomBytes(32).toString('base64url');
        const session: Session = { userId, expiresAt: new Date(now().getTime() + ttlMs) };
        sessions.set(hashToken(token), session);
        return { token, session: clone(session) };
      },
      async find(token) {
        const key = hashToken(token);
        const session = sessions.get(key);
        if (!session) return null;
        if (session.expiresAt <= now()) {
          sessions.delete(key);
          return null;
        }
        return clone(session);
      },
      async delete(token) {
        sessions.delete(hashToken(token));
      },
    },

    projects: {
      async create({ ownerId, name }) {
        const timestamp = now().toISOString();
        const project: Project = {
          id: randomUUID(),
          ownerId,
          name,
          status: 'draft',
          answers: {},
          completedSteps: [],
          site: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        projects.set(project.id, project);
        return clone(project);
      },
      async findById(id) {
        const project = projects.get(id);
        return project ? clone(project) : null;
      },
      async listByOwner(ownerId) {
        return [...projects.values()]
          .filter((p) => p.ownerId === ownerId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .map(clone);
      },
      async update(id, patch) {
        const existing = projects.get(id);
        if (!existing) return null;
        const updated: Project = { ...existing, ...clone(patch), updatedAt: now().toISOString() };
        projects.set(id, updated);
        return clone(updated);
      },
      async delete(id) {
        return projects.delete(id);
      },
    },
  };
}
