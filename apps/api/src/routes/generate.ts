import { STEP_IDS, getCompletedSteps, isQuestionnaireComplete } from '@canvas/shared';
import type { FastifyPluginAsync } from 'fastify';
import { AppError } from '../errors.js';
import { renderSinglePage } from '../generator/index.js';
import { loadOwnedProject } from './projects.js';

/**
 * The preview is user-authored HTML served from our API origin, so lock it down: no scripts,
 * no forms posting anywhere, only fonts and https images.
 */
export function previewCsp(frameAncestors: string[]): string {
  return [
    "default-src 'none'",
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    'img-src https: data:',
    "form-action 'none'",
    "base-uri 'none'",
    `frame-ancestors ${["'self'", ...frameAncestors].join(' ')}`,
  ].join('; ');
}

export const generateRoutes: FastifyPluginAsync = async (app) => {
  app.post('/projects/:id/generate', async (request) => {
    const project = await loadOwnedProject(app, request);
    const { answers } = project;
    if (!isQuestionnaireComplete(answers)) {
      const done = new Set(getCompletedSteps(answers));
      throw AppError.conflict('Finish the questionnaire before generating your site', {
        missingSteps: STEP_IDS.filter((id) => !done.has(id)),
      });
    }
    const site = await app.generator.generate(answers);
    const updated = await app.store.projects.update(project.id, { site, status: 'generated' });
    return { project: updated };
  });

  app.get('/projects/:id/preview', async (request, reply) => {
    const project = await loadOwnedProject(app, request);
    if (!project.site) throw AppError.notFound('This site has not been generated yet');
    return reply
      .header('content-type', 'text/html; charset=utf-8')
      .header('content-security-policy', previewCsp(app.config.corsOrigins))
      .header('x-content-type-options', 'nosniff')
      .send(renderSinglePage(project.site));
  });
};
