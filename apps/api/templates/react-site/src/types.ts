export type IconName =
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

export type SectionKind =
  | 'hero'
  | 'logos'
  | 'about'
  | 'features'
  | 'services'
  | 'menu'
  | 'rooms'
  | 'products'
  | 'stats'
  | 'gallery'
  | 'team'
  | 'testimonials'
  | 'pricing'
  | 'faq'
  | 'newsletter'
  | 'cta'
  | 'contact';

export interface Item {
  title: string;
  description?: string;
  /** A price, role, rating or author. */
  meta?: string;
  icon?: IconName;
  image?: string;
  /** Pricing: the recommended plan. */
  highlight?: boolean;
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
  image?: string;
}

export interface Site {
  name: string;
  tagline: string;
  mode: 'light' | 'dark';
  heroCard: { label: string; title: string; rows: [string, string][]; badge: string };
  nav: { label: string; href: string }[];
  sections: Section[];
  contact: { email?: string; phone?: string; address?: string; hours?: string };
}
