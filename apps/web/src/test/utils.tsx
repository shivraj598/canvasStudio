import type { AuthUser, Project } from '@canvas/shared';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { vi, type Mocked } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import type { ApiClient } from '../lib/api';
import { TooltipProvider } from '../components/ui/tooltip';
import { ApiProvider } from '../lib/ApiContext';

export const testUser: AuthUser = {
  id: 'user-1',
  email: 'asha@example.com',
  name: 'Asha',
  provider: 'dev',
};

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    ownerId: testUser.id,
    name: 'Sunrise Dental',
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
    ...overrides,
  };
}

/** An ApiClient whose methods are all mocks. Unconfigured calls reject loudly. */
export function createFakeApi(overrides: Partial<ApiClient> = {}): Mocked<ApiClient> {
  const notMocked = (name: string) =>
    vi.fn().mockRejectedValue(new Error(`api.${name} was called but not mocked`));
  const methods: (keyof ApiClient)[] = [
    'providers',
    'devLogin',
    'me',
    'logout',
    'listProjects',
    'createProject',
    'getProject',
    'renameProject',
    'deleteProject',
    'saveStep',
    'generate',
    'previewHtml',
    'builderInfo',
    'restoreVersion',
    'streamChat',
  ];
  const api = Object.fromEntries(
    methods.map((m) => [m, notMocked(m)]),
  ) as unknown as Mocked<ApiClient>;
  // Only called when a session token is stored; default to the test user.
  api.me = vi.fn().mockResolvedValue(testUser);
  for (const [key, value] of Object.entries(overrides)) {
    (api as Record<string, unknown>)[key] = vi.fn(value as (...args: unknown[]) => unknown);
  }
  return api;
}

export interface RenderOptions {
  api?: Mocked<ApiClient>;
  route?: string | { pathname: string; state?: unknown };
  /** Pretend a session token is already stored; `api.me` decides who it belongs to. */
  signedIn?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  { api = createFakeApi(), route = '/', signedIn = false }: RenderOptions = {},
) {
  if (signedIn) localStorage.setItem('canvas-studio.session', 'test-token');
  const result = render(
    <ApiProvider client={api}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>
          <TooltipProvider>{ui}</TooltipProvider>
        </MemoryRouter>
      </AuthProvider>
    </ApiProvider>,
  );
  return { ...result, api };
}
