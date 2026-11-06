/**
 * The site specification produced by the generator. It is a structured, renderer-agnostic
 * description of the website so it can be rendered to static HTML today and to framework
 * code (or edited in a visual editor) later.
 */
import type { BusinessCategory, DashboardWidget, SiteFeature, SitePageId } from './categories.js';
import type { ColorPalette } from './palettes.js';
import type { ContactStep, DesignStyle, FontPairing } from './questionnaire.js';

export const SECTION_KINDS = [
  'hero',
  'text',
  'cards',
  'menu',
  'gallery',
  'testimonials',
  'faq',
  'pricing',
  'contact',
  'booking',
  'cta',
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export interface SectionItem {
  title: string;
  description?: string;
  meta?: string;
}

export interface SiteSection {
  id: string;
  kind: SectionKind;
  heading: string;
  body?: string;
  items?: SectionItem[];
  cta?: { label: string; href: string };
}

export interface SitePage {
  id: SitePageId;
  slug: string;
  title: string;
  sections: SiteSection[];
}

export interface SiteTheme {
  palette: ColorPalette;
  style: DesignStyle;
  font: FontPairing;
  fontFamilies: { heading: string; body: string };
}

export interface SiteSpec {
  version: 1;
  brand: { name: string; tagline?: string; logoUrl?: string };
  category: BusinessCategory;
  theme: SiteTheme;
  navigation: { label: string; href: string }[];
  pages: SitePage[];
  features: SiteFeature[];
  dashboard: { enabled: boolean; widgets: DashboardWidget[] };
  contact: ContactStep;
  generatedAt: string;
}
