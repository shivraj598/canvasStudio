import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { designContext, requestText } from './conversation.js';
import { loadPromptLibrary, matchDesign, parseFrontMatter } from './prompts.js';

describe('prompt library', () => {
  const library = loadPromptLibrary();

  it('loads the system prompt file for React + TypeScript + Tailwind projects', () => {
    expect(library.system).toContain('You are Canvas');
    expect(library.system).toContain('React 19 + TypeScript');
    expect(library.system).toContain('@tailwindcss/vite');
    expect(library.system).not.toMatch(/\{\{\w+\}\}/);
  });

  it('loads the clinic design reference with its screenshots', () => {
    const clinic = library.designs.find((d) => d.id === 'clinic')!;
    expect(clinic.name).toBe('Clinic & healthcare');
    expect(clinic.keywords).toContain('dentist');
    expect(clinic.notes).toContain('#175cdd');
    expect(clinic.images.map((i) => i.file)).toEqual([
      'reference-full-page.jpg',
      'reference-hero.jpg',
    ]);
    expect(clinic.images[0]!.mediaType).toBe('image/jpeg');
  });

  it('matches designs by keyword', () => {
    expect(matchDesign(library.designs, 'A site for my dental practice')?.id).toBe('clinic');
    expect(matchDesign(library.designs, 'A landing page for my bakery')).toBeUndefined();
  });

  it('picks up new design folders without code changes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'prompts-'));
    writeFileSync(join(dir, 'website-builder.md'), 'System {{TAILWIND_CDN}}');
    mkdirSync(join(dir, 'design', 'bakery'), { recursive: true });
    writeFileSync(
      join(dir, 'design', 'bakery', 'README.md'),
      '---\nname: Bakery\nkeywords: bakery, cake\n---\nWarm and crusty.',
    );
    const custom = loadPromptLibrary(dir);
    expect(matchDesign(custom.designs, 'my cake shop')?.notes).toBe('Warm and crusty.');
  });

  it('parses front matter', () => {
    expect(parseFrontMatter('---\nname: X\nkeywords: a, b\n---\nBody')).toEqual({
      data: { name: 'X', keywords: 'a, b' },
      body: 'Body',
    });
    expect(parseFrontMatter('No front matter')).toEqual({ data: {}, body: 'No front matter' });
  });
});

describe('design context', () => {
  const library = loadPromptLibrary();
  const at = '2026-01-01T00:00:00.000Z';

  it('attaches the reference on a fresh build only, unless the design is asked about', () => {
    expect(designContext(library, 'A dental clinic site', [], [])?.withImages).toBe(true);
    const files = [{ path: 'index.html', content: '<h1>Hi</h1>' }];
    const history = [{ id: '1', role: 'user' as const, content: 'A dental clinic', createdAt: at }];
    expect(designContext(library, 'Add a FAQ', history, files)).toBeUndefined();
    expect(designContext(library, 'Redesign the hero', history, files)?.design.id).toBe('clinic');
  });

  it('puts files, design notes and the request in the final message', () => {
    const context = designContext(library, 'A dental clinic site', [], []);
    const text = requestText('A dental clinic site', [], context);
    expect(text).toMatch(/brand new site[\s\S]*<design_reference[\s\S]*<request>/);
  });
});
