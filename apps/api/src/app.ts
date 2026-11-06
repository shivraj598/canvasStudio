import cors from '@fastify/cors';
import { createClaudeEngine } from './ai/claude.js';
import { createLocalEngine } from './ai/local/engine.js';
import type { BuildEngine } from './ai/types.js';
import Fastify, { type FastifyInstance } from 'fastify';
import { authPlugin } from './auth/plugin.js';
import { loadConfig, type AppConfig } from './config.js';
import { errorBody, errorHandler } from './errors.js';
import { createTemplateGenerator, type SiteGenerator } from './generator/index.js';
import { authRoutes } from './routes/auth.js';
import { chatRoutes } from './routes/chat.js';
import { generateRoutes } from './routes/generate.js';
import { healthRoutes } from './routes/health.js';
import { projectRoutes } from './routes/projects.js';
import { createMemoryStore } from './store/memory.js';
import type { Store } from './store/types.js';

export interface BuildAppOptions {
  config?: AppConfig;
  store?: Store;
  generator?: SiteGenerator;
  engine?: BuildEngine;
  logger?: boolean;
}

export function createEngine(config: AppConfig): BuildEngine {
  if (config.ai.engine === 'claude') {
    return createClaudeEngine({
      apiKey: config.ai.anthropicApiKey,
      model: config.ai.model,
      effort: config.ai.effort,
    });
  }
  return createLocalEngine({ delayMs: config.env === 'test' ? 0 : 10 });
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const app = Fastify({ logger: options.logger ?? config.env !== 'test' });

  app.decorate('config', config);
  app.decorate('store', options.store ?? createMemoryStore());
  app.decorate('generator', options.generator ?? createTemplateGenerator());
  app.decorate('engine', options.engine ?? createEngine(config));

  await app.register(cors, { origin: config.corsOrigins, credentials: true });
  await app.register(authPlugin);

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((request, reply) =>
    reply
      .status(404)
      .send(errorBody('NOT_FOUND', `Route ${request.method} ${request.url} not found`)),
  );

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes);
      await api.register(projectRoutes);
      await api.register(generateRoutes);
      await api.register(chatRoutes);
    },
    { prefix: '/api' },
  );

  return app;
}
