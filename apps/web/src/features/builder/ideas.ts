import {
  BedDouble,
  Camera,
  Cpu,
  Dumbbell,
  Stethoscope,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

export interface Idea {
  icon: LucideIcon;
  label: string;
  prompt: string;
  /** Tailwind gradient for template thumbnails. */
  tint: string;
}

export const IDEAS: Idea[] = [
  {
    icon: Stethoscope,
    label: 'Dental clinic',
    prompt:
      'A modern dental clinic called Bright Smile in Austin with online booking, services, our team and an FAQ',
    tint: 'from-teal-200 via-cyan-100 to-white',
  },
  {
    icon: UtensilsCrossed,
    label: 'Neighbourhood café',
    prompt:
      'A cozy café called Little Fig in Brooklyn with a seasonal menu, a photo gallery and table reservations',
    tint: 'from-orange-200 via-amber-100 to-white',
  },
  {
    icon: Cpu,
    label: 'AI startup',
    prompt:
      'A dark landing page for an AI productivity startup called Relay with features, pricing and an FAQ',
    tint: 'from-violet-300 via-indigo-200 to-white',
  },
  {
    icon: Camera,
    label: 'Photo portfolio',
    prompt:
      'A minimal portfolio for a wedding photographer named Ava Laurent with a gallery and a contact form',
    tint: 'from-zinc-300 via-zinc-100 to-white',
  },
  {
    icon: BedDouble,
    label: 'Boutique hotel',
    prompt:
      'An elegant boutique hotel called Casa Alma in Lisbon with rooms, amenities and guest reviews',
    tint: 'from-amber-200 via-stone-100 to-white',
  },
  {
    icon: Dumbbell,
    label: 'Fitness studio',
    prompt:
      'A bold fitness studio called Pulse Athletics with classes, membership pricing and our coaches',
    tint: 'from-lime-200 via-emerald-100 to-white',
  },
];

/** Follow-up ideas shown under the chat once a site exists. */
export const FOLLOW_UPS = [
  'Switch to a dark theme',
  'Add a pricing section',
  'Change the accent colour to emerald',
  'Move testimonials to the top',
];

export const PLACEHOLDERS = [
  'A landing page for my yoga studio in Lisbon…',
  'A portfolio for a product designer, minimal and bold…',
  'A café website with a menu and online reservations…',
  'A SaaS landing page with pricing and an FAQ…',
];
