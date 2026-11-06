/**
 * "Canvas Local" — an offline build engine. It understands a useful subset of requests
 * (new sites for common businesses, theme/section/copy edits) and streams its work in the same
 * artifact protocol as the Claude engine, so the rest of the system can't tell them apart.
 */
import type { ProjectFile } from '@canvas/shared';
import type { BuildEngine } from '../types.js';
import { getArchetype } from './archetypes.js';
import { applyEdits, createConfigFromPrompt } from './intent.js';
import { FONTS, SECTION_LABELS, type SiteConfig } from './model.js';
import { APP_JS, renderSite, renderStyles } from './render.js';

export const CONFIG_PATH = 'site.config.json';

export interface LocalEngineOptions {
  /** Pause between streamed chunks, so the UI can show work in progress. 0 in tests. */
  delayMs?: number;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return signal.aborted ? Promise.reject(signal.reason) : Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function readConfig(files: ProjectFile[]): SiteConfig | null {
  const file = files.find((f) => f.path === CONFIG_PATH);
  if (!file) return null;
  try {
    const parsed = JSON.parse(file.content) as SiteConfig;
    if (parsed?.version !== 1 || !Array.isArray(parsed.sections) || !parsed.theme) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function renderFiles(config: SiteConfig): ProjectFile[] {
  return [
    { path: 'index.html', content: renderSite(config) },
    { path: 'styles.css', content: renderStyles(config) },
    { path: 'app.js', content: APP_JS },
    { path: CONFIG_PATH, content: `${JSON.stringify(config, null, 2)}\n` },
  ];
}

const RADIUS_WORDS = {
  sharp: 'crisp square corners',
  soft: 'soft rounded corners',
  round: 'pill-shaped buttons and generous rounding',
};

function planText(config: SiteConfig): string {
  const archetype = getArchetype(config.archetype);
  const sections = config.sections.map((s) => SECTION_LABELS[s.kind]).join(' → ');
  return [
    `I'll build **${config.name}** — a ${archetype.label} website${config.location ? ` for ${config.location}` : ''}.`,
    '',
    '**Design direction**',
    `- ${config.theme.mode === 'dark' ? 'Dark, high-contrast' : 'Light, airy'} theme with ${config.theme.accent === 'zinc' ? 'monochrome' : config.theme.accent} accents`,
    `- ${FONTS[config.theme.font].label.charAt(0).toUpperCase()}${FONTS[config.theme.font].label.slice(1)}`,
    `- ${RADIUS_WORDS[config.theme.radius].charAt(0).toUpperCase()}${RADIUS_WORDS[config.theme.radius].slice(1)}, subtle scroll animations`,
    '',
    `**Sections:** ${sections}`,
    '',
  ].join('\n');
}

const NEXT_IDEAS = [
  '“Add a pricing section”',
  '“Switch to a dark theme”',
  '“Change the headline to "…"”',
  '“Make the accent colour emerald”',
  '“Move testimonials to the top”',
];

const HELP_TEXT = [
  "I couldn't turn that into a change I know how to make with the offline builder. Here's what I can do right now:",
  '',
  '- **Theme** — “make it emerald”, “switch to dark mode”, “use a serif font”, “sharper corners”',
  '- **Sections** — “add a pricing section”, “remove the FAQ”, “move testimonials to the top”',
  '- **Copy** — “change the headline to "…"”, “rename it to "…"”, “change the button to "…"”',
  '- **Contact** — “our email is hello@example.com”, “phone is +1 555 0100”',
  '- **Start over** — “a website for a yoga studio in Lisbon”',
  '',
  'For free-form changes, connect the Claude engine by setting `ANTHROPIC_API_KEY` on the API server.',
].join('\n');

export function createLocalEngine({ delayMs = 10 }: LocalEngineOptions = {}): BuildEngine {
  async function* words(text: string, signal: AbortSignal) {
    const parts = text.match(/\S+\s*|\s+/g) ?? [];
    for (let i = 0; i < parts.length; i += 3) {
      await sleep(delayMs * 2, signal);
      yield parts.slice(i, i + 3).join('');
    }
  }

  async function* fileAction(file: ProjectFile, signal: AbortSignal) {
    yield `<canvasAction type="file" path="${file.path}">\n`;
    const size = 180;
    for (let i = 0; i < file.content.length; i += size) {
      await sleep(delayMs / 2, signal);
      yield file.content.slice(i, i + size);
    }
    yield `</canvasAction>\n`;
  }

  return {
    info: { id: 'local', label: 'Canvas Local' },

    async *stream({ prompt, files, signal }) {
      await sleep(delayMs * 40, signal); // "thinking"

      const current = readConfig(files);
      let config: SiteConfig;
      let intro: string;
      let outro: string;

      if (!current) {
        config = createConfigFromPrompt(prompt);
        intro = planText(config);
        outro = `\n✨ **${config.name}** is live in the preview. A few ideas to try next:\n\n${NEXT_IDEAS.slice(
          0,
          3,
        )
          .map((x) => `- ${x}`)
          .join('\n')}`;
      } else {
        const result = applyEdits(current, prompt);
        if (result.notes.length === 0) {
          yield* words(HELP_TEXT, signal);
          return;
        }
        config = result.config;
        if (result.rebuild) {
          intro = `Starting fresh.\n\n${planText(config)}`;
          outro = `\n✨ The new site is ready in the preview.`;
        } else {
          intro = 'On it — updating your site.\n\n';
          outro = `\nDone! Here's what changed:\n\n${result.notes.map((n) => `- ${n}`).join('\n')}`;
        }
      }

      yield* words(intro, signal);

      const existing = new Map(files.map((f) => [f.path, f.content]));
      const changed = renderFiles(config).filter((f) => existing.get(f.path) !== f.content);
      yield `<canvasArtifact title="${config.name.replace(/"/g, '')}">\n`;
      for (const file of changed) yield* fileAction(file, signal);
      yield `</canvasArtifact>\n`;

      yield* words(outro, signal);
    },
  };
}
