/**
 * Turns a project's chat into model input, shared by every AI engine: earlier turns as plain
 * text, then one final user turn holding the current files, any matching design reference and
 * the request.
 */
import type { ChatMessage, ProjectFile } from '@canvas/shared';
import { matchDesign, type DesignReference, type PromptLibrary } from './prompts.js';

export const HISTORY_LIMIT = 12;

export interface TextTurn {
  role: 'user' | 'assistant';
  content: string;
}

export function historyTurns(history: ChatMessage[]): TextTurn[] {
  const turns: TextTurn[] = history
    .filter((m) => m.content.trim() || m.changes?.length)
    .slice(-HISTORY_LIMIT)
    .map((m) => ({
      role: m.role,
      content:
        m.role === 'assistant' && m.changes?.length
          ? `${m.content.trim()}\n\n(Files written: ${m.changes.map((c) => c.path).join(', ')})`
          : m.content,
    }));
  while (turns[0]?.role === 'assistant') turns.shift();
  return turns;
}

export function filesBlock(files: ProjectFile[]): string {
  if (files.length === 0) return 'The project is empty — this is a brand new site.';
  return `<current_files>\n${files
    .map((f) => `<file path="${f.path}">\n${f.content}\n</file>`)
    .join('\n')}\n</current_files>`;
}

const DESIGN_REQUEST =
  /\b(redesign|re-design|design|style|look|layout|reference|template|theme)\b/i;

export interface DesignContext {
  design: DesignReference;
  /** Attach screenshots too (fresh builds and explicit design requests only, to save tokens). */
  withImages: boolean;
}

/** Picks a design reference for this turn from the request and the project's first prompt. */
export function designContext(
  library: PromptLibrary,
  prompt: string,
  history: ChatMessage[],
  files: ProjectFile[],
): DesignContext | undefined {
  const firstPrompt = history.find((m) => m.role === 'user')?.content ?? '';
  const design = matchDesign(library.designs, `${firstPrompt}\n${prompt}`);
  if (!design) return undefined;
  const fresh = files.length === 0;
  if (!fresh && !DESIGN_REQUEST.test(prompt)) return undefined;
  return { design, withImages: design.images.length > 0 };
}

/** The text of the final user turn. */
export function requestText(prompt: string, files: ProjectFile[], context?: DesignContext): string {
  const parts = [filesBlock(files)];
  if (context) {
    parts.push(
      `<design_reference name="${context.design.name}">\n${context.design.notes}\n${
        context.withImages
          ? `\nThe attached ${context.design.images.length === 1 ? 'image is a screenshot' : `${context.design.images.length} images are screenshots`} of this reference design. Match their look and feel with original content.`
          : ''
      }\n</design_reference>`,
    );
  }
  parts.push(`<request>\n${prompt}\n</request>`);
  return parts.join('\n\n');
}
