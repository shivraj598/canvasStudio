/**
 * Prompt files live in `apps/api/prompts/` so they can be edited without touching code:
 *
 *   prompts/website-builder.md          the system prompt shared by every AI engine
 *   prompts/design/<name>/README.md     design notes, with `keywords:` front matter
 *   prompts/design/<name>/*.jpg|png     reference screenshots sent to vision models
 *
 * Add a folder under `design/` to teach the builder a new look; it is matched by keywords.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { TAILWIND_CDN } from '@canvas/shared';

export interface ReferenceImage {
  file: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  base64: string;
}

export interface DesignReference {
  id: string;
  name: string;
  keywords: string[];
  notes: string;
  images: ReferenceImage[];
}

export interface PromptLibrary {
  system: string;
  designs: DesignReference[];
}

const MEDIA_TYPES: Record<string, ReferenceImage['mediaType']> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/** Works from source (tsx), the built server and tests, whatever the working directory. */
export function findPromptsDir(): string {
  const candidates = [
    process.env.PROMPTS_DIR,
    resolve(process.cwd(), 'prompts'),
    resolve(process.cwd(), 'apps/api/prompts'),
    resolve(new URL('../../prompts', import.meta.url).pathname),
    resolve(new URL('../prompts', import.meta.url).pathname),
  ].filter((p): p is string => Boolean(p));
  const found = candidates.find((p) => existsSync(join(p, 'website-builder.md')));
  if (!found)
    throw new Error(
      `Could not find prompts/website-builder.md (looked in ${candidates.join(', ')})`,
    );
  return found;
}

export function parseFrontMatter(text: string): { data: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return { data: {}, body: text.trim() };
  const data: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const kv = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(line);
    if (kv) data[kv[1]!.toLowerCase()] = kv[2]!.trim();
  }
  return { data, body: text.slice(match[0].length).trim() };
}

function loadDesign(dir: string, id: string): DesignReference | null {
  const readme = join(dir, 'README.md');
  if (!existsSync(readme)) return null;
  const { data, body } = parseFrontMatter(readFileSync(readme, 'utf8'));
  const images = readdirSync(dir)
    .filter((f) => MEDIA_TYPES[extname(f).toLowerCase()])
    .sort()
    .map((file) => ({
      file,
      mediaType: MEDIA_TYPES[extname(file).toLowerCase()]!,
      base64: readFileSync(join(dir, file)).toString('base64'),
    }));
  return {
    id,
    name: data.name ?? id,
    keywords: (data.keywords ?? id)
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean),
    notes: body,
    images,
  };
}

export function loadPromptLibrary(dir = findPromptsDir()): PromptLibrary {
  const system = readFileSync(join(dir, 'website-builder.md'), 'utf8')
    .replaceAll('{{TAILWIND_CDN}}', TAILWIND_CDN)
    .trim();
  const designDir = join(dir, 'design');
  const designs = existsSync(designDir)
    ? readdirSync(designDir)
        .filter((name) => statSync(join(designDir, name)).isDirectory())
        .sort()
        .map((name) => loadDesign(join(designDir, name), name))
        .filter((d): d is DesignReference => d !== null)
    : [];
  return { system, designs };
}

/** The design whose keywords best match the text, if any. */
export function matchDesign(designs: DesignReference[], text: string): DesignReference | undefined {
  const lower = ` ${text.toLowerCase()} `;
  let best: { design: DesignReference; score: number } | undefined;
  for (const design of designs) {
    const score = design.keywords.filter((kw) =>
      new RegExp(`[^a-z]${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?[^a-z]`).test(lower),
    ).length;
    if (score > 0 && (!best || score > best.score)) best = { design, score };
  }
  return best?.design;
}
