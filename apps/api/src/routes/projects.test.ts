import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Project } from '@canvas/shared';
import { completeAnswers } from '@canvas/shared/testing';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
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

async function createProject(name?: string): Promise<Project> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: auth,
    payload: name ? { name } : {},
  });
  expect(res.statusCode).toBe(201);
  return res.json().project;
}

function saveStep(id: string, step: string, data: unknown, headers = auth) {
  return app.inject({
    method: 'PUT',
    url: `/api/projects/${id}/answers`,
    headers,
    payload: { step, data },
  });
}

describe('authentication', () => {
  it.each([
    ['GET', '/api/projects'],
    ['POST', '/api/projects'],
    ['GET', '/api/projects/00000000-0000-4000-8000-000000000000'],
  ] as const)('%s %s requires sign-in', async (method, url) => {
    const res = await app.inject({ method, url });
    expect(res.statusCode).toBe(401);
  });
});

describe('project CRUD', () => {
  it('creates a draft with a default name', async () => {
    const project = await createProject();
    expect(project).toMatchObject({
      name: 'Untitled website',
      status: 'draft',
      answers: {},
      completedSteps: [],
      site: null,
    });
  });

  it('creates with a custom name and lists projects', async () => {
    await createProject('Clinic site');
    await createProject('Café site');
    const res = await app.inject({ url: '/api/projects', headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.json().projects.map((p: Project) => p.name).sort()).toEqual([
      'Café site',
      'Clinic site',
    ]);
  });

  it('fetches, renames and deletes a project', async () => {
    const { id } = await createProject();

    const fetched = await app.inject({ url: `/api/projects/${id}`, headers: auth });
    expect(fetched.json().project.id).toBe(id);

    const renamed = await app.inject({
      method: 'PATCH',
      url: `/api/projects/${id}`,
      headers: auth,
      payload: { name: 'New name' },
    });
    expect(renamed.json().project.name).toBe('New name');

    const deleted = await app.inject({ method: 'DELETE', url: `/api/projects/${id}`, headers: auth });
    expect(deleted.statusCode).toBe(204);
    expect((await app.inject({ url: `/api/projects/${id}`, headers: auth })).statusCode).toBe(404);
  });

  it('rejects invalid ids and names', async () => {
    expect((await app.inject({ url: '/api/projects/not-a-uuid', headers: auth })).statusCode).toBe(
      400,
    );
    const { id } = await createProject();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/projects/${id}`,
      headers: auth,
      payload: { name: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it("hides other users' projects", async () => {
    const { id } = await createProject();
    const intruder = bearer((await signIn(app, 'mallory@example.com', 'Mallory')).token);

    expect((await app.inject({ url: '/api/projects', headers: intruder })).json().projects).toEqual(
      [],
    );
    for (const method of ['GET', 'DELETE'] as const) {
      const res = await app.inject({ method, url: `/api/projects/${id}`, headers: intruder });
      expect(res.statusCode).toBe(404);
    }
    expect((await saveStep(id, 'brand', completeAnswers.brand, intruder)).statusCode).toBe(404);
  });
});

describe('PUT /api/projects/:id/answers', () => {
  it('saves a step, tracks progress and names the project after the brand', async () => {
    const { id } = await createProject();
    const res = await saveStep(id, 'brand', { brandName: 'Sunrise Dental', tagline: '' });
    expect(res.statusCode).toBe(200);
    const project: Project = res.json().project;
    expect(project.answers.brand).toEqual({ brandName: 'Sunrise Dental' });
    expect(project.completedSteps).toEqual(['brand']);
    expect(project.name).toBe('Sunrise Dental');
  });

  it('keeps a custom project name', async () => {
    const { id } = await createProject('My own name');
    const res = await saveStep(id, 'brand', completeAnswers.brand);
    expect(res.json().project.name).toBe('My own name');
  });

  it('stores normalised data from the step schema', async () => {
    const { id } = await createProject();
    const res = await saveStep(id, 'pages', { pages: ['contact'] });
    expect(res.json().project.answers.pages).toEqual({ pages: ['home', 'contact'], features: [] });
  });

  it('returns field errors for invalid step data without saving', async () => {
    const { id } = await createProject();
    const res = await saveStep(id, 'about', { description: 'short' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { step: 'about', fields: { description: expect.any(String) } },
    });
    const project = (await app.inject({ url: `/api/projects/${id}`, headers: auth })).json().project;
    expect(project.answers).toEqual({});
  });

  it('rejects unknown steps', async () => {
    const { id } = await createProject();
    expect((await saveStep(id, 'billing', {})).statusCode).toBe(400);
  });

  it('completes every step of the questionnaire', async () => {
    const { id } = await createProject();
    let project: Project | undefined;
    for (const [step, data] of Object.entries(completeAnswers)) {
      const res = await saveStep(id, step, data);
      expect(res.statusCode, step).toBe(200);
      project = res.json().project;
    }
    expect(project?.completedSteps).toHaveLength(8);
    expect(project?.answers).toEqual(completeAnswers);
  });
});
