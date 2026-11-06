import type { AuthProviderId, AuthUser, Project } from '@canvas/shared';

/**
 * Persistence boundary. Routes only talk to this interface, so the in-memory store used in
 * development and tests can be swapped for Supabase/Postgres without touching them.
 */
export interface Store {
  users: UserRepository;
  sessions: SessionRepository;
  projects: ProjectRepository;
}

export interface NewUser {
  email: string;
  name: string;
  avatarUrl?: string;
  provider: AuthProviderId;
}

export interface UserRepository {
  findById(id: string): Promise<AuthUser | null>;
  findByEmail(email: string): Promise<AuthUser | null>;
  /** Creates the user, or refreshes name/avatar/provider if the email already exists. */
  upsertByEmail(input: NewUser): Promise<AuthUser>;
}

export interface Session {
  userId: string;
  expiresAt: Date;
}

export interface SessionRepository {
  /** Creates a session and returns the raw bearer token (only a hash is stored). */
  create(userId: string, ttlMs: number): Promise<{ token: string; session: Session }>;
  /** Returns the session for a raw token, or null if unknown or expired. */
  find(token: string): Promise<Session | null>;
  delete(token: string): Promise<void>;
}

export type ProjectPatch = Partial<Pick<Project, 'name' | 'status' | 'answers' | 'completedSteps' | 'site'>>;

export interface ProjectRepository {
  create(input: { ownerId: string; name: string }): Promise<Project>;
  findById(id: string): Promise<Project | null>;
  /** Most recently updated first. */
  listByOwner(ownerId: string): Promise<Project[]>;
  update(id: string, patch: ProjectPatch): Promise<Project | null>;
  delete(id: string): Promise<boolean>;
}
