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
});
