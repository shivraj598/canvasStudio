import {
  FONT_PAIRINGS,
  PAGE_LABELS,
  getPalettePreset,
  type ColorPalette,
  type QuestionnaireAnswers,
  type SitePage,
  type SitePageId,
  type SiteSection,
  type SiteSpec,
} from '@canvas/shared';
import { CATEGORY_CONTENT } from './content.js';

export function pageSlug(id: SitePageId): string {
  return id === 'home' ? 'index' : id;
}

export function resolvePalette(design: QuestionnaireAnswers['design']): ColorPalette {
  if (design.paletteId === 'custom' && design.customPalette) return design.customPalette;
  const preset = getPalettePreset(design.paletteId);
  if (!preset) throw new Error(`Unknown palette: ${design.paletteId}`);
  return { ...preset.colors };
}

/**
 * Links inside a spec are `<page slug>` or `<page slug>#<section kind>`; renderers turn them into
 * file links (`contact.html#contact-booking`) or in-page anchors (`#contact-booking`).
 */
export function link(slug: string, kind?: string): string {
  return kind ? `${slug}#${kind}` : slug;
}

/** First sentence of a description, used where a short summary reads better. */
export function firstSentence(text: string): string {
  const match = /^.*?[.!?](?=\s|$)/.exec(text.trim());
  return (match?.[0] ?? text).trim();
}

function primaryCta(answers: QuestionnaireAnswers): { label: string; href: string } {
  const { features } = answers.pages;
  const hasContactPage = answers.pages.pages.includes('contact');
  // Without a contact page there is nowhere to book, so point at the footer contact details.
  if (!hasContactPage) return { label: 'Get in touch', href: link('index', 'footer') };
  if (features.includes('online-booking')) {
    return {
      label: CATEGORY_CONTENT[answers.category.category].primaryCta,
      href: link('contact', 'booking'),
    };
  }
  if (features.includes('online-ordering')) {
    return { label: 'Order online', href: link('contact', 'booking') };
  }
  return { label: 'Get in touch', href: link('contact', 'contact') };
}

function buildSections(id: SitePageId, answers: QuestionnaireAnswers): SiteSection[] {
  const { brand, about, category, pages } = answers;
  const content = CATEGORY_CONTENT[category.category];
  const cta = primaryCta(answers);
  const s = (kind: SiteSection['kind'], rest: Omit<SiteSection, 'id' | 'kind'>): SiteSection => ({
    id: `${pageSlug(id)}-${kind}`,
    kind,
    ...rest,
  });

  switch (id) {
    case 'home':
      return [
        s('hero', {
          heading: brand.brandName,
          body: brand.tagline ?? firstSentence(about.description),
          cta,
        }),
        s('text', { heading: `Welcome to ${brand.brandName}`, body: about.description }),
        s('cards', { heading: content.offeringsHeading, items: content.offerings }),
        s('cta', { heading: 'Ready when you are', body: about.location, cta }),
      ];
    case 'about': {
      const reasons = [
        about.uniqueValue && { title: 'What makes us different', description: about.uniqueValue },
        about.audience && { title: 'Who we serve', description: about.audience },
        about.location && { title: 'Where to find us', description: about.location },
      ].filter((item): item is { title: string; description: string } => Boolean(item));
      return [
        s('text', { heading: `About ${brand.brandName}`, body: about.description }),
        ...(reasons.length ? [s('cards', { heading: 'Why choose us', items: reasons })] : []),
      ];
    }
    case 'services':
    case 'rooms':
    case 'courses':
      return [
        s('cards', { heading: content.offeringsHeading, items: content.offerings }),
        s('cta', { heading: 'Have a question?', cta }),
      ];
    case 'menu':
      return [s('menu', { heading: content.offeringsHeading, items: content.offerings })];
    case 'team':
      return [
        s('cards', {
          heading: 'Meet the team',
          items: [
            { title: 'Team member', description: 'Add a short bio here.', meta: 'Role' },
            { title: 'Team member', description: 'Add a short bio here.', meta: 'Role' },
            { title: 'Team member', description: 'Add a short bio here.', meta: 'Role' },
          ],
        }),
      ];
    case 'gallery':
      return [
        s('gallery', {
          heading: 'Gallery',
          items: Array.from({ length: 6 }, (_, i) => ({ title: `Photo ${i + 1}` })),
        }),
      ];
    case 'testimonials':
      return [
        s('testimonials', {
          heading: 'What people say',
          items: [
            {
              title: 'A happy customer',
              description: `“${brand.brandName} exceeded every expectation.”`,
            },
            {
              title: 'A returning customer',
              description: '“Friendly, professional and reliable.”',
            },
          ],
        }),
      ];
    case 'pricing':
      return [
        s('pricing', {
          heading: 'Pricing',
          items: [
            {
              title: 'Starter',
              description: 'Everything you need to get started.',
              meta: 'Contact us',
            },
            { title: 'Standard', description: 'Our most popular option.', meta: 'Contact us' },
            { title: 'Premium', description: 'The complete experience.', meta: 'Contact us' },
          ],
        }),
      ];
    case 'faq':
      return [s('faq', { heading: 'Frequently asked questions', items: content.faq })];
    case 'blog':
      return [
        s('cards', {
          heading: 'Latest news',
          items: [
            { title: `Welcome to the new ${brand.brandName} website`, meta: 'News' },
            { title: 'Behind the scenes', meta: 'Stories' },
          ],
        }),
      ];
    case 'contact': {
      const sections = [
        s('contact', { heading: 'Get in touch', body: 'We would love to hear from you.' }),
      ];
      const { features } = pages;
      if (features.includes('online-booking') || features.includes('online-ordering')) {
        sections.push(
          s('booking', {
            heading: features.includes('online-booking') ? cta.label : 'Order online',
            body: 'Online booking will be connected when your site goes live.',
          }),
        );
      }
      return sections;
    }
  }
}

export interface BuildSiteSpecOptions {
  now?: () => Date;
}

/** Turns questionnaire answers into a complete, deterministic site specification. */
export function buildSiteSpec(
  answers: QuestionnaireAnswers,
  { now = () => new Date() }: BuildSiteSpecOptions = {},
): SiteSpec {
  const pages: SitePage[] = answers.pages.pages.map((id) => ({
    id,
    slug: pageSlug(id),
    title: PAGE_LABELS[id],
    sections: buildSections(id, answers),
  }));

  const fonts = FONT_PAIRINGS[answers.design.font];

  return {
    version: 1,
    brand: {
      name: answers.brand.brandName,
      ...(answers.brand.tagline && { tagline: answers.brand.tagline }),
      ...(answers.brand.logoUrl && { logoUrl: answers.brand.logoUrl }),
    },
    category: answers.category.category,
    theme: {
      palette: resolvePalette(answers.design),
      style: answers.design.style,
      font: answers.design.font,
      fontFamilies: { heading: fonts.heading, body: fonts.body },
    },
    navigation: pages.map((p) => ({ label: p.title, href: p.slug })),
    pages,
    features: answers.pages.features,
    dashboard: { enabled: answers.dashboard.wantsDashboard, widgets: answers.dashboard.widgets },
    contact: answers.contact,
    generatedAt: now().toISOString(),
  };
}
