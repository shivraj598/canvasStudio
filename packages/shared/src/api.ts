/** Request/response contracts shared by the API and the web client. */
import { z } from 'zod';
import { STEP_IDS, type QuestionnaireDraft, type StepId } from './questionnaire.js';
import type { SiteSpec } from './site-spec.js';

export const AUTH_PROVIDERS = ['google', 'github', 'dev'] as const;
export type AuthProviderId = (typeof AUTH_PROVIDERS)[number];

export interface AuthProviderInfo {
  id: AuthProviderId;
  label: string;
  enabled: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: AuthProviderId;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export const devLoginSchema = z.object({
  email: z.email(),
  name: z.string().trim().min(1).max(80),
});
export type DevLoginInput = z.infer<typeof devLoginSchema>;

export type ProjectStatus = 'draft' | 'generated';

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  status: ProjectStatus;
  answers: QuestionnaireDraft;
  completedSteps: StepId[];
  site: SiteSpec | null;
  createdAt: string;
  updatedAt: string;
}

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const saveStepSchema = z.object({
  step: z.enum(STEP_IDS),
  data: z.unknown(),
});
export type SaveStepInput = z.infer<typeof saveStepSchema>;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
