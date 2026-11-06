/**
 * The Claude engine: streams a real model's output in the artifact protocol. The current files
 * go into every request, so Claude always edits the latest version of the site.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage, ProjectFile } from '@canvas/shared';
import { designContext, historyTurns, requestText } from './conversation.js';
import type { PromptLibrary } from './prompts.js';
import { EngineError, type BuildEngine } from './types.js';

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ClaudeEngineOptions {
  library: PromptLibrary;
  apiKey?: string;
  model?: string;
  effort?: Effort;
  /** For tests: inject a client. */
  client?: Anthropic;
}

export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5-5';

/** Earlier turns as plain text; the latest turn carries the files and any design reference. */
export function toMessages(
  library: PromptLibrary,
  history: ChatMessage[],
  prompt: string,
  files: ProjectFile[],
): Anthropic.Beta.BetaMessageParam[] {
  const context = designContext(library, prompt, history, files);
  const text = requestText(prompt, files, context);
  const images: Anthropic.Beta.BetaImageBlockParam[] = context?.withImages
    ? context.design.images.map((img) => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
      }))
    : [];
  return [
    ...historyTurns(history),
    { role: 'user', content: images.length ? [...images, { type: 'text', text }] : text },
  ];
}

function friendlyError(error: unknown): EngineError {
  if (error instanceof Anthropic.AuthenticationError) {
    return new EngineError(
      'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY on the server.',
    );
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new EngineError(
      'Claude is handling a lot of requests right now. Try again in a moment.',
    );
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new EngineError('Could not reach Claude. Check the server’s network connection.');
  }
  if (error instanceof Anthropic.APIError) {
    return new EngineError(
      `Claude returned an error (${error.status ?? 'unknown'}). Please try again.`,
    );
  }
  return new EngineError('Something went wrong while generating. Please try again.');
}

export function createClaudeEngine(options: ClaudeEngineOptions): BuildEngine {
  const client = options.client ?? new Anthropic({ apiKey: options.apiKey });
  const model = options.model ?? DEFAULT_CLAUDE_MODEL;
  const effort = options.effort ?? 'medium';

  return {
    info: { id: 'claude', label: 'Claude' },

    async *stream({ prompt, history, files, signal }) {
      let final: Anthropic.Beta.BetaMessage;
      try {
        const stream = client.beta.messages.stream(
          {
            model,
            max_tokens: 64000,
            system: [
              { type: 'text', text: options.library.system, cache_control: { type: 'ephemeral' } },
            ],
            messages: toMessages(options.library, history, prompt, files),
            output_config: { effort },
            // If a safety classifier declines, retry on a fallback model chosen by the API.
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
          },
          { signal },
        );

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield event.delta.text;
          }
        }
        final = await stream.finalMessage();
      } catch (error) {
        if (signal.aborted) throw error;
        throw friendlyError(error);
      }

      if (final.stop_reason === 'refusal') {
        throw new EngineError('Claude declined this request. Try rephrasing it.');
      }
      if (final.stop_reason === 'max_tokens') {
        yield '\n\n_The response hit the length limit, so some files may be incomplete. Ask me to continue._';
      }
    },
  };
}
