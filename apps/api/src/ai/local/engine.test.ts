import { createArtifactParser, type ProjectFile } from '@canvas/shared';
import { describe, expect, it } from 'vitest';
import { CONFIG_PATH, createLocalEngine, readConfig, renderFiles } from './engine.js';
import { createConfigFromPrompt } from './intent.js';
import { renderContent, renderIndexHtml, renderThemeCss } from './project.js';

async function collect(prompt: string, files: ProjectFile[] = []) {
  const engine = createLocalEngine({ delayMs: 0 });
  let raw = '';
  for await (const chunk of engine.stream({
    prompt,
    files,
    history: [],
    signal: new AbortController().signal,
  })) {
    if (typeof chunk === 'string') raw += chunk;
  }
  let text = '';
  const out: Record<string, string> = {};
  const deleted: string[] = [];
  const parser = createArtifactParser({
    onText: (d) => (text += d),
    onFileEnd: (p, c) => (out[p] = c),
    onDelete: (p) => deleted.push(p),
  });
  parser.write(raw);
  parser.end();
  return { text, files: out, deleted };
}

describe('local engine', () => {
  it('builds a real React + TypeScript + Tailwind project from a prompt', async () => {
    const { text, files } = await collect('A bakery called Crumb & Co in Portland');
    expect(text).toContain("I'll build **Crumb & Co**");
    expect(text).toContain('React + TypeScript');
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        'package.json',
        'index.html',
        'vite.config.ts',
        'tsconfig.json',
        'src/main.tsx',
        'src/App.tsx',
        'src/types.ts',
        'src/index.css',
        'src/content.ts',
        'src/components/Hero.tsx',
        'src/components/ui.tsx',
        CONFIG_PATH,
      ]),
    );
    const pkg = JSON.parse(files['package.json']!);
    expect(pkg.name).toBe('crumb-co');
    expect(Object.keys(pkg.dependencies)).toEqual(['react', 'react-dom', 'lucide-react']);
    expect(pkg.devDependencies).toHaveProperty('typescript');
    expect(files['index.html']).toContain('<title>Crumb &amp; Co</title>');
    expect(files['index.html']).toContain('src="/src/main.tsx"');
    expect(files['src/content.ts']).toContain('"name": "Crumb & Co"');
    expect(
      readConfig(Object.entries(files).map(([path, content]) => ({ path, content }))),
    ).not.toBeNull();
  });

  it('only rewrites content and theme files on an edit', async () => {
    const files = renderFiles(createConfigFromPrompt('A dental clinic'));
    const added = await collect('add a pricing section', files);
    expect(Object.keys(added.files).sort()).toEqual([CONFIG_PATH, 'src/content.ts']);
    expect(added.files['src/content.ts']).toContain('"kind": "pricing"');
    expect(added.text).toContain('Added a pricing section');

    const dark = await collect('make it dark', files);
    expect(Object.keys(dark.files).sort()).toEqual([
      CONFIG_PATH,
      'src/content.ts',
      'src/index.css',
    ]);
    expect(dark.files['src/index.css']).toContain('--color-page: #09090b');
  });

  it('upgrades a static site from the earlier engine and removes its leftovers', async () => {
    const config = createConfigFromPrompt('A dental clinic');
    const legacy: ProjectFile[] = [
      { path: 'index.html', content: '<h1>old</h1>' },
      { path: 'styles.css', content: '' },
      { path: 'app.js', content: '' },
      { path: CONFIG_PATH, content: JSON.stringify(config) },
    ];
    const result = await collect('make it dark', legacy);
    expect(result.files['src/App.tsx']).toBeDefined();
    expect(result.deleted.sort()).toEqual(['app.js', 'styles.css']);
  });

  it('explains what it can do instead of guessing', async () => {
    const files = renderFiles(createConfigFromPrompt('A dental clinic'));
    const result = await collect('what do you think?', files);
    expect(result.files).toEqual({});
    expect(result.text).toContain("Here's what I can do");
  });

  it('stops when aborted', async () => {
    const engine = createLocalEngine({ delayMs: 5 });
    const controller = new AbortController();
    const iterator = engine.stream({
      prompt: 'a gym',
      files: [],
      history: [],
      signal: controller.signal,
    });
    controller.abort();
    await expect(async () => {
      for await (const _ of iterator) void _;
    }).rejects.toBeDefined();
  });
});

describe('project rendering', () => {
  it('keeps user text safe in HTML and TypeScript', () => {
    const config = createConfigFromPrompt('A clinic');
    config.name = '<script>alert(1)</script>';
    config.sections[0]!.heading = '"; process.exit(1); //`${x}';
    expect(renderIndexHtml(config)).not.toContain('<script>alert(1)</script>');
    const content = renderContent(config);
    // JSON string literals: quotes escaped, template syntax inert.
    expect(content).toContain('"heading": "\\"; process.exit(1); //`${x}"');
  });

  it('derives theme tokens from the config', () => {
    const config = createConfigFromPrompt('A dark purple SaaS with a serif font');
    const css = renderThemeCss(config);
    expect(css).toContain("@import 'tailwindcss';");
    expect(css).toContain('--color-brand: #7c3aed');
    expect(css).toContain("--font-heading: 'Fraunces'");
    expect(css).toContain('--color-page: #09090b');
  });

  it('ignores a malformed config file', () => {
    expect(readConfig([{ path: CONFIG_PATH, content: '{nope' }])).toBeNull();
    expect(readConfig([{ path: CONFIG_PATH, content: '{"version":2}' }])).toBeNull();
  });
});
