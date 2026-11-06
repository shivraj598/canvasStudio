import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  /** Supabase project URL, e.g. https://abcd.supabase.co. */
  SUPABASE_URL: z.preprocess(blankToUndefined, z.url().optional()),
  /** Server-only key; with SUPABASE_URL it switches persistence to Supabase Postgres. */
  SUPABASE_SERVICE_ROLE_KEY: optionalSecret,
  /** Folder for the local SQLite database canvas.db (default apps/api/.data). */
  DATA_DIR: z.preprocess(blankToUndefined, z.string().optional()),
  /** Enables the Claude build engine. Without it, the offline engine is used. */
  ANTHROPIC_API_KEY: optionalSecret,
  ANTHROPIC_MODEL: z.preprocess(blankToUndefined, z.string().optional()),
  ANTHROPIC_EFFORT: z.preprocess(
    blankToUndefined,
    z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('medium'),
  ),
  /** Enables the NVIDIA NIM build engine (OpenAI-compatible, integrate.api.nvidia.com). */
  NVIDIA_API_KEY: optionalSecret,
  NVIDIA_MODEL: z.preprocess(blankToUndefined, z.string().optional()),
  NVIDIA_BASE_URL: z.preprocess(blankToUndefined, z.url().optional()),
  /** Enables the Google Gemini build engine (AI Studio key, Interactions API). */
  GEMINI_API_KEY: optionalSecret,
  GEMINI_MODEL: z.preprocess(blankToUndefined, z.string().optional()),
  /** Comma-separated models tried when the main one is overloaded or out of quota. */
  GEMINI_FALLBACK_MODELS: z.preprocess(blankToUndefined, z.string().optional()),
  /**
   * Force an engine. Default: gemini with a Gemini key, else nim with an NVIDIA key, else claude
   * with an Anthropic key, else local.
   */
  AI_ENGINE: z.preprocess(
    blankToUndefined,
    z.enum(['gemini', 'nim', 'claude', 'local']).optional(),
  ),
});

export interface OAuthClientConfig {
  clientId: string;
  clientSecret: string;
}

export type StoreConfig =
  | { kind: 'supabase'; url: string; serviceRoleKey: string }
  | { kind: 'sqlite'; path: string }
  | { kind: 'memory' };

/** apps/api/.data — resolved from this file so it works from src/ (tsx) and dist/ (build). */
const DEFAULT_DATA_DIR = fileURLToPath(new URL('../.data', import.meta.url));

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
  /** Supabase when URL + service-role key are set, else memory in tests and SQLite otherwise. */
  store: StoreConfig;
  ai: {
    engine: 'gemini' | 'nim' | 'claude' | 'local';
    anthropicApiKey?: string;
    model?: string;
    effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
    nvidia: { apiKey?: string; model?: string; baseUrl?: string };
    gemini: { apiKey?: string; model?: string; fallbackModels?: string[] };
  };
}

function oauthClient(id?: string, secret?: string): OAuthClientConfig | null {
  return id && secret ? { clientId: id, clientSecret: secret } : null;
}

function storeConfig(parsed: z.infer<typeof envSchema>): StoreConfig {
  if (parsed.SUPABASE_URL && parsed.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      kind: 'supabase',
      url: parsed.SUPABASE_URL,
      serviceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
    };
  }
  if (parsed.NODE_ENV === 'test') return { kind: 'memory' };
  const dataDir = parsed.DATA_DIR ? resolve(parsed.DATA_DIR) : DEFAULT_DATA_DIR;
  return { kind: 'sqlite', path: join(dataDir, 'canvas.db') };
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
    store: storeConfig(parsed),
    ai: {
      engine:
        parsed.AI_ENGINE ??
        (parsed.GEMINI_API_KEY
          ? 'gemini'
          : parsed.NVIDIA_API_KEY
            ? 'nim'
            : parsed.ANTHROPIC_API_KEY
              ? 'claude'
              : 'local'),
      anthropicApiKey: parsed.ANTHROPIC_API_KEY,
      model: parsed.ANTHROPIC_MODEL,
      effort: parsed.ANTHROPIC_EFFORT,
      nvidia: {
        apiKey: parsed.NVIDIA_API_KEY,
        model: parsed.NVIDIA_MODEL,
        baseUrl: parsed.NVIDIA_BASE_URL,
      },
      gemini: {
        apiKey: parsed.GEMINI_API_KEY,
        model: parsed.GEMINI_MODEL,
        fallbackModels: parsed.GEMINI_FALLBACK_MODELS?.split(',')
          .map((m) => m.trim())
          .filter(Boolean),
      },
    },
  };
}
