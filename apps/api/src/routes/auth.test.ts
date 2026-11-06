import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { createMemoryStore } from '../store/memory.js';
import { bearer, signIn, testConfig } from '../test/helpers.js';

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp({ config: testConfig() });
});

afterEach(async () => {
  await app.close();
});

describe('GET /api/auth/providers', () => {
  it('lists Google and GitHub as disabled until configured, plus dev login', async () => {
    const res = await app.inject({ url: '/api/auth/providers' });
    expect(res.statusCode).toBe(200);
    expect(res.json().providers).toEqual([
      { id: 'google', label: 'Continue with Google', enabled: false },
      { id: 'github', label: 'Continue with GitHub', enabled: false },
      { id: 'dev', label: 'Developer sign-in', enabled: true },
    ]);
  });

  it('enables configured OAuth providers and hides dev login in production', async () => {
    const prod = await buildApp({
      config: testConfig({
        devLoginEnabled: false,
        oauth: { google: { clientId: 'id', clientSecret: 's' }, github: null },
      }),
    });
    const res = await prod.inject({ url: '/api/auth/providers' });
    expect(res.json().providers).toEqual([
      { id: 'google', label: 'Continue with Google', enabled: true },
      { id: 'github', label: 'Continue with GitHub', enabled: false },
    ]);
    await prod.close();
  });
});

describe('POST /api/auth/dev-login', () => {
  it('creates a user and returns a session token', async () => {
    const session = await signIn(app, 'Asha@Example.com', 'Asha');
    expect(session.token).toBeTruthy();
    expect(session.user).toMatchObject({
      email: 'asha@example.com',
      name: 'Asha',
      provider: 'dev',
    });
  });

  it('reuses the same account for the same email', async () => {
    const first = await signIn(app, 'asha@example.com');
    const second = await signIn(app, 'ASHA@example.com');
    expect(second.user.id).toBe(first.user.id);
    expect(second.token).not.toBe(first.token);
  });

  it('validates input', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/dev-login',
      payload: { email: 'not-an-email', name: '' },
    });
    expect(res.statusCode).toBe(400);
    expect(Object.keys(res.json().error.details.fields).sort()).toEqual(['email', 'name']);
  });

  it('is unavailable when dev login is disabled', async () => {
    const prod = await buildApp({ config: testConfig({ devLoginEnabled: false }) });
    const res = await prod.inject({
      method: 'POST',
      url: '/api/auth/dev-login',
      payload: { email: 'a@b.co', name: 'A' },
    });
    expect(res.statusCode).toBe(404);
    await prod.close();
  });
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in user', async () => {
    const { token, user } = await signIn(app);
    const res = await app.inject({ url: '/api/auth/me', headers: bearer(token) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user });
  });

  it('rejects missing, unknown and expired tokens', async () => {
    expect((await app.inject({ url: '/api/auth/me' })).statusCode).toBe(401);
    expect(
      (await app.inject({ url: '/api/auth/me', headers: bearer('made-up') })).statusCode,
    ).toBe(401);

    let clock = new Date('2026-01-01T00:00:00Z');
    const shortLived = await buildApp({
      config: testConfig({ sessionTtlMs: 1000 }),
      store: createMemoryStore({ now: () => clock }),
    });
    const { token } = await signIn(shortLived);
    clock = new Date(clock.getTime() + 1001);
    const res = await shortLived.inject({ url: '/api/auth/me', headers: bearer(token) });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
    await shortLived.close();
  });
});

describe('POST /api/auth/logout', () => {
  it('invalidates the session', async () => {
    const { token } = await signIn(app);
    const res = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: bearer(token) });
    expect(res.statusCode).toBe(204);
    expect((await app.inject({ url: '/api/auth/me', headers: bearer(token) })).statusCode).toBe(401);
  });

  it('succeeds even when not signed in', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/logout' });
    expect(res.statusCode).toBe(204);
  });
});

describe('GET /api/auth/:provider/start', () => {
  it('reports unconfigured providers', async () => {
    const res = await app.inject({ url: '/api/auth/google/start' });
    expect(res.statusCode).toBe(503);
    expect(res.json().error.code).toBe('PROVIDER_NOT_CONFIGURED');
  });

  it('rejects unknown providers', async () => {
    expect((await app.inject({ url: '/api/auth/myspace/start' })).statusCode).toBe(400);
  });
});
