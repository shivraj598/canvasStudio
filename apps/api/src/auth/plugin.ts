import type { AuthUser } from '@canvas/shared';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from '../errors.js';

export function readBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

/** Resolves `request.user` from `Authorization: Bearer <token>` on every request. */
export const authPlugin: FastifyPluginAsync = fp(async (app) => {
  app.decorateRequest('user', null);
  app.decorateRequest('sessionToken', null);

  app.addHook('onRequest', async (request) => {
    const token = readBearerToken(request.headers.authorization);
    if (!token) return;
    const session = await app.store.sessions.find(token);
    if (!session) return;
    const user = await app.store.users.findById(session.userId);
    if (!user) return;
    request.user = user;
    request.sessionToken = token;
  });
});

/** Returns the signed-in user or throws 401. */
export function requireUser(request: FastifyRequest): AuthUser {
  if (!request.user) throw AppError.unauthorized();
  return request.user;
}
