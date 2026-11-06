import { describe, expect, it } from 'vitest';
import type { QuestionnaireAnswers } from '@canvas/shared';
import { completeAnswers, restaurantAnswers } from '@canvas/shared/testing';
import {
  escapeHtml,
  renderPage,
  renderSinglePage,
  renderSiteFiles,
  renderStyles,
  resolveHref,
} from './render.js';
import { buildSiteSpec } from './spec.js';

const now = () => new Date('2026-03-01T10:00:00Z');
const spec = buildSiteSpec(completeAnswers, { now });

describe('escapeHtml', () => {
  it('escapes the five HTML special characters', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });
});

describe('resolveHref', () => {
  it('links to files in files mode', () => {
    expect(resolveHref('index', 'files')).toBe('index.html');
    expect(resolveHref('contact#booking', 'files')).toBe('contact.html#contact-booking');
  });

  it('links to anchors in single-page mode', () => {
    expect(resolveHref('about', 'single')).toBe('#page-about');
    expect(resolveHref('contact#booking', 'single')).toBe('#contact-booking');
  });
});

describe('renderStyles', () => {
  it('exposes the palette as CSS variables with readable foregrounds', () => {
    const css = renderStyles(spec.theme);
    expect(css).toContain(`--color-primary: ${spec.theme.palette.primary}`);
    expect(css).toContain('--color-on-primary: #ffffff');
    expect(css).toContain("--font-heading: 'Inter'");
  });

  it('varies tokens by design style', () => {
    const playful = renderStyles({ ...spec.theme, style: 'playful' });
    const minimal = renderStyles({ ...spec.theme, style: 'minimal' });
    expect(playful).toContain('--radius: 24px');
    expect(minimal).toContain('--radius: 0');
  });
});

describe('renderSiteFiles', () => {
  const files = renderSiteFiles(spec);

  it('renders one HTML document per page', () => {
    expect(Object.keys(files)).toEqual(['index.html', 'about.html', 'services.html', 'contact.html']);
    for (const doc of Object.values(files)) {
      expect(doc.trimStart().startsWith('<!doctype html>')).toBe(true);
      expect(doc).toContain('<meta name="viewport"');
    }
  });

  it('titles pages and marks the current nav item', () => {
    expect(files['index.html']).toContain('<title>Sunrise Dental</title>');
    expect(files['about.html']).toContain('<title>About — Sunrise Dental</title>');
    expect(files['about.html']).toMatch(/href="about\.html"\s+aria-current="page"/);
    expect(files['index.html']).not.toMatch(/href="about\.html"\s+aria-current/);
  });

  it('renders the hero, call to action and booking form', () => {
    expect(files['index.html']).toContain('<h1>Sunrise Dental</h1>');
    expect(files['index.html']).toContain('href="contact.html#contact-booking"');
    expect(files['contact.html']).toContain('id="contact-booking"');
    expect(files['contact.html']).toContain('aria-label="Booking form"');
  });

  it('renders contact details in the footer', () => {
    expect(files['index.html']).toContain('href="mailto:hello@sunrise.dental"');
    expect(files['index.html']).toContain('href="tel:+97715550100"');
  });

  it('loads the chosen fonts', () => {
    expect(files['index.html']).toContain('fonts.googleapis.com/css2?family=Inter');
  });
});

describe('features', () => {
  it('renders the restaurant menu, gallery, map link and no booking form without booking', () => {
    const doc = renderSinglePage(buildSiteSpec(restaurantAnswers, { now }));
    expect(doc).toContain('class="menu-item"');
    expect(doc.match(/class="gallery-item"/g)).toHaveLength(6);
    expect(doc).toContain('https://www.google.com/maps/search/?api=1&amp;query=Jhamsikhel%20Road');
    expect(doc).toContain('aria-label="Booking form"'); // online ordering
    expect(doc).not.toContain('aria-label="Contact form"');
    expect(doc).toContain('family=Playfair+Display');
  });

  it('renders contact form, newsletter and social links when chosen', () => {
    const answers: QuestionnaireAnswers = {
      ...completeAnswers,
      pages: { pages: ['home', 'contact'], features: ['contact-form', 'newsletter'] },
      contact: { instagram: 'https://instagram.com/sunrise' },
    };
    const doc = renderSinglePage(buildSiteSpec(answers, { now }));
    expect(doc).toContain('aria-label="Contact form"');
    expect(doc).toContain('aria-label="Newsletter"');
    expect(doc).toContain('href="https://instagram.com/sunrise"');
    expect(doc).not.toContain('aria-label="Booking form"');
  });
});

describe('renderSinglePage', () => {
  const doc = renderSinglePage(spec);

  it('stacks every page with anchor navigation', () => {
    for (const slug of ['index', 'about', 'services', 'contact']) {
      expect(doc).toContain(`id="page-${slug}"`);
      expect(doc).toContain(`href="#page-${slug}"`);
    }
    expect(doc).toContain('href="#contact-booking"');
    expect(doc).not.toContain('.html');
  });

  it('renders exactly one header and footer', () => {
    expect(doc.match(/<header/g)).toHaveLength(1);
    expect(doc.match(/<footer/g)).toHaveLength(1);
  });
});

describe('security', () => {
  const evil = '<script>alert("x")</script>';
  const answers: QuestionnaireAnswers = {
    ...completeAnswers,
    brand: { brandName: `Evil ${evil}`, tagline: `"><img src=x onerror=alert(1)>` },
    about: { description: `We are ${evil} and more text here to pass validation.` },
    contact: { address: evil, phone: evil },
  };
  const evilSpec = buildSiteSpec(answers, { now });

  it('escapes user content everywhere', () => {
    const outputs = [renderSinglePage(evilSpec), ...Object.values(renderSiteFiles(evilSpec))];
    for (const doc of outputs) {
      expect(doc).not.toContain('<script>');
      expect(doc).not.toContain('<img src=x');
      expect(doc).toContain('&lt;script&gt;');
    }
  });

  it('does not double-escape', () => {
    const doc = renderPage(evilSpec, evilSpec.pages[0]!);
    expect(doc).not.toContain('&amp;lt;');
  });
});
