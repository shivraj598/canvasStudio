import type { AuthUser } from '@canvas/shared';
import type { BuildEngine } from './ai/types.js';
import type { AppConfig } from './config.js';
import type { SiteGenerator } from './generator/index.js';
import type { Store } from './store/types.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    store: Store;
    generator: SiteGenerator;
    engine: BuildEngine;
  }
  interface FastifyRequest {
    /** The signed-in user, resolved from the bearer token, or null. */
    user: AuthUser | null;
    sessionToken: string | null;
  }
}
