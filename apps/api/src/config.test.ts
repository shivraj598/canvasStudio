import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('applies development defaults', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      env: 'development',
      port: 4000,
      host: '0.0.0.0',
      corsOrigins: ['http://localhost:5173'],
      devLoginEnabled: true,
      oauth: { google: null, github: null },
    });
    expect(config.sessionTtlMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('parses ports, origins and session ttl', () => {
    const config = loadConfig({
      PORT: '8080',
      CORS_ORIGINS: 'https://a.com, https://b.com ,',
      SESSION_TTL_HOURS: '2',
    });
    expect(config.port).toBe(8080);
    expect(config.corsOrigins).toEqual(['https://a.com', 'https://b.com']);
    expect(config.sessionTtlMs).toBe(2 * 60 * 60 * 1000);
  });

  it('enables an OAuth provider only when id and secret are both set', () => {
    expect(loadConfig({ GOOGLE_CLIENT_ID: 'id' }).oauth.google).toBeNull();
    expect(
      loadConfig({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: '' }).oauth.google,
    ).toBeNull();
    expect(
      loadConfig({ GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'secret' }).oauth.github,
    ).toEqual({ clientId: 'id', clientSecret: 'secret' });
  });

  it('disables dev login in production', () => {
    expect(loadConfig({ NODE_ENV: 'production' }).devLoginEnabled).toBe(false);
  });

  it('rejects invalid values', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow();
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow();
  });

  describe('storage', () => {
    it('uses SQLite under apps/api/.data by default', () => {
      expect(loadConfig({}).store).toEqual({
        kind: 'sqlite',
        path: resolve(import.meta.dirname, '..', '.data', 'canvas.db'),
      });
    });

    it('honours DATA_DIR', () => {
      expect(loadConfig({ DATA_DIR: '/tmp/canvas-data' }).store).toEqual({
        kind: 'sqlite',
        path: join('/tmp/canvas-data', 'canvas.db'),
      });
      expect(loadConfig({ DATA_DIR: 'rel/dir' }).store).toEqual({
        kind: 'sqlite',
        path: resolve('rel/dir', 'canvas.db'),
      });
    });

    it('keeps tests in memory', () => {
      expect(loadConfig({ NODE_ENV: 'test' }).store).toEqual({ kind: 'memory' });
    });

    it('switches to Supabase when the URL and service-role key are set, in any environment', () => {
      const supabase = {
        kind: 'supabase',
        url: 'https://p.supabase.co',
        serviceRoleKey: 'service',
      };
      for (const NODE_ENV of ['development', 'test', 'production']) {
        expect(
          loadConfig({
            NODE_ENV,
            SUPABASE_URL: 'https://p.supabase.co',
            SUPABASE_SERVICE_ROLE_KEY: 'service',
          }).store,
        ).toEqual(supabase);
      }
    });

    it('needs both Supabase values and ignores blanks', () => {
      expect(loadConfig({ SUPABASE_URL: 'https://p.supabase.co' }).store.kind).toBe('sqlite');
      expect(loadConfig({ SUPABASE_SERVICE_ROLE_KEY: 'service' }).store.kind).toBe('sqlite');
      expect(
        loadConfig({ SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: 'service', NODE_ENV: 'test' })
          .store,
      ).toEqual({ kind: 'memory' });
    });

    it('rejects a malformed SUPABASE_URL', () => {
      expect(() => loadConfig({ SUPABASE_URL: 'not a url' })).toThrow();
    });
  });
});
