/**
 * Colour palettes offered in the design step, plus small colour utilities used by the
 * generator to keep text readable (WCAG contrast).
 */

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface PalettePreset {
  id: string;
  name: string;
  colors: ColorPalette;
}

export const PALETTE_PRESETS = [
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      primary: '#0e7490',
      secondary: '#164e63',
      accent: '#f59e0b',
      background: '#f8fafc',
      text: '#0f172a',
    },
  },
  {
    id: 'clinic',
    name: 'Calm Clinic',
    colors: {
      primary: '#0f766e',
      secondary: '#134e4a',
      accent: '#38bdf8',
      background: '#f0fdfa',
      text: '#042f2e',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      primary: '#15803d',
      secondary: '#14532d',
      accent: '#eab308',
      background: '#f7fee7',
      text: '#1a2e05',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      primary: '#ea580c',
      secondary: '#9a3412',
      accent: '#facc15',
      background: '#fff7ed',
      text: '#431407',
    },
  },
  {
    id: 'espresso',
    name: 'Espresso',
    colors: {
      primary: '#7c2d12',
      secondary: '#451a03',
      accent: '#d97706',
      background: '#fefce8',
      text: '#1c1917',
    },
  },
  {
    id: 'classroom',
    name: 'Classroom',
    colors: {
      primary: '#4f46e5',
      secondary: '#312e81',
      accent: '#f97316',
      background: '#ffffff',
      text: '#1e1b4b',
    },
  },
  {
    id: 'luxury',
    name: 'Luxury',
    colors: {
      primary: '#a16207',
      secondary: '#1c1917',
      accent: '#d4af37',
      background: '#0c0a09',
      text: '#fafaf9',
    },
  },
  {
    id: 'mono',
    name: 'Minimal Mono',
    colors: {
      primary: '#111827',
      secondary: '#374151',
      accent: '#6b7280',
      background: '#ffffff',
      text: '#111827',
    },
  },
] as const satisfies readonly PalettePreset[];

export type PalettePresetId = (typeof PALETTE_PRESETS)[number]['id'];
export const PALETTE_PRESET_IDS = PALETTE_PRESETS.map((p) => p.id) as [
  PalettePresetId,
  ...PalettePresetId[],
];

export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

export function isHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

export function getPalettePreset(id: string): PalettePreset | undefined {
  return PALETTE_PRESETS.find((p) => p.id === id);
}

/** Expands `#abc` to `#aabbcc` and lower-cases the result. */
export function normalizeHex(hex: string): string {
  if (!isHexColor(hex)) throw new Error(`Invalid hex colour: ${hex}`);
  const raw = hex.slice(1).toLowerCase();
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  return `#${full}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const full = normalizeHex(hex).slice(1);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG 2.x relative luminance, 0 (black) – 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

/** Picks near-black or white text, whichever reads better on `background`. */
export function readableTextColor(background: string): '#111827' | '#ffffff' {
  return contrastRatio(background, '#111827') >= contrastRatio(background, '#ffffff')
    ? '#111827'
    : '#ffffff';
}
