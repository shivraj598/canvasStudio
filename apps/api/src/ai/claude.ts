/**
 * The Claude engine: streams a real model's output in the artifact protocol. The current files
 * go into every request, so Claude always edits the latest version of the site.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage, ProjectFile } from '@canvas/shared';
import { TAILWIND_CDN } from './local/render.js';
import { EngineError, type BuildEngine } from './types.js';

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ClaudeEngineOptions {
  apiKey?: string;
  model?: string;
  effort?: Effort;
  /** For tests: inject a client. */
  client?: Anthropic;
}

export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5-5';
const HISTORY_LIMIT = 12;

export const SYSTEM_PROMPT = `You are Canvas, an expert web designer and front-end engineer working inside Canvas Studio, an AI website builder. People describe the website they want in plain language and you build it, then refine it with them through conversation.

<environment>
- A project is a small static website shown in a sandboxed preview iframe. The entry page is index.html.
- Local stylesheets and scripts referenced with relative paths (<link rel="stylesheet" href="styles.css">, <script src="app.js"></script>) are inlined into the preview automatically.
- There is no build step, package manager or server. Use Tailwind CSS through <script src="${TAILWIND_CDN}"></script>, Google Fonts, and plain JavaScript.
- Build single-page sites: navigation uses in-page anchors (#pricing). Links to other .html files do not work in the preview.
- For photos use https://picsum.photos/seed/<descriptive-seed>/<width>/<height>, with a gradient background behind each image so the layout still looks intentional if an image fails to load.
</environment>

<output_format>
1. Start with a short, friendly note (one to four sentences, or a short bullet list) saying what you are about to build or change.
2. Then write exactly one artifact containing every file you create or change:
<canvasArtifact title="Name of the site">
<canvasAction type="file" path="index.html">
...the complete file...
</canvasAction>
</canvasArtifact>
3. Finish with a brief summary of what changed and two or three concrete ideas for what to do next.

Rules:
- Always write complete file contents. Never use placeholders such as "rest unchanged", ellipses standing in for code, or diffs.
- Include only files you create or change. Delete a file with <canvasAction type="delete" path="old.js"></canvasAction>.
- Never wrap the artifact or any file contents in Markdown code fences.
- If the person only asks a question, answer it without an artifact.
- A site.config.json file comes from the offline builder. If you change index.html in a project that has one, delete site.config.json so the offline builder never overwrites your work.
</output_format>

<design_bar>
Build something a top design studio would be proud to ship: a clear typographic hierarchy, generous whitespace, a cohesive palette, considered details (hover states, subtle motion, depth), semantic and accessible HTML with good contrast, and a layout that works from 375px phones to wide desktops. Write specific, believable copy for this business — never lorem ipsum. When asked for a change, make that change well and keep everything else as it was.
</design_bar>`;

function renderFiles(files: ProjectFile[]): string {
  if (files.length === 0) return 'The project is empty — this is a brand new site.';
  return `<current_files>\n${files
    .map((f) => `<file path="${f.path}">\n${f.content}\n</file>`)
    .join('\n')}\n</current_files>`;
}

/** Earlier turns as plain text; file contents live only in the latest message. */
export function toMessages(
  history: ChatMessage[],
  prompt: string,
  files: ProjectFile[],
): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = history
    .filter((m) => m.content.trim() || m.changes?.length)
    .slice(-HISTORY_LIMIT)
    .map((m) => ({
      role: m.role,
      content:
        m.role === 'assistant' && m.changes?.length
          ? `${m.content.trim()}\n\n(Files written: ${m.changes.map((c) => c.path).join(', ')})`
          : m.content,
    }));
  while (messages[0]?.role === 'assistant') messages.shift();
  messages.push({
    role: 'user',
    content: `${renderFiles(files)}\n\n<request>\n${prompt}\n</request>`,
  });
  return messages;
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

export function createClaudeEngine(options: ClaudeEngineOptions = {}): BuildEngine {
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
            system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
            messages: toMessages(history, prompt, files),
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
