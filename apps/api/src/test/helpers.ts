import type { AuthSession } from '@canvas/shared';
import type { FastifyInstance } from 'fastify';
import { loadConfig, type AppConfig } from '../config.js';

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return { ...loadConfig({ NODE_ENV: 'test' }), ...overrides };
}

/** Signs in through the dev-login endpoint and returns the session. */
export async function signIn(
  app: FastifyInstance,
  email = 'asha@example.com',
  name = 'Asha',
): Promise<AuthSession> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/dev-login',
    payload: { email, name },
  });
  if (res.statusCode !== 201) throw new Error(`dev-login failed: ${res.body}`);
  return res.json<AuthSession>();
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
