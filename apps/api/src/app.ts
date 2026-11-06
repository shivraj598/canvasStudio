import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { authPlugin } from './auth/plugin.js';
import { loadConfig, type AppConfig } from './config.js';
import { errorBody, errorHandler } from './errors.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';
import { createMemoryStore } from './store/memory.js';
import type { Store } from './store/types.js';

export interface BuildAppOptions {
  config?: AppConfig;
  store?: Store;
  logger?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const app = Fastify({ logger: options.logger ?? config.env !== 'test' });

  app.decorate('config', config);
  app.decorate('store', options.store ?? createMemoryStore());

  await app.register(cors, { origin: config.corsOrigins, credentials: true });
  await app.register(authPlugin);

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send(errorBody('NOT_FOUND', `Route ${request.method} ${request.url} not found`)),
  );

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes);
    },
    { prefix: '/api' },
  );

  return app;
}
