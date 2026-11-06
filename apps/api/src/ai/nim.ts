/**
 * NVIDIA NIM engine: any chat model on integrate.api.nvidia.com (OpenAI-compatible API),
 * streamed over server-sent events. Vision models also receive the matching design
 * reference screenshots.
 */
import type { ChatMessage, ProjectFile } from '@canvas/shared';
import { designContext, historyTurns, requestText } from './conversation.js';
import type { PromptLibrary } from './prompts.js';
import { EngineError, type BuildEngine, type EngineChunk } from './types.js';

export const DEFAULT_NIM_MODEL = 'minimaxai/minimax-m3.1-flash';
export const DEFAULT_NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';

export interface NimEngineOptions {
  apiKey: string;
  library: PromptLibrary;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  /** Disable for text-only models. */
  vision?: boolean;
  fetch?: typeof fetch;
}

type ContentPart =
  { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export interface NimMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

/** Sampling defaults recommended for each model on build.nvidia.com. */
const MODEL_DEFAULTS: Record<string, { temperature: number; topP: number }> = {
  'minimaxai/minimax-m3.1-flash': { temperature: 1, topP: 0.95 },
  'stepfun-ai/step-5-preview': { temperature: 0.5, topP: 1 },
};

/** "minimaxai/minimax-m3.1-flash" → "Minimax M3.1 Flash". */
export function modelLabel(model: string): string {
  const name = model.split('/').pop() ?? model;
  return name
    .split('-')
    .map((w) => (/^\d/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export function buildNimMessages(
  library: PromptLibrary,
  prompt: string,
  history: ChatMessage[],
  files: ProjectFile[],
  vision = true,
): NimMessage[] {
  const context = designContext(library, prompt, history, files);
  const withImages = Boolean(vision && context?.withImages);
  const text = requestText(prompt, files, context && { ...context, withImages });
  const last: NimMessage = withImages
    ? {
        role: 'user',
        content: [
          { type: 'text', text },
          ...context!.design.images.map((img): ContentPart => ({
            type: 'image_url',
            image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
          })),
        ],
      }
    : { role: 'user', content: text };
  return [{ role: 'system', content: library.system }, ...historyTurns(history), last];
}

async function friendlyHttpError(res: Response, model: string): Promise<EngineError> {
  const detail = (await res.text().catch(() => '')).slice(0, 300);
  switch (res.status) {
    case 401:
    case 403:
      return new EngineError(
        'The NVIDIA API key was rejected. Check NVIDIA_API_KEY on the server.',
      );
    case 404:
      return new EngineError(`NVIDIA doesn't recognise the model “${model}”. Check NVIDIA_MODEL.`);
    case 429:
      return new EngineError('The NVIDIA API is rate-limiting requests. Try again in a moment.');
    default:
      return new EngineError(
        `The NVIDIA API returned an error (${res.status})${detail ? `: ${detail}` : ''}`,
      );
  }
}

interface StreamChunk {
  choices?: {
    delta?: { content?: string | null; reasoning_content?: string | null };
    finish_reason?: string | null;
  }[];
  error?: { message?: string };
}

export function createNimEngine(options: NimEngineOptions): BuildEngine {
  const model = options.model ?? DEFAULT_NIM_MODEL;
  const baseUrl = (options.baseUrl ?? DEFAULT_NIM_BASE_URL).replace(/\/$/, '');
  const defaults = MODEL_DEFAULTS[model] ?? { temperature: 0.6, topP: 0.95 };
  const fetchImpl = options.fetch ?? fetch;

  return {
    info: { id: 'nim', label: `${modelLabel(model)} · NVIDIA` },

    async *stream({ prompt, history, files, signal }): AsyncGenerator<EngineChunk> {
      let res: Response;
      try {
        res = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: 'POST',
          signal,
          headers: {
            authorization: `Bearer ${options.apiKey}`,
            'content-type': 'application/json',
            accept: 'text/event-stream',
          },
          body: JSON.stringify({
            model,
            messages: buildNimMessages(
              options.library,
              prompt,
              history,
              files,
              options.vision ?? true,
            ),
            max_tokens: options.maxTokens ?? 16384,
            temperature: options.temperature ?? defaults.temperature,
            top_p: options.topP ?? defaults.topP,
            stream: true,
          }),
        });
      } catch (error) {
        if (signal.aborted) throw error;
        throw new EngineError(
          'Could not reach the NVIDIA API. Check the server’s network connection.',
        );
      }
      if (!res.ok || !res.body) throw await friendlyHttpError(res, model);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      let finish: string | null | undefined;
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
            let chunk: StreamChunk;
            try {
              chunk = JSON.parse(data) as StreamChunk;
            } catch {
              continue;
            }
            if (chunk.error)
              throw new EngineError(chunk.error.message ?? 'The model returned an error.');
            const choice = chunk.choices?.[0];
            if (choice?.delta?.reasoning_content)
              yield { reasoning: choice.delta.reasoning_content };
            if (choice?.delta?.content) yield choice.delta.content;
            if (choice?.finish_reason) finish = choice.finish_reason;
          }
        }
      } catch (error) {
        if (signal.aborted || error instanceof EngineError) throw error;
        throw new EngineError('The connection to the NVIDIA API dropped. Please try again.');
      } finally {
        reader.releaseLock();
      }

      if (finish === 'length') {
        yield '\n\n_The response hit the length limit, so some files may be incomplete. Ask me to continue._';
      }
    },
  };
}
