import { randomUUID } from 'node:crypto';
import { chatRequestSchema, type BuildEvent, type Project } from '@canvas/shared';
import type { FastifyPluginAsync } from 'fastify';
import type { OutgoingHttpHeaders } from 'node:http';
import { z } from 'zod';
import { nextVersion, runBuild } from '../ai/build.js';
import { AppError, parseOrThrow } from '../errors.js';
import { DEFAULT_PROJECT_NAME, loadOwnedProject } from './projects.js';

const versionParams = z.object({ versionId: z.uuid() });
const HEARTBEAT_MS = 15_000;

export const chatRoutes: FastifyPluginAsync = async (app) => {
  /** One build at a time per project; the controller lets a new request see it is busy. */
  const activeBuilds = new Map<string, AbortController>();

  app.get('/builder', async () => ({ engine: app.engine.info }));

  /**
   * Runs one chat turn and streams progress as server-sent events (`data: <BuildEvent>`). The
   * build is aborted if the client disconnects; completed files are still saved.
   */
  app.post('/projects/:id/chat', async (request, reply) => {
    const project = await loadOwnedProject(app, request);
    const { prompt } = parseOrThrow(chatRequestSchema, request.body);
    if (activeBuilds.has(project.id)) {
      throw AppError.conflict(
        'Canvas is already working on this project. Stop it or wait for it to finish.',
      );
    }

    const controller = new AbortController();
    activeBuilds.set(project.id, controller);
    reply.raw.on('close', () => {
      if (!reply.raw.writableFinished) controller.abort();
    });

    // Take over the response to stream it, keeping headers (e.g. CORS) set by earlier hooks.
    reply.hijack();
    const headers: OutgoingHttpHeaders = {};
    for (const [key, value] of Object.entries(reply.getHeaders())) {
      if (value !== undefined) headers[key] = value;
    }
    reply.raw.writeHead(200, {
      ...headers,
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });

    const write = (text: string) => {
      if (!reply.raw.destroyed && !reply.raw.writableEnded) reply.raw.write(text);
    };
    const emit = (event: BuildEvent<Project>) => write(`data: ${JSON.stringify(event)}\n\n`);
    // Keeps proxies from closing the connection while the model is thinking.
    const heartbeat = setInterval(() => write(': ping\n\n'), HEARTBEAT_MS);

    try {
      const result = await runBuild({
        engine: app.engine,
        project,
        prompt,
        signal: controller.signal,
        emit,
        onUnexpectedError: (error) => request.log.error(error),
      });
      const rename =
        result.title && project.name === DEFAULT_PROJECT_NAME
          ? result.title.slice(0, 80)
          : undefined;
      const saved = await app.store.projects.update(project.id, {
        ...result.patch,
        ...(rename && { name: rename }),
      });
      if (!saved) throw new Error('Project disappeared during a build');
      emit(
        result.error
          ? { type: 'error', message: result.error, project: saved }
          : { type: 'done', project: saved },
      );
    } catch (error) {
      request.log.error(error);
      emit({ type: 'error', message: 'Something went wrong while saving your changes.' });
    } finally {
      clearInterval(heartbeat);
      activeBuilds.delete(project.id);
      reply.raw.end();
    }
  });

  /** Restores an earlier version by recording it as a new version, so history is never lost. */
  app.post('/projects/:id/versions/:versionId/restore', async (request) => {
    const project = await loadOwnedProject(app, request);
    const { versionId } = parseOrThrow(versionParams, request.params);
    if (activeBuilds.has(project.id)) {
      throw AppError.conflict('Wait for the current build to finish before restoring.');
    }
    const target = project.versions.find((v) => v.id === versionId);
    if (!target) throw AppError.notFound('Version not found');

    const createdAt = new Date().toISOString();
    const { version, versions } = nextVersion(
      project,
      target.files,
      `Restored version ${target.number}`,
      createdAt,
      randomUUID(),
    );
    const updated = await app.store.projects.update(project.id, {
      files: target.files,
      versions,
      currentVersionId: version.id,
      messages: [
        ...project.messages,
        {
          id: randomUUID(),
          role: 'assistant',
          content: `Restored **version ${target.number}** as version ${version.number}. Everything since is still in the history.`,
          versionId: version.id,
          status: 'complete',
          createdAt,
        },
      ],
    });
    return { project: updated };
  });
};
