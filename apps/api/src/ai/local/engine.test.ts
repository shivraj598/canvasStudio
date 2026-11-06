import { createArtifactParser, type ProjectFile } from '@canvas/shared';
import { describe, expect, it } from 'vitest';
import { createConfigFromPrompt } from './intent.js';
import { CONFIG_PATH, createLocalEngine, readConfig, renderFiles } from './engine.js';
import { renderSite } from './render.js';

async function collect(prompt: string, files: ProjectFile[] = []) {
  const engine = createLocalEngine({ delayMs: 0 });
  let raw = '';
  for await (const chunk of engine.stream({
    prompt,
    files,
    history: [],
    signal: new AbortController().signal,
  })) {
    raw += chunk;
  }
  let text = '';
  const out: Record<string, string> = {};
  const parser = createArtifactParser({
    onText: (d) => (text += d),
    onFileEnd: (p, c) => (out[p] = c),
  });
  parser.write(raw);
  parser.end();
  return { text, files: out };
}

describe('local engine', () => {
  it('builds a complete site from a prompt', async () => {
    const { text, files } = await collect('A bakery called Crumb & Co in Portland');
    expect(text).toContain("I'll build **Crumb & Co**");
    expect(Object.keys(files).sort()).toEqual(['app.js', 'index.html', CONFIG_PATH, 'styles.css']);
    expect(files['index.html']).toContain('<title>Crumb &amp; Co</title>');
    expect(files['index.html']).toContain('href="styles.css"');
    expect(
      readConfig(Object.entries(files).map(([path, content]) => ({ path, content }))),
    ).not.toBeNull();
  });

  it('only rewrites files that changed on an edit', async () => {
    const files = renderFiles(createConfigFromPrompt('A dental clinic'));
    const result = await collect('add a pricing section', files);
    expect(Object.keys(result.files).sort()).toEqual(['index.html', CONFIG_PATH]);
    expect(result.files['index.html']).toContain('id="pricing"');
    expect(result.text).toContain('Added a pricing section');
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

describe('renderSite', () => {
  it('escapes everything that comes from the config', () => {
    const config = createConfigFromPrompt('A clinic');
    config.name = '<script>alert(1)</script>';
    config.sections[0]!.heading = '"><img src=x onerror=alert(1)>';
    const html = renderSite(config);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });

  it('ignores a malformed config file', () => {
    expect(readConfig([{ path: CONFIG_PATH, content: '{nope' }])).toBeNull();
    expect(readConfig([{ path: CONFIG_PATH, content: '{"version":2}' }])).toBeNull();
  });
});
