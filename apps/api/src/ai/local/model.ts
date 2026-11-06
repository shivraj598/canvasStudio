/**
 * The local engine's site model. It is saved in the project as `site.config.json`, so a
 * follow-up message is applied to structured data and the project re-rendered, instead of
 * patching code.
 */

/** Icon names; the React template maps them to lucide-react icons. */
export type IconId =
  | 'check'
  | 'arrow'
  | 'star'
  | 'heart'
  | 'shield'
  | 'zap'
  | 'clock'
  | 'calendar'
  | 'users'
  | 'smile'
  | 'pin'
  | 'mail'
  | 'globe'
  | 'award'
  | 'trend'
  | 'layers'
  | 'sun'
  | 'coffee'
  | 'book'
  | 'box';

export const ACCENTS = [
  'violet',
  'indigo',
  'blue',
  'sky',
  'cyan',
  'teal',
  'emerald',
  'green',
  'lime',
  'amber',
  'orange',
  'red',
  'rose',
  'pink',
  'fuchsia',
  'zinc',
] as const;
export type Accent = (typeof ACCENTS)[number];

export const FONTS = {
  sans: { label: 'clean sans-serif type (Inter)', heading: 'Inter', body: 'Inter' },
  serif: { label: 'elegant serif headings (Fraunces)', heading: 'Fraunces', body: 'Inter' },
  rounded: { label: 'friendly rounded type (Nunito)', heading: 'Nunito', body: 'Nunito' },
  grotesk: {
    label: 'technical grotesk headings (Space Grotesk)',
    heading: 'Space Grotesk',
    body: 'Inter',
  },
  display: {
    label: 'editorial display headings (Instrument Serif)',
    heading: 'Instrument Serif',
    body: 'Inter',
  },
} as const;
export type FontId = keyof typeof FONTS;

export type Radius = 'sharp' | 'soft' | 'round';
export type Mode = 'light' | 'dark';

export interface Theme {
  mode: Mode;
  accent: Accent;
  font: FontId;
  radius: Radius;
}

export const SECTION_KINDS = [
  'hero',
  'logos',
  'about',
  'features',
  'services',
  'menu',
  'rooms',
  'products',
  'stats',
  'gallery',
  'team',
  'testimonials',
  'pricing',
  'faq',
  'newsletter',
  'cta',
  'contact',
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export const SECTION_LABELS: Record<SectionKind, string> = {
  hero: 'Hero',
  logos: 'Trusted-by logos',
  about: 'About',
  features: 'Features',
  services: 'Services',
  menu: 'Menu',
  rooms: 'Rooms',
  products: 'Products',
  stats: 'Stats',
  gallery: 'Gallery',
  team: 'Team',
  testimonials: 'Testimonials',
  pricing: 'Pricing',
  faq: 'FAQ',
  newsletter: 'Newsletter',
  cta: 'Call to action',
  contact: 'Contact',
};

export interface Item {
  title: string;
  description?: string;
  /** Price, role, rating, etc. */
  meta?: string;
  icon?: IconId;
  /** Pricing: the recommended plan. */
  highlight?: boolean;
  /** Pricing: bullet list. */
  bullets?: string[];
}

export interface Section {
  kind: SectionKind;
  eyebrow?: string;
  heading: string;
  body?: string;
  items?: Item[];
  cta?: string;
  secondaryCta?: string;
}

export interface HeroCard {
  label: string;
  title: string;
  rows: [string, string][];
  badge: string;
}

export interface SiteConfig {
  version: 1;
  archetype: string;
  name: string;
  tagline: string;
  location?: string;
  theme: Theme;
  heroCard: HeroCard;
  sections: Section[];
  contact: { email?: string; phone?: string; address?: string; hours?: string };
}
