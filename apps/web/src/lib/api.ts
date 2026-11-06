import type {
  ApiErrorBody,
  AuthProviderInfo,
  AuthSession,
  AuthUser,
  DevLoginInput,
  Project,
  StepId,
} from '@canvas/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Per-field validation messages, if the server sent any. */
  get fieldErrors(): Record<string, string> {
    const fields = (this.details as { fields?: Record<string, string> } | undefined)?.fields;
    return fields ?? {};
  }
}

const TOKEN_KEY = 'canvas-studio.session';

/** Session token persistence. Storage can be unavailable (private mode), so never throw. */
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export interface ApiClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  getToken?: () => string | null;
}

export function createApiClient({
  baseUrl = import.meta.env.VITE_API_URL ?? '/api',
  fetch: fetchImpl = (...args) => fetch(...args),
  getToken = tokenStore.get,
}: ApiClientOptions = {}) {
  async function send(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    const token = getToken();
    if (token) headers.set('authorization', `Bearer ${token}`);
    if (init.body !== undefined) headers.set('content-type', 'application/json');

    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl}${path}`, { ...init, headers });
    } catch {
      throw new ApiError(
        0,
        'NETWORK_ERROR',
        'Could not reach Canvas Studio. Check your connection.',
      );
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new ApiError(
        res.status,
        body?.error.code ?? 'HTTP_ERROR',
        body?.error.message ?? `Request failed (${res.status})`,
        body?.error.details,
      );
    }
    return res;
  }

  async function json<T>(path: string, init?: RequestInit): Promise<T> {
    return (await send(path, init)).json() as Promise<T>;
  }

  const body = (value: unknown) => JSON.stringify(value);

  return {
    async providers() {
      return (await json<{ providers: AuthProviderInfo[] }>('/auth/providers')).providers;
    },
    devLogin(input: DevLoginInput) {
      return json<AuthSession>('/auth/dev-login', { method: 'POST', body: body(input) });
    },
    async me() {
      return (await json<{ user: AuthUser }>('/auth/me')).user;
    },
    async logout() {
      await send('/auth/logout', { method: 'POST' });
    },
    async listProjects() {
      return (await json<{ projects: Project[] }>('/projects')).projects;
    },
    async createProject(name?: string) {
      const payload = name ? { name } : {};
      return (
        await json<{ project: Project }>('/projects', { method: 'POST', body: body(payload) })
      ).project;
    },
    async getProject(id: string) {
      return (await json<{ project: Project }>(`/projects/${id}`)).project;
    },
    async renameProject(id: string, name: string) {
      return (
        await json<{ project: Project }>(`/projects/${id}`, {
          method: 'PATCH',
          body: body({ name }),
        })
      ).project;
    },
    async deleteProject(id: string) {
      await send(`/projects/${id}`, { method: 'DELETE' });
    },
    async saveStep(id: string, step: StepId, data: unknown) {
      return (
        await json<{ project: Project }>(`/projects/${id}/answers`, {
          method: 'PUT',
          body: body({ step, data }),
        })
      ).project;
    },
    async generate(id: string) {
      return (await json<{ project: Project }>(`/projects/${id}/generate`, { method: 'POST' }))
        .project;
    },
    async previewHtml(id: string) {
      return (await send(`/projects/${id}/preview`)).text();
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
