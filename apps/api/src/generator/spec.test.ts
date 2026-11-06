import { describe, expect, it } from 'vitest';
import { PALETTE_PRESETS, type QuestionnaireAnswers } from '@canvas/shared';
import { completeAnswers, restaurantAnswers } from '@canvas/shared/testing';
import { buildSiteSpec, firstSentence, link, pageSlug, resolvePalette } from './spec.js';

const now = () => new Date('2026-03-01T10:00:00Z');

const withAnswers = (patch: Partial<QuestionnaireAnswers>): QuestionnaireAnswers => ({
  ...completeAnswers,
  ...patch,
});

describe('helpers', () => {
  it('maps home to index', () => {
    expect(pageSlug('home')).toBe('index');
    expect(pageSlug('menu')).toBe('menu');
  });

  it('builds links', () => {
    expect(link('contact')).toBe('contact');
    expect(link('contact', 'booking')).toBe('contact#booking');
  });

  it('extracts the first sentence', () => {
    expect(firstSentence('We bake bread. Every day!')).toBe('We bake bread.');
    expect(firstSentence('No punctuation here')).toBe('No punctuation here');
    expect(firstSentence('Version 2.0 is out! Try it.')).toBe('Version 2.0 is out!');
  });

  it('resolves preset and custom palettes', () => {
    expect(resolvePalette(completeAnswers.design)).toEqual(
      PALETTE_PRESETS.find((p) => p.id === 'clinic')?.colors,
    );
    const customPalette = {
      primary: '#ff0000',
      secondary: '#00ff00',
      accent: '#0000ff',
      background: '#ffffff',
      text: '#000000',
    };
    expect(
      resolvePalette({ paletteId: 'custom', customPalette, style: 'bold', font: 'technical' }),
    ).toEqual(customPalette);
  });
});

describe('buildSiteSpec', () => {
  const spec = buildSiteSpec(completeAnswers, { now });

  it('captures brand, category, theme and metadata', () => {
    expect(spec).toMatchObject({
      version: 1,
      brand: { name: 'Sunrise Dental', tagline: 'Smiles that last' },
      category: 'doctor',
      theme: {
        style: 'modern',
        font: 'modern-sans',
        fontFamilies: { heading: 'Inter', body: 'Inter' },
      },
      features: ['online-booking'],
      dashboard: { enabled: true, widgets: ['appointments', 'messages'] },
      contact: completeAnswers.contact,
      generatedAt: '2026-03-01T10:00:00.000Z',
    });
    expect(spec.brand).not.toHaveProperty('logoUrl');
  });

  it('creates one page per selected page, in order, with navigation', () => {
    expect(spec.pages.map((p) => p.slug)).toEqual(['index', 'about', 'services', 'contact']);
    expect(spec.navigation).toEqual([
      { label: 'Home', href: 'index' },
      { label: 'About', href: 'about' },
      { label: 'Services', href: 'services' },
      { label: 'Contact', href: 'contact' },
    ]);
  });

  it('gives every section a unique id across the site', () => {
    const ids = spec.pages.flatMap((p) => p.sections.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('builds a hero from the brand with a booking call to action', () => {
    const hero = spec.pages[0]?.sections[0];
    expect(hero).toMatchObject({
      id: 'index-hero',
      kind: 'hero',
      heading: 'Sunrise Dental',
      body: 'Smiles that last',
      cta: { label: 'Book an appointment', href: 'contact#booking' },
    });
  });

  it('falls back to the first sentence of the description when there is no tagline', () => {
    const noTagline = buildSiteSpec(withAnswers({ brand: { brandName: 'Sunrise Dental' } }), {
      now,
    });
    expect(noTagline.pages[0]?.sections[0]?.body).toBe(
      'A family dental clinic offering check-ups, whitening and braces since 2009.',
    );
  });

  it('adds a booking section to the contact page when booking is enabled', () => {
    const contact = spec.pages.find((p) => p.id === 'contact');
    expect(contact?.sections.map((s) => s.kind)).toEqual(['contact', 'booking']);
  });

  it('uses about answers for "why choose us" cards', () => {
    const about = spec.pages.find((p) => p.id === 'about');
    expect(about?.sections[1]).toMatchObject({
      kind: 'cards',
      items: [{ title: 'Who we serve', description: 'Families in Kathmandu' }],
    });
  });

  it('builds restaurant-specific pages', () => {
    const restaurant = buildSiteSpec(restaurantAnswers, { now });
    expect(restaurant.pages.map((p) => p.id)).toEqual(['home', 'menu', 'gallery', 'contact']);
    expect(restaurant.pages[1]?.sections[0]?.kind).toBe('menu');
    expect(restaurant.pages[2]?.sections[0]?.items).toHaveLength(6);
    expect(restaurant.pages[0]?.sections[0]?.cta).toEqual({
      label: 'Order online',
      href: 'contact#booking',
    });
    expect(restaurant.dashboard).toEqual({ enabled: false, widgets: [] });
  });

  it('links to the footer when there is no contact page', () => {
    const noContact = buildSiteSpec(
      withAnswers({ pages: { pages: ['home', 'about'], features: [] } }),
      { now },
    );
    expect(noContact.pages[0]?.sections[0]?.cta).toEqual({
      label: 'Get in touch',
      href: 'index#footer',
    });
  });

  it('produces sections for every page type', () => {
    const everything = buildSiteSpec(
      withAnswers({
        pages: {
          pages: [
            'home',
            'about',
            'services',
            'menu',
            'rooms',
            'courses',
            'team',
            'gallery',
            'testimonials',
            'pricing',
            'faq',
            'blog',
            'contact',
          ],
          features: [],
        },
      }),
      { now },
    );
    for (const page of everything.pages) {
      expect(page.sections.length, page.id).toBeGreaterThan(0);
      for (const section of page.sections) expect(section.heading, section.id).toBeTruthy();
    }
  });

  it('is deterministic for the same answers', () => {
    expect(buildSiteSpec(completeAnswers, { now })).toEqual(spec);
  });
});
