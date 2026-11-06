/**
 * Turns a SiteConfig into a real Vite + React + TypeScript + Tailwind project. The components
 * are fixed, hand-written files in `apps/api/templates/react-site`; only the content
 * (`src/content.ts`), theme tokens (`src/index.css`), `index.html` and `package.json` are
 * generated, so an edit like "make it dark" touches one or two files.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { ProjectFile } from '@canvas/shared';
import { escapeHtml } from '../../generator/render.js';
import { FONTS, type Accent, type Section, type SiteConfig } from './model.js';

export const CONFIG_PATH = 'site.config.json';

function findTemplateDir(): string {
  const candidates = [
    resolve(process.cwd(), 'templates/react-site'),
    resolve(process.cwd(), 'apps/api/templates/react-site'),
    resolve(new URL('../../../templates/react-site', import.meta.url).pathname),
    resolve(new URL('../templates/react-site', import.meta.url).pathname),
  ];
  const found = candidates.find((p) => existsSync(join(p, 'src/App.tsx')));
  if (!found) throw new Error('Could not find templates/react-site');
  return found;
}

let templateCache: ProjectFile[] | null = null;

/** The static template files, read once. */
export function templateFiles(): ProjectFile[] {
  if (templateCache) return templateCache;
  const root = findTemplateDir();
  const files: ProjectFile[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      if (name === 'node_modules' || name === 'dist' || name === '.DS_Store') continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else files.push({ path: relative(root, full), content: readFileSync(full, 'utf8') });
    }
  };
  walk(root);
  templateCache = files;
  return files;
}

/** Tailwind's 600 shades, used as each accent's base colour. */
const ACCENT_HEX: Record<Accent, string> = {
  violet: '#7c3aed',
  indigo: '#4f46e5',
  blue: '#2563eb',
  sky: '#0ea5e9',
  cyan: '#06b6d4',
  teal: '#0d9488',
  emerald: '#059669',
  green: '#16a34a',
  lime: '#84cc16',
  amber: '#f59e0b',
  orange: '#ea580c',
  red: '#dc2626',
  rose: '#e11d48',
  pink: '#db2777',
  fuchsia: '#c026d3',
  zinc: '#18181b',
};
const LIGHT_ACCENTS = new Set<Accent>(['lime', 'amber', 'sky', 'cyan']);

export const PACKAGE_VERSIONS = {
  react: '^19.1.0',
  'react-dom': '^19.1.0',
  'lucide-react': '^0.468.0',
  '@tailwindcss/vite': '^4.1.11',
  '@types/react': '^19.1.8',
  '@types/react-dom': '^19.1.6',
  '@vitejs/plugin-react': '^4.6.0',
  tailwindcss: '^4.1.11',
  typescript: '~5.8.3',
  vite: '^7.0.0',
} as const;

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'site'
  );
}

function image(config: SiteConfig, key: string, w = 900, h = 700): string {
  return `https://picsum.photos/seed/${slug(config.name)}-${slug(key)}/${w}/${h}`;
}

const NAV_LABELS: Partial<Record<Section['kind'], string>> = {
  features: 'Features',
  services: 'Services',
  menu: 'Menu',
  rooms: 'Rooms',
  products: 'Shop',
  gallery: 'Gallery',
  team: 'Team',
  testimonials: 'Reviews',
  pricing: 'Pricing',
  faq: 'FAQ',
  about: 'About',
  contact: 'Contact',
};

/** The data `src/content.ts` exports, matching `src/types.ts` in the template. */
export function toSite(config: SiteConfig) {
  const sections = config.sections.map((s) => {
    const section: Section & { image?: string } = structuredClone(s);
    if (s.kind === 'about') section.image = image(config, 'about');
    if (s.kind === 'gallery' || s.kind === 'products' || s.kind === 'rooms') {
      section.items = s.items?.map((item, i) => ({
        ...item,
        image: image(
          config,
          `${s.kind}-${i}`,
          s.kind === 'gallery' && i === 0 ? 900 : 800,
          s.kind === 'gallery' && i === 0 ? 1200 : 600,
        ),
      }));
    }
    return section;
  });
  return {
    name: config.name,
    tagline: config.tagline,
    mode: config.theme.mode,
    heroCard: config.heroCard,
    nav: sections
      .filter((s) => NAV_LABELS[s.kind])
      .slice(0, 5)
      .map((s) => ({ label: NAV_LABELS[s.kind]!, href: `#${s.kind}` })),
    sections,
    contact: config.contact,
  };
}

export function renderContent(config: SiteConfig): string {
  return `// Everything your visitors read lives here. Edit freely — the page updates instantly.
import type { Site } from './types';

export const site: Site = ${JSON.stringify(toSite(config), null, 2)};
`;
}

export function renderThemeCss(config: SiteConfig): string {
  const { accent, mode, font, radius } = config.theme;
  const dark = mode === 'dark';
  const f = FONTS[font];
  const base = accent === 'zinc' && dark ? '#fafafa' : ACCENT_HEX[accent];
  const onBrand = LIGHT_ACCENTS.has(accent) || (accent === 'zinc' && dark) ? '#0a0a0a' : '#ffffff';
  const brandText =
    accent === 'zinc'
      ? dark
        ? '#fafafa'
        : '#18181b'
      : dark
        ? `color-mix(in oklab, ${base} 65%, white)`
        : LIGHT_ACCENTS.has(accent)
          ? `color-mix(in oklab, ${base} 70%, black)`
          : base;
  const surface = dark
    ? {
        page: '#09090b',
        alt: '#111114',
        card: '#16161a',
        ink: '#f4f4f5',
        muted: '#a1a1aa',
        subtle: '#71717a',
        line: '#27272a',
      }
    : {
        page: '#ffffff',
        alt: '#f8fafc',
        card: '#ffffff',
        ink: '#18181b',
        muted: '#52525b',
        subtle: '#71717a',
        line: '#e4e4e7',
      };
  const radii = {
    sharp: { card: '0px', button: '0px' },
    soft: { card: '1rem', button: '0.75rem' },
    round: { card: '1.75rem', button: '9999px' },
  }[radius];
  const headingWeight =
    f.heading === 'Instrument Serif' ? 400 : f.heading === 'Fraunces' ? 600 : 700;
  const fallback =
    f.heading === 'Fraunces' || f.heading === 'Instrument Serif'
      ? 'ui-serif, Georgia, serif'
      : 'ui-sans-serif, system-ui, sans-serif';

  return `@import 'tailwindcss';

/*
 * Design tokens for ${config.name}. Change a value here to restyle the whole site —
 * utilities like bg-brand, text-muted, border-line and rounded-card read from them.
 */
@theme {
  --font-heading: '${f.heading}', ${fallback};
  --font-body: '${f.body}', ui-sans-serif, system-ui, sans-serif;

  --color-brand: ${base};
  --color-brand-strong: color-mix(in oklab, ${base} 82%, ${dark ? 'white' : 'black'});
  --color-brand-soft: color-mix(in oklab, ${base} ${dark ? 18 : 12}%, transparent);
  --color-brand-text: ${brandText};
  --color-on-brand: ${onBrand};

  --color-page: ${surface.page};
  --color-alt: ${surface.alt};
  --color-card: ${surface.card};
  --color-ink: ${surface.ink};
  --color-muted: ${surface.muted};
  --color-subtle: ${surface.subtle};
  --color-line: ${surface.line};

  --radius-card: ${radii.card};
  --radius-button: ${radii.button};
}

@layer base {
  html {
    scroll-behavior: smooth;${dark ? '\n    color-scheme: dark;' : ''}
  }
  body {
    font-family: var(--font-body);
  }
  h1,
  h2,
  h3,
  .font-heading {
    font-family: var(--font-heading);
    font-weight: ${headingWeight};
    letter-spacing: ${headingWeight === 400 ? '-0.01em' : '-0.025em'};
  }
}

.hero-grid {
  background-image: radial-gradient(${dark ? 'rgb(255 255 255 / 0.08)' : 'rgb(24 24 27 / 0.12)'} 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: radial-gradient(ellipse at top, black 30%, transparent 70%);
}

.reveal {
  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity 0.7s ease,
    transform 0.7s ease;
}
.reveal.is-visible {
  opacity: 1;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
`;
}

export function fontsHref(config: SiteConfig): string {
  const f = FONTS[config.theme.font];
  const spec = (family: string) =>
    family === 'Instrument Serif'
      ? 'family=Instrument+Serif:ital@0;1'
      : `family=${family.replace(/ /g, '+')}:wght@400;500;600;700;800`;
  return `https://fonts.googleapis.com/css2?${[...new Set([f.heading, f.body])].map(spec).join('&')}&display=swap`;
}

export function renderIndexHtml(config: SiteConfig): string {
  const hero = config.sections.find((s) => s.kind === 'hero');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(config.name)}</title>
    <meta name="description" content="${escapeHtml(hero?.body ?? config.tagline)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="${fontsHref(config)}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

export function renderPackageJson(config: SiteConfig): string {
  const v = PACKAGE_VERSIONS;
  return `${JSON.stringify(
    {
      name: slug(config.name),
      private: true,
      version: '0.1.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview' },
      dependencies: {
        react: v.react,
        'react-dom': v['react-dom'],
        'lucide-react': v['lucide-react'],
      },
      devDependencies: {
        '@tailwindcss/vite': v['@tailwindcss/vite'],
        '@types/react': v['@types/react'],
        '@types/react-dom': v['@types/react-dom'],
        '@vitejs/plugin-react': v['@vitejs/plugin-react'],
        tailwindcss: v.tailwindcss,
        typescript: v.typescript,
        vite: v.vite,
      },
    },
    null,
    2,
  )}\n`;
}

export function renderReadme(config: SiteConfig): string {
  return `# ${config.name}

Built with [Canvas Studio](https://canvas.studio) — React, TypeScript, Vite and Tailwind CSS.

## Run it

\`\`\`bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
\`\`\`

## Make it yours

| What                     | Where                    |
| ------------------------ | ------------------------ |
| Text, sections, contacts | \`src/content.ts\`         |
| Colours, fonts, corners  | \`src/index.css\` (@theme) |
| Layout of each section   | \`src/components/\`        |
`;
}

/** Every file of the project for this config. */
export function renderProject(config: SiteConfig): ProjectFile[] {
  return [
    { path: 'package.json', content: renderPackageJson(config) },
    { path: 'index.html', content: renderIndexHtml(config) },
    { path: 'README.md', content: renderReadme(config) },
    ...templateFiles(),
    { path: 'src/index.css', content: renderThemeCss(config) },
    { path: 'src/content.ts', content: renderContent(config) },
    { path: CONFIG_PATH, content: `${JSON.stringify(config, null, 2)}\n` },
  ];
}
