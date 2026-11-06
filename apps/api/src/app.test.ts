import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildApp } from './app.js';
import { AppError, parseOrThrow } from './errors.js';
import { testConfig } from './test/helpers.js';

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp({ config: testConfig() });
});

afterEach(async () => {
  await app.close();
});

describe('GET /api/health', () => {
  it('reports ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });
});

describe('error handling', () => {
  it('returns a JSON 404 for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route GET /api/nope not found' },
    });
  });

  it('maps AppError, validation and unexpected errors to API error bodies', async () => {
    const local = await buildApp({ config: testConfig() });
    local.get('/boom/app', async () => {
      throw AppError.conflict('Already exists', { id: 1 });
    });
    local.get('/boom/zod', async () => parseOrThrow(z.object({ n: z.number() }), { n: 'x' }));
    local.get('/boom/crash', async () => {
      throw new Error('secret internals');
    });

    const app409 = await local.inject({ url: '/boom/app' });
    expect(app409.statusCode).toBe(409);
    expect(app409.json()).toEqual({
      error: { code: 'CONFLICT', message: 'Already exists', details: { id: 1 } },
    });

    const zod400 = await local.inject({ url: '/boom/zod' });
    expect(zod400.statusCode).toBe(400);
    expect(zod400.json().error.code).toBe('VALIDATION_ERROR');
    expect(zod400.json().error.details.fields.n).toBeDefined();

    const crash = await local.inject({ url: '/boom/crash' });
    expect(crash.statusCode).toBe(500);
    expect(crash.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
    await local.close();
  });

  it('rejects malformed JSON with a 400', async () => {
    const local = await buildApp({ config: testConfig() });
    local.post('/echo', async (req) => req.body);
    const res = await local.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{bad json',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBeDefined();
    await local.close();
  });
});

describe('CORS', () => {
  it('allows the configured web origin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { origin: 'http://localhost:5173' },
    });
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('does not allow other origins', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
