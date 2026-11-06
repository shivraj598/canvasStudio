import { devLoginSchema, type AuthSession } from '@canvas/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireUser } from '../auth/plugin.js';
import { listProviders } from '../auth/providers.js';
import { AppError, parseOrThrow } from '../errors.js';

const oauthParams = z.object({ provider: z.enum(['google', 'github']) });

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.get('/auth/providers', async () => ({ providers: listProviders(app.config) }));

  app.post('/auth/dev-login', async (request, reply) => {
    if (!app.config.devLoginEnabled) throw AppError.notFound();
    const input = parseOrThrow(devLoginSchema, request.body);
    const user = await app.store.users.upsertByEmail({ ...input, provider: 'dev' });
    const { token } = await app.store.sessions.create(user.id, app.config.sessionTtlMs);
    const body: AuthSession = { token, user };
    return reply.status(201).send(body);
  });

  // OAuth entry point. The redirect/callback flow is wired up once client credentials exist.
  app.get('/auth/:provider/start', async (request) => {
    const { provider } = parseOrThrow(oauthParams, request.params);
    if (!app.config.oauth[provider]) {
      throw new AppError(
        503,
        'PROVIDER_NOT_CONFIGURED',
        `Sign-in with ${provider} is not configured yet`,
      );
    }
    throw new AppError(501, 'NOT_IMPLEMENTED', `Sign-in with ${provider} is coming soon`);
  });

  app.get('/auth/me', async (request) => ({ user: requireUser(request) }));

  app.post('/auth/logout', async (request, reply) => {
    if (request.sessionToken) await app.store.sessions.delete(request.sessionToken);
    return reply.status(204).send();
  });
};
