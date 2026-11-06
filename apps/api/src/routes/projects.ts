import {
  createProjectSchema,
  getCompletedSteps,
  saveStepSchema,
  validateStep,
  type Project,
} from '@canvas/shared';
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireUser } from '../auth/plugin.js';
import { AppError, parseOrThrow } from '../errors.js';

export const DEFAULT_PROJECT_NAME = 'Untitled website';

const idParams = z.object({ id: z.uuid() });
const renameSchema = z.object({ name: z.string().trim().min(1).max(80) });

/**
 * Loads a project owned by the signed-in user. Projects owned by someone else are reported as
 * missing so their existence is not revealed.
 */
export async function loadOwnedProject(
  app: FastifyInstance,
  request: FastifyRequest,
): Promise<Project> {
  const user = requireUser(request);
  const { id } = parseOrThrow(idParams, request.params);
  const project = await app.store.projects.findById(id);
  if (!project || project.ownerId !== user.id) throw AppError.notFound('Project not found');
  return project;
}

export const projectRoutes: FastifyPluginAsync = async (app) => {
  app.get('/projects', async (request) => {
    const user = requireUser(request);
    return { projects: await app.store.projects.listByOwner(user.id) };
  });

  app.post('/projects', async (request, reply) => {
    const user = requireUser(request);
    const { name } = parseOrThrow(createProjectSchema, request.body ?? {});
    const project = await app.store.projects.create({
      ownerId: user.id,
      name: name ?? DEFAULT_PROJECT_NAME,
    });
    return reply.status(201).send({ project });
  });

  app.get('/projects/:id', async (request) => ({
    project: await loadOwnedProject(app, request),
  }));

  app.patch('/projects/:id', async (request) => {
    const project = await loadOwnedProject(app, request);
    const { name } = parseOrThrow(renameSchema, request.body);
    return { project: await app.store.projects.update(project.id, { name }) };
  });

  app.delete('/projects/:id', async (request, reply) => {
    const project = await loadOwnedProject(app, request);
    await app.store.projects.delete(project.id);
    return reply.status(204).send();
  });

  /** Saves one questionnaire step. Steps can be saved in any order and re-saved later. */
  app.put('/projects/:id/answers', async (request) => {
    const project = await loadOwnedProject(app, request);
    const { step, data } = parseOrThrow(saveStepSchema, request.body);

    const result = validateStep(step, data);
    if (!result.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', {
        step,
        fields: result.fieldErrors,
      });
    }

    const answers = { ...project.answers, [step]: result.data };
    const name =
      answers.brand && project.name === DEFAULT_PROJECT_NAME
        ? answers.brand.brandName
        : project.name;

    const updated = await app.store.projects.update(project.id, {
      name,
      answers,
      completedSteps: getCompletedSteps(answers),
    });
    return { project: updated };
  });
};
