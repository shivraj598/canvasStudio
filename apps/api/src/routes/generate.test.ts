import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, SiteSpec } from '@canvas/shared';
import { completeAnswers } from '@canvas/shared/testing';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { buildSiteSpec } from '../generator/index.js';
import { bearer, signIn, testConfig } from '../test/helpers.js';

let app: FastifyInstance;
let auth: { authorization: string };

beforeEach(async () => {
  app = await buildApp({ config: testConfig() });
  auth = bearer((await signIn(app)).token);
});

afterEach(async () => {
  await app.close();
});

async function createProject(answers: Partial<typeof completeAnswers> = completeAnswers) {
  const created = await app.inject({ method: 'POST', url: '/api/projects', headers: auth });
  const project: Project = created.json().project;
  for (const [step, data] of Object.entries(answers)) {
    await app.inject({
      method: 'PUT',
      url: `/api/projects/${project.id}/answers`,
      headers: auth,
      payload: { step, data },
    });
  }
  return project.id;
}

describe('POST /api/projects/:id/generate', () => {
  it('generates a site from a complete questionnaire', async () => {
    const id = await createProject();
    const res = await app.inject({ method: 'POST', url: `/api/projects/${id}/generate`, headers: auth });
    expect(res.statusCode).toBe(200);
    const project: Project = res.json().project;
    expect(project.status).toBe('generated');
    expect(project.site?.brand.name).toBe('Sunrise Dental');
    expect(project.site?.pages.map((p) => p.slug)).toEqual(['index', 'about', 'services', 'contact']);
  });

  it('refuses to generate until every step is complete', async () => {
    const id = await createProject({ brand: completeAnswers.brand, about: completeAnswers.about });
    const res = await app.inject({ method: 'POST', url: `/api/projects/${id}/generate`, headers: auth });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.details.missingSteps).toEqual([
      'category',
      'goals',
      'pages',
      'dashboard',
      'design',
      'contact',
    ]);
  });

  it('uses the injected generator', async () => {
    const fake: SiteSpec = { ...buildSiteSpec(completeAnswers), brand: { name: 'From AI' } };
    const generate = vi.fn().mockResolvedValue(fake);
    const custom = await buildApp({ config: testConfig(), generator: { generate } });
    const customAuth = bearer((await signIn(custom)).token);
    const { project } = (
      await custom.inject({ method: 'POST', url: '/api/projects', headers: customAuth })
    ).json();
    for (const [step, data] of Object.entries(completeAnswers)) {
      await custom.inject({
        method: 'PUT',
        url: `/api/projects/${project.id}/answers`,
        headers: customAuth,
        payload: { step, data },
      });
    }
    const res = await custom.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/generate`,
      headers: customAuth,
    });
    expect(generate).toHaveBeenCalledWith(completeAnswers);
    expect(res.json().project.site.brand.name).toBe('From AI');
    await custom.close();
  });

  it('requires ownership', async () => {
    const id = await createProject();
    const other = bearer((await signIn(app, 'other@example.com', 'Other')).token);
    const res = await app.inject({ method: 'POST', url: `/api/projects/${id}/generate`, headers: other });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/projects/:id/preview', () => {
  it('returns 404 before generation', async () => {
    const id = await createProject();
    const res = await app.inject({ url: `/api/projects/${id}/preview`, headers: auth });
    expect(res.statusCode).toBe(404);
  });

  it('serves the generated site as locked-down HTML', async () => {
    const id = await createProject();
    await app.inject({ method: 'POST', url: `/api/projects/${id}/generate`, headers: auth });
    const res = await app.inject({ url: `/api/projects/${id}/preview`, headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['content-security-policy']).not.toContain('script-src');
    expect(res.headers['content-security-policy']).toContain(
      "frame-ancestors 'self' http://localhost:5173",
    );
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.body).toContain('<h1>Sunrise Dental</h1>');
  });

  it('requires sign-in', async () => {
    const id = await createProject();
    expect((await app.inject({ url: `/api/projects/${id}/preview` })).statusCode).toBe(401);
  });
});
