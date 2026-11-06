import type { QuestionnaireAnswers, SiteSpec } from '@canvas/shared';
import { buildSiteSpec } from './spec.js';

export { renderSiteFiles, renderSinglePage } from './render.js';
export { buildSiteSpec } from './spec.js';

/**
 * Produces a site spec from questionnaire answers. The template generator is deterministic; an
 * AI-backed generator (e.g. Claude writing tailored copy) can implement the same interface.
 */
export interface SiteGenerator {
  generate(answers: QuestionnaireAnswers): Promise<SiteSpec>;
}

export function createTemplateGenerator(options: { now?: () => Date } = {}): SiteGenerator {
  return {
    async generate(answers) {
      return buildSiteSpec(answers, options);
    },
  };
}
