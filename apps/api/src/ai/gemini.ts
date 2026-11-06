/**
 * Google Gemini engine (AI Studio API key) on the Interactions API, streamed over server-sent
 * events. Requests are stateless (`store: false`): the conversation is sent as steps each turn.
 * Thought summaries stream as reasoning; design reference screenshots go along as images.
 *
 * Gemini models are often briefly overloaded (503) or have no free-tier quota (429), so the
 * engine falls through a list of models until one starts streaming.
 */
import type { ChatMessage, ProjectFile } from '@canvas/shared';
import { designContext, historyTurns, requestText } from './conversation.js';
import { modelLabel } from './nim.js';
import type { PromptLibrary } from './prompts.js';
import { EngineError, type BuildEngine, type EngineChunk } from './types.js';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
export const DEFAULT_GEMINI_FALLBACKS = ['gemini-3.6-flash'];
export const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiEngineOptions {
  apiKey: string;
  library: PromptLibrary;
  model?: string;
  /** Tried in order when the model is overloaded or out of quota before it starts answering. */
  fallbackModels?: string[];
  baseUrl?: string;
  maxOutputTokens?: number;
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  fetch?: typeof fetch;
}

type Content = { type: 'text'; text: string } | { type: 'image'; mime_type: string; data: string };

export interface GeminiStep {
  type: 'user_input' | 'model_output';
  content: Content[];
}

export function buildGeminiInput(
  library: PromptLibrary,
  prompt: string,
  history: ChatMessage[],
  files: ProjectFile[],
): GeminiStep[] {
  const context = designContext(library, prompt, history, files);
  const steps: GeminiStep[] = historyTurns(history).map((turn) => ({
    type: turn.role === 'user' ? 'user_input' : 'model_output',
    content: [{ type: 'text', text: turn.content }],
  }));
  const last: GeminiStep = {
    type: 'user_input',
    content: [{ type: 'text', text: requestText(prompt, files, context) }],
  };
  if (context?.withImages) {
    for (const img of context.design.images) {
      last.content.push({ type: 'image', mime_type: img.mediaType, data: img.base64 });
    }
  }
  return [...steps, last];
}

/** Statuses worth retrying on the next model: overloaded or no quota for this one. */
const FALL_THROUGH = new Set([429, 503]);

async function errorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const json = JSON.parse(text) as { error?: { message?: string } };
    if (json.error?.message) return json.error.message;
  } catch {
    // not JSON
  }
  return text.slice(0, 300);
}

function friendlyHttpError(status: number, model: string, detail: string): EngineError {
  switch (status) {
    case 401:
    case 403:
      return new EngineError(
        'The Gemini API key was rejected. Check GEMINI_API_KEY on the server.',
      );
    case 404:
      return new EngineError(`Gemini doesn't offer the model “${model}”. Check GEMINI_MODEL.`);
    case 429:
      return new EngineError(
        `Gemini is rate-limiting requests${detail ? `: ${detail}` : '.'} Try again in a moment.`,
      );
    case 503:
      return new EngineError('Gemini is overloaded right now. Please try again in a moment.');
    default:
      return new EngineError(
        `The Gemini API returned an error (${status})${detail ? `: ${detail}` : ''}`,
      );
  }
}

interface StreamEvent {
  event_type?: string;
  index?: number;
  step?: { type?: string };
  delta?: { type?: string; text?: string; content?: { text?: string } };
  interaction?: { status?: string };
  error?: { message?: string; code?: string };
}

export function createGeminiEngine(options: GeminiEngineOptions): BuildEngine {
  const model = options.model ?? DEFAULT_GEMINI_MODEL;
  const models = [...new Set([model, ...(options.fallbackModels ?? DEFAULT_GEMINI_FALLBACKS)])];
  const baseUrl = (options.baseUrl ?? DEFAULT_GEMINI_BASE_URL).replace(/\/$/, '');
  const fetchImpl = options.fetch ?? fetch;

  async function open(candidate: string, input: GeminiStep[], signal: AbortSignal) {
    try {
      return await fetchImpl(`${baseUrl}/interactions`, {
        method: 'POST',
        signal,
        headers: {
          'x-goog-api-key': options.apiKey,
          'content-type': 'application/json',
          accept: 'text/event-stream',
        },
        body: JSON.stringify({
          model: candidate,
          store: false,
          stream: true,
          system_instruction: options.library.system,
          input,
          generation_config: {
            max_output_tokens: options.maxOutputTokens ?? 65536,
            thinking_level: options.thinkingLevel ?? 'medium',
            thinking_summaries: 'auto',
          },
        }),
      });
    } catch (error) {
      if (signal.aborted) throw error;
      throw new EngineError(
        'Could not reach the Gemini API. Check the server’s network connection.',
      );
    }
  }

  return {
    info: { id: 'gemini', label: `${modelLabel(model)} · Google` },

    async *stream({ prompt, history, files, signal }): AsyncGenerator<EngineChunk> {
      const input = buildGeminiInput(options.library, prompt, history, files);

      let res: Response | undefined;
      let used = model;
      for (const [i, candidate] of models.entries()) {
        const attempt = await open(candidate, input, signal);
        if (attempt.ok && attempt.body) {
          res = attempt;
          used = candidate;
          break;
        }
        const detail = await errorMessage(attempt);
        if (!FALL_THROUGH.has(attempt.status) || i === models.length - 1) {
          throw friendlyHttpError(attempt.status, candidate, detail);
        }
      }
      if (!res?.body) throw new EngineError('The Gemini API returned an empty response.');
      if (used !== model) {
        yield {
          reasoning: `${modelLabel(model)} is busy, so ${modelLabel(used)} is answering.\n\n`,
        };
      }

      const stepTypes = new Map<number, string>();
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      let status: string | undefined;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += value;
          let newline: number;
          while ((newline = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            let event: StreamEvent;
            try {
              event = JSON.parse(data) as StreamEvent;
            } catch {
              continue;
            }
            if (event.error) {
              throw new EngineError(event.error.message ?? 'Gemini returned an error.');
            }
            switch (event.event_type) {
              case 'step.start':
                if (event.index !== undefined) stepTypes.set(event.index, event.step?.type ?? '');
                break;
              case 'step.delta': {
                const delta = event.delta;
                if (!delta) break;
                const stepType = stepTypes.get(event.index ?? -1);
                if (stepType === 'thought') {
                  const thought = delta.content?.text ?? (delta.type === 'text' ? delta.text : '');
                  if (thought) yield { reasoning: thought };
                } else if (delta.text && (!delta.type || delta.type === 'text')) {
                  yield delta.text;
                }
                break;
              }
              case 'interaction.completed':
                status = event.interaction?.status;
                break;
            }
          }
        }
      } catch (error) {
        if (signal.aborted || error instanceof EngineError) throw error;
        throw new EngineError('The connection to the Gemini API dropped. Please try again.');
      } finally {
        reader.releaseLock();
      }

      if (status === 'incomplete') {
        yield '\n\n_The response hit the length limit, so some files may be incomplete. Ask me to continue._';
      } else if (status === 'failed' || status === 'cancelled') {
        throw new EngineError(`Gemini stopped before finishing (${status}). Please try again.`);
      }
    },
  };
}
