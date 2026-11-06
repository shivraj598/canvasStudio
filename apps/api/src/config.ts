import { z } from 'zod';

const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionalSecret = z.preprocess(blankToUndefined, z.string().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  SESSION_TTL_HOURS: z.coerce
    .number()
    .positive()
    .default(24 * 7),
  GOOGLE_CLIENT_ID: optionalSecret,
  GOOGLE_CLIENT_SECRET: optionalSecret,
  GITHUB_CLIENT_ID: optionalSecret,
  GITHUB_CLIENT_SECRET: optionalSecret,
});

export interface OAuthClientConfig {
  clientId: string;
  clientSecret: string;
}

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  host: string;
  corsOrigins: string[];
  sessionTtlMs: number;
  oauth: {
    google: OAuthClientConfig | null;
    github: OAuthClientConfig | null;
  };
  /** Password-less dev login. Never enabled in production. */
  devLoginEnabled: boolean;
}

function oauthClient(id?: string, secret?: string): OAuthClientConfig | null {
  return id && secret ? { clientId: id, clientSecret: secret } : null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  return {
    env: parsed.NODE_ENV,
    port: parsed.PORT,
    host: parsed.HOST,
    corsOrigins: parsed.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    sessionTtlMs: parsed.SESSION_TTL_HOURS * 60 * 60 * 1000,
    oauth: {
      google: oauthClient(parsed.GOOGLE_CLIENT_ID, parsed.GOOGLE_CLIENT_SECRET),
      github: oauthClient(parsed.GITHUB_CLIENT_ID, parsed.GITHUB_CLIENT_SECRET),
    },
    devLoginEnabled: parsed.NODE_ENV !== 'production',
  };
}
