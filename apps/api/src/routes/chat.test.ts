import type { BuildEvent, Project } from '@canvas/shared';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuild } from '../ai/build.js';
import { EngineError, type BuildEngine } from '../ai/types.js';
import { buildApp } from '../app.js';
import { bearer, signIn, testConfig } from '../test/helpers.js';

let app: FastifyInstance;
let auth: { authorization: string };

async function setup(engine?: BuildEngine) {
  app = await buildApp({ config: testConfig(), engine });
  auth = bearer((await signIn(app)).token);
}

afterEach(async () => {
  await app?.close();
});

function parseEvents(body: string): BuildEvent<Project>[] {
  return body
    .split('\n\n')
    .filter((block) => block.startsWith('data: '))
    .map((block) => JSON.parse(block.slice(6)) as BuildEvent<Project>);
}

async function createProject(): Promise<Project> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: auth,
    payload: { prompt: 'A dental clinic called Bright Smile' },
  });
  return res.json().project;
}

async function chat(id: string, prompt: string) {
  const res = await app.inject({
    method: 'POST',
    url: `/api/projects/${id}/chat`,
    headers: auth,
    payload: { prompt },
  });
  return { res, events: parseEvents(res.body) };
}

describe('POST /api/projects/:id/chat (local engine)', () => {
  beforeEach(() => setup());

  it('streams a build and saves files, messages and a version', async () => {
    const project = await createProject();
    expect(project.prompt).toBe('A dental clinic called Bright Smile');

    const { res, events } = await chat(project.id, 'A dental clinic called Bright Smile');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');

    const types = events.map((e) => e.type);
    expect(types[0]).toBe('start');
    expect(types).toContain('text');
    expect(types).toContain('file_start');
    expect(types).toContain('file_delta');
    expect(types.at(-1)).toBe('done');

    const done = events.at(-1) as Extract<BuildEvent<Project>, { type: 'done' }>;
    const saved = done.project;
    expect(saved.name).toBe('Bright Smile');
    expect(saved.status).toBe('generated');
    expect(saved.files.map((f) => f.path)).toContain('index.html');
    expect(saved.versions).toHaveLength(1);
    expect(saved.currentVersionId).toBe(saved.versions[0]!.id);
    expect(saved.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(saved.messages[1]!.changes).toContainEqual({ path: 'index.html', operation: 'create' });
  });

  it('iterates on the site and restores earlier versions', async () => {
    const project = await createProject();
    await chat(project.id, 'A dental clinic');
    const { events } = await chat(project.id, 'Make it dark');
    const v2 = (events.at(-1) as { project: Project }).project;
    expect(v2.versions).toHaveLength(2);
    expect(v2.messages[3]!.changes).toContainEqual({ path: 'src/index.css', operation: 'update' });
    const v1 = v2.versions[0]!;

    const res = await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/versions/${v1.id}/restore`,
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
    const restored: Project = res.json().project;
    expect(restored.versions).toHaveLength(3);
    expect(restored.versions[2]!.summary).toBe('Restored version 1');
    expect(restored.files).toEqual(v1.files);
    expect(restored.messages.at(-1)!.content).toContain('Restored **version 1**');
  });

  it('validates the prompt and project ownership', async () => {
    const project = await createProject();
    const empty = await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/chat`,
      headers: auth,
      payload: { prompt: '   ' },
    });
    expect(empty.statusCode).toBe(400);

    const other = bearer((await signIn(app, 'other@example.com', 'Other')).token);
    const res = await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/chat`,
      headers: other,
      payload: { prompt: 'hi' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('reports the active engine', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/builder', headers: auth });
    expect(res.json()).toEqual({ engine: { id: 'local', label: 'Canvas Local' } });
  });
});

function scriptedEngine(chunks: string[], fail?: Error): BuildEngine {
  return {
    info: { id: 'claude', label: 'Fake' },
    async *stream() {
      for (const c of chunks) yield c;
      if (fail) throw fail;
    },
  };
}

describe('runBuild', () => {
  const baseProject: Project = {
    id: 'p1',
    ownerId: 'u1',
    name: 'Untitled website',
    status: 'draft',
    answers: {},
    completedSteps: [],
    site: null,
    prompt: null,
    files: [{ path: 'old.js', content: 'x' }],
    messages: [],
    versions: [],
    currentVersionId: null,
    createdAt: '',
    updatedAt: '',
  };
  let n = 0;
  const opts = { now: () => new Date('2026-01-01'), newId: () => `id-${++n}` };

  it('applies files, deletes and skips unsafe paths', async () => {
    const events: BuildEvent<Project>[] = [];
    const result = await runBuild({
      ...opts,
      engine: scriptedEngine([
        'Hi! <canvasArtifact title="Neat">',
        '<canvasAction type="file" path="index.html">\n<h1>Hi</h1>\n</canvasAction>',
        '<canvasAction type="file" path="../evil.sh">rm -rf</canvasAction>',
        '<canvasAction type="delete" path="old.js"></canvasAction></canvasArtifact> Bye',
      ]),
      project: baseProject,
      prompt: 'build it',
      signal: new AbortController().signal,
      emit: (e) => events.push(e),
    });
    expect(result.status).toBe('complete');
    expect(result.title).toBe('Neat');
    expect(result.patch.files).toEqual([{ path: 'index.html', content: '<h1>Hi</h1>\n' }]);
    expect(result.patch.messages?.[1]).toMatchObject({
      content: 'Hi!  Bye',
      changes: [
        { path: 'index.html', operation: 'create' },
        { path: 'old.js', operation: 'delete' },
      ],
    });
    expect(events.some((e) => e.type === 'file_start' && e.path.includes('evil'))).toBe(false);
  });

  it('adds packages the model imported but forgot to declare', async () => {
    const result = await runBuild({
      ...opts,
      engine: scriptedEngine([
        'Done. <canvasArtifact>',
        '<canvasAction type="file" path="package.json">{"name":"x","dependencies":{"react":"^19.1.0"}}</canvasAction>',
        '<canvasAction type="file" path="src/App.tsx">import clsx from \'clsx\';\nexport const c = clsx(\'a\');</canvasAction>',
        '</canvasArtifact>',
      ]),
      project: { ...baseProject, files: [] },
      prompt: 'build it',
      signal: new AbortController().signal,
      emit: () => {},
    });
    const pkg = result.patch.files!.find((f) => f.path === 'package.json')!;
    expect(JSON.parse(pkg.content).dependencies.clsx).toBe('^2.1.1');
    expect(result.patch.messages?.[1]?.content).toContain('Added `clsx` to package.json');
  });

  it('removes imports the model left unused', async () => {
    const events: BuildEvent<Project>[] = [];
    const result = await runBuild({
      ...opts,
      engine: scriptedEngine([
        'Done. <canvasArtifact>',
        '<canvasAction type="file" path="src/Hero.tsx">',
        "import { Heart, Star } from 'lucide-react';\nimport { site } from './content';\n",
        'export const Hero = () => <Star />;\n',
        '</canvasAction></canvasArtifact>',
      ]),
      project: { ...baseProject, files: [] },
      prompt: 'build it',
      signal: new AbortController().signal,
      emit: (e) => events.push(e),
    });
    const hero = result.patch.files!.find((f) => f.path === 'src/Hero.tsx')!;
    expect(hero.content).toBe(
      "import { Star } from 'lucide-react';\nexport const Hero = () => <Star />;\n",
    );
    expect(result.patch.messages?.[1]?.content).toContain('Removed 2 unused imports');
    // The live view gets the cleaned file too.
    const deltas = events.filter((e) => e.type === 'file_delta' && e.path === 'src/Hero.tsx');
    expect(deltas.at(-1)).toMatchObject({ delta: hero.content });
  });

  it('keeps files unchanged and explains when the engine fails', async () => {
    const result = await runBuild({
      ...opts,
      engine: scriptedEngine(
        ['Working <canvasArtifact><canvasAction type="file" path="a.html">a</canvasAction>'],
        new EngineError('Claude is busy'),
      ),
      project: baseProject,
      prompt: 'build it',
      signal: new AbortController().signal,
      emit: () => {},
    });
    expect(result.status).toBe('error');
    expect(result.error).toBe('Claude is busy');
    expect(result.patch.files).toBeUndefined();
    expect(result.patch.messages?.[1]?.content).toBe('Working\n\nClaude is busy');
  });
});
