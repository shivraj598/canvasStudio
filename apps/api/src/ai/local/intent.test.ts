import { describe, expect, it } from 'vitest';
import {
  applyEdits,
  createConfigFromPrompt,
  detectAccent,
  detectMode,
  extractLocation,
  extractName,
  matchArchetype,
} from './intent.js';

const kinds = (c: { sections: { kind: string }[] }) => c.sections.map((s) => s.kind);

describe('reading a first prompt', () => {
  it.each([
    ['A website for my dental clinic', 'clinic'],
    ['cozy coffee shop with a brunch menu', 'restaurant'],
    ['Boutique hotel by the sea', 'hotel'],
    ['landing page for my AI productivity startup', 'saas'],
    ['portfolio for a wedding photographer', 'portfolio'],
    ['yoga studio', 'fitness'],
    ['something nice', 'business'],
  ])('%s → %s', (prompt, archetype) => {
    expect(matchArchetype(prompt).archetype.id).toBe(archetype);
  });

  it('finds the name and location', () => {
    expect(extractName('A site for a bakery called sweet crumbs in Austin')).toBe('Sweet Crumbs');
    expect(extractName('Landing page for "Flow State" app')).toBe('Flow State');
    expect(extractName('a bakery website')).toBeUndefined();
    expect(extractLocation('A dental clinic in San Francisco, with booking')).toBe('San Francisco');
    expect(extractLocation('in a minimal style')).toBeUndefined();
  });

  it('applies theme words from the prompt', () => {
    const config = createConfigFromPrompt('A dark, purple SaaS landing page with a serif font');
    expect(config.theme).toMatchObject({ mode: 'dark', accent: 'violet', font: 'serif' });
  });

  it('treats "dark blue" as a colour, not a theme', () => {
    expect(detectMode('use dark blue buttons')).toBeUndefined();
    expect(detectAccent('use dark blue buttons')).toBe('blue');
  });

  it('adds and removes sections the prompt asks for', () => {
    const config = createConfigFromPrompt('A restaurant site with pricing and an FAQ, no gallery');
    expect(kinds(config)).toContain('pricing');
    expect(kinds(config)).toContain('faq');
    expect(kinds(config)).not.toContain('gallery');
    expect(kinds(config)[0]).toBe('hero');
    expect(kinds(config).at(-1)).toBe('contact');
  });

  it('fills in names in starter copy', () => {
    const config = createConfigFromPrompt('A SaaS called Relayer');
    expect(JSON.stringify(config)).not.toMatch(/\{name\}|\{location\}/);
    expect(config.sections.find((s) => s.kind === 'hero')?.eyebrow).toBe('Introducing Relayer');
  });
});

describe('applying edits', () => {
  const base = createConfigFromPrompt('A dental clinic called Bright Smile in Austin');

  it('changes the theme', () => {
    const { config, notes } = applyEdits(base, 'Make it dark and use emerald as the accent');
    expect(config.theme.mode).toBe('dark');
    expect(config.theme.accent).toBe('emerald');
    expect(notes).toHaveLength(2);
  });

  it('adds several sections in one message', () => {
    const { config } = applyEdits(base, 'add a pricing section and a newsletter');
    expect(kinds(config)).toEqual(expect.arrayContaining(['pricing', 'newsletter']));
    expect(kinds(config).at(-1)).toBe('contact');
  });

  it('says so when a requested section already exists', () => {
    const { config, notes } = applyEdits(base, 'add testimonials');
    expect(kinds(config).filter((k) => k === 'testimonials')).toHaveLength(1);
    expect(notes[0]).toMatch(/already on the page/);
  });

  it('removes and moves sections', () => {
    const removed = applyEdits(base, 'remove the FAQ').config;
    expect(kinds(removed)).not.toContain('faq');
    const moved = applyEdits(base, 'move the testimonials to the top').config;
    expect(kinds(moved).slice(0, 2)).toEqual(['hero', 'testimonials']);
  });

  it('edits copy without treating its words as commands', () => {
    const { config, notes } = applyEdits(
      base,
      'Change the headline to "Green smiles, dark humour"',
    );
    expect(config.sections[0]?.heading).toBe('Green smiles, dark humour');
    expect(config.theme).toEqual(base.theme);
    expect(notes).toHaveLength(1);
  });

  it('renames the site everywhere', () => {
    const { config } = applyEdits(base, 'Rename it to "Pearl Dental"');
    expect(config.name).toBe('Pearl Dental');
    expect(JSON.stringify(config)).not.toContain('Bright Smile');
  });

  it('updates contact details', () => {
    const { config } = applyEdits(
      base,
      'our email is hi@pearl.dental and phone is +1 512 555 0199',
    );
    expect(config.contact.email).toBe('hi@pearl.dental');
    expect(config.contact.phone).toBe('+1 512 555 0199');
  });

  it('rebuilds when asked for a different kind of site', () => {
    const result = applyEdits(base, 'Actually make a website for a pizza restaurant instead');
    expect(result.rebuild).toBe(true);
    expect(result.config.archetype).toBe('restaurant');
  });

  it('reports nothing for requests it does not understand', () => {
    expect(applyEdits(base, 'hmm, what do you think?').notes).toEqual([]);
  });
});
