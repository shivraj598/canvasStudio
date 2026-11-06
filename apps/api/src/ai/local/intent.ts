/**
 * Natural-language understanding for the offline engine. It is rule-based on purpose: fast,
 * deterministic and testable. Anything it can't understand is reported back honestly instead
 * of guessed at.
 */
import { ARCHETYPES, BUSINESS, GENERIC, getArchetype, type Archetype } from './archetypes.js';
import {
  SECTION_LABELS,
  type Accent,
  type FontId,
  type Mode,
  type Radius,
  type Section,
  type SectionKind,
  type SiteConfig,
} from './model.js';

const COLOR_WORDS: [RegExp, Accent][] = [
  [/\b(purple|violet|lavender|lilac)\b/, 'violet'],
  [/\bindigo\b/, 'indigo'],
  [/\b(navy|blue|cobalt|royal blue)\b/, 'blue'],
  [/\b(sky|light blue|baby blue)\b/, 'sky'],
  [/\b(cyan|aqua|turquoise)\b/, 'cyan'],
  [/\bteal\b/, 'teal'],
  [/\b(emerald|green|forest|sage|mint|olive)\b/, 'emerald'],
  [/\b(lime|neon green|chartreuse)\b/, 'lime'],
  [/\b(amber|gold|golden|yellow|mustard)\b/, 'amber'],
  [/\b(orange|peach|terracotta|coral)\b/, 'orange'],
  [/\b(red|crimson|scarlet|burgundy)\b/, 'red'],
  [/\b(rose|blush)\b/, 'rose'],
  [/\b(pink|magenta)\b/, 'pink'],
  [/\bfuchsia\b/, 'fuchsia'],
  [/\b(black|monochrome|grayscale|greyscale|neutral|gr[ae]y|black and white)\b/, 'zinc'],
];

const FONT_WORDS: [RegExp, FontId][] = [
  [/\b(serif|elegant|classic|luxury|luxurious|sophisticated)\b/, 'serif'],
  [/\b(editorial|magazine|display font)\b/, 'display'],
  [/\b(playful|friendly|fun|rounded font|kids?|childlike|cute)\b/, 'rounded'],
  [/\b(technical|techy|futuristic|grotesk|mono(space)?|geometric)\b/, 'grotesk'],
  [/\b(sans|sans-serif|modern font|clean font)\b/, 'sans'],
];

const SECTION_WORDS: [RegExp, SectionKind][] = [
  [/\b(pricing|prices|plans|packages|memberships?)\b/, 'pricing'],
  [/\b(faqs?|questions)\b/, 'faq'],
  [/\b(testimonials?|reviews?|quotes)\b/, 'testimonials'],
  [/\b(team|staff|doctors|trainers|coaches|stylists)\b/, 'team'],
  [/\b(gallery|photos|images|pictures|portfolio)\b/, 'gallery'],
  [/\b(stats|statistics|numbers|metrics)\b/, 'stats'],
  [/\b(newsletter|subscribe|subscription|mailing list)\b/, 'newsletter'],
  [/\b(contact( form)?|form|map|address)\b/, 'contact'],
  [/\b(menu|dishes)\b/, 'menu'],
  [/\b(rooms|suites)\b/, 'rooms'],
  [/\b(products|catalog(ue)?|collection)\b/, 'products'],
  [/\b(features|benefits|amenities|classes|courses)\b/, 'features'],
  [/\b(services|treatments|offerings)\b/, 'services'],
  [/\b(logos|clients|trusted by|partners)\b/, 'logos'],
  [/\b(cta|call to action|booking banner|banner)\b/, 'cta'],
  [/\b(about|story|our story|bio)\b/, 'about'],
  [/\bhero\b/, 'hero'],
];

/** Display order used when a new section is inserted. */
const NATURAL_ORDER: SectionKind[] = [
  'hero',
  'logos',
  'about',
  'stats',
  'features',
  'services',
  'menu',
  'rooms',
  'products',
  'gallery',
  'team',
  'testimonials',
  'pricing',
  'faq',
  'newsletter',
  'cta',
  'contact',
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export function titleCase(text: string): string {
  const small = new Set(['and', 'of', 'the', 'for', 'at', 'on', '&']);
  return text
    .trim()
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && small.has(w.toLowerCase())
        ? w.toLowerCase()
        : /[A-Z]/.test(w.slice(1))
          ? w
          : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(' ');
}

function stripQuoted(text: string): string {
  return text.replace(/["“][^"”]*["”]/g, ' ');
}

export function matchArchetype(text: string): { archetype: Archetype; score: number } {
  const lower = ` ${text.toLowerCase()} `;
  let best: { archetype: Archetype; score: number } = { archetype: BUSINESS, score: 0 };
  for (const archetype of ARCHETYPES) {
    let score = 0;
    for (const kw of archetype.keywords) {
      const re = new RegExp(`[^a-z]${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?[^a-z]`);
      if (re.test(lower)) score += kw.includes(' ') ? 3 : 2;
    }
    if (score > best.score) best = { archetype, score };
  }
  return best;
}

export function extractName(prompt: string): string | undefined {
  const quoted = /["“]([^"”]{2,48})["”]/.exec(prompt)?.[1];
  if (quoted) return quoted.trim();
  const called =
    /\b(?:called|named|brand(?:ed)?\s+as|name\s+is)\s+(.+?)(?=\s+(?:in|at|for|with|that|which|located|based|and|where|who|on|to)\b|[,.;:!?\n(]|$)/i.exec(
      prompt,
    )?.[1];
  if (called) {
    const words = called.trim().split(/\s+/).slice(0, 5).join(' ');
    if (words.length >= 2) return titleCase(words);
  }
  return undefined;
}

export function extractLocation(prompt: string): string | undefined {
  const m =
    /\b(?:in|based in|located in|from)\s+((?:[A-Z][\w'-]+)(?:[ ,]+(?:[A-Z][\w'-]+)){0,2})/.exec(
      prompt,
    );
  return m?.[1]?.replace(/[ ,]+$/, '');
}

export function detectAccent(text: string): Accent | undefined {
  const lower = stripQuoted(text).toLowerCase();
  return COLOR_WORDS.find(([re]) => re.test(lower))?.[1];
}

export function detectMode(text: string): Mode | undefined {
  const lower = stripQuoted(text).toLowerCase();
  // "dark blue" is a colour, not a theme.
  const darkColour = /\bdark\s+(blue|green|red|purple|teal|gr[ae]y|orange|pink|brown)\b/;
  if (/\b(dark|darker|night|moody|black background)\b/.test(lower.replace(darkColour, '$1')))
    return 'dark';
  if (
    /\b(light mode|light theme|lighter|white background|make it light|bright and airy)\b/.test(
      lower,
    )
  )
    return 'light';
  return undefined;
}

export function detectFont(text: string): FontId | undefined {
  const lower = stripQuoted(text).toLowerCase();
  return FONT_WORDS.find(([re]) => re.test(lower))?.[1];
}

export function detectRadius(text: string): Radius | undefined {
  const lower = stripQuoted(text).toLowerCase();
  if (/\b(sharp|square|brutalist|no rounded|less rounded|straight edges)\b/.test(lower))
    return 'sharp';
  if (/\b(more rounded|pill|rounder|bubbly|soft corners|round(ed)? corners)\b/.test(lower))
    return 'round';
  return undefined;
}

function fill(text: string | undefined, name: string, location?: string): string | undefined {
  return text
    ?.replaceAll('{name}', name)
    .replaceAll('{location}', location ? ` in ${location}` : '');
}

export function buildSection(
  kind: SectionKind,
  archetype: Archetype,
  name: string,
  location?: string,
): Section {
  const base = archetype.content[kind] ?? GENERIC[kind];
  return {
    kind,
    eyebrow: fill(base.eyebrow, name, location),
    heading: fill(base.heading, name, location)!,
    body: fill(base.body, name, location),
    cta: base.cta,
    secondaryCta: base.secondaryCta,
    items: base.items?.map((item) => ({
      ...item,
      title: fill(item.title, name, location)!,
      description: fill(item.description, name, location),
      meta: fill(item.meta, name, location),
      bullets: item.bullets ? [...item.bullets] : undefined,
    })),
  };
}

function sortSections(sections: Section[]): Section[] {
  return [...sections].sort(
    (a, b) => NATURAL_ORDER.indexOf(a.kind) - NATURAL_ORDER.indexOf(b.kind),
  );
}

function slugEmail(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `hello@${slug || 'yourbusiness'}.com`;
}

/** Sections the prompt explicitly asks to include or leave out. */
function requestedSections(prompt: string): { add: SectionKind[]; remove: SectionKind[] } {
  const add: SectionKind[] = [];
  const remove: SectionKind[] = [];
  const lower = stripQuoted(prompt).toLowerCase();
  for (const clause of lower.split(/[,.;]|\band\b|\bplus\b|\bthen\b/)) {
    const negative = /\b(no|without|skip|exclude|don'?t (?:need|want|include))\b/.test(clause);
    for (const [re, kind] of SECTION_WORDS) {
      if (kind === 'hero' || !re.test(clause)) continue;
      // "portfolio"/"work" describe the kind of site in a first prompt, not a section.
      if (
        kind === 'gallery' &&
        /\bportfolio\b/.test(clause) &&
        !/gallery|photos|images/.test(clause)
      )
        continue;
      (negative ? remove : add).push(kind);
    }
  }
  return { add, remove };
}

export function createConfigFromPrompt(prompt: string): SiteConfig {
  const { archetype } = matchArchetype(prompt);
  const location = extractLocation(prompt);
  const name =
    extractName(prompt) ?? archetype.names[hash(prompt) % archetype.names.length] ?? 'My Website';

  const theme = { ...archetype.theme };
  theme.accent = detectAccent(prompt) ?? theme.accent;
  theme.mode = detectMode(prompt) ?? theme.mode;
  theme.font = detectFont(prompt) ?? theme.font;
  theme.radius =
    detectRadius(prompt) ?? (/\bminimal(ist)?\b/i.test(prompt) ? 'sharp' : theme.radius);

  const { add, remove } = requestedSections(prompt);
  const kinds = new Set<SectionKind>(archetype.sections);
  for (const k of add) kinds.add(k);
  for (const k of remove) kinds.delete(k);
  kinds.add('hero');

  const sections = sortSections(
    [...kinds].map((kind) => buildSection(kind, archetype, name, location)),
  );
  // Keep the archetype's own order for its default sections; new ones slot in naturally.
  const ordered = archetype.sections
    .filter((k) => kinds.has(k))
    .map((k) => sections.find((s) => s.kind === k)!)
    .concat(sections.filter((s) => !archetype.sections.includes(s.kind)));

  return {
    version: 1,
    archetype: archetype.id,
    name,
    tagline: fill(archetype.content.hero?.body ?? GENERIC.hero.body, name, location)!,
    location,
    theme,
    heroCard: structuredClone(archetype.heroCard),
    sections: sortByReference(ordered),
    contact: {
      email: slugEmail(name),
      phone: '(555) 012-3456',
      address: location ? `12 Market Street, ${location}` : '12 Market Street',
      hours: archetype.hours,
    },
  };
}

/** Keeps hero first and contact/cta last regardless of where they were added. */
function sortByReference(sections: Section[]): Section[] {
  const weight = (k: SectionKind) =>
    k === 'hero'
      ? -2
      : k === 'logos'
        ? -1
        : k === 'newsletter'
          ? 97
          : k === 'cta'
            ? 98
            : k === 'contact'
              ? 99
              : 0;
  return sections
    .map((s, i) => ({ s, i }))
    .sort((a, b) => weight(a.s.kind) - weight(b.s.kind) || a.i - b.i)
    .map(({ s }) => s);
}

export interface EditResult {
  config: SiteConfig;
  /** Human-readable list of what changed. */
  notes: string[];
  /** The message describes a different site; rebuild from scratch. */
  rebuild?: boolean;
}

const ACCENT_NAMES: Record<Accent, string> = {
  violet: 'violet',
  indigo: 'indigo',
  blue: 'blue',
  sky: 'sky blue',
  cyan: 'cyan',
  teal: 'teal',
  emerald: 'green',
  green: 'green',
  lime: 'lime',
  amber: 'amber',
  orange: 'orange',
  red: 'red',
  rose: 'rose',
  pink: 'pink',
  fuchsia: 'fuchsia',
  zinc: 'monochrome',
};

function quotedOrRest(text: string): string | undefined {
  const q = /["“]([^"”]+)["”]/.exec(text)?.[1];
  if (q) return q.trim();
  const rest = text
    .replace(/^[\s:]+/, '')
    .split(/[\n]|(?<=[.!?])\s/)[0]
    ?.trim();
  return rest ? rest.replace(/[.!]+$/, '') : undefined;
}

/** Applies a follow-up instruction to an existing site. */
export function applyEdits(current: SiteConfig, message: string): EditResult {
  const config: SiteConfig = structuredClone(current);
  const notes: string[] = [];
  const unquoted = stripQuoted(message);
  const lower = unquoted.toLowerCase();

  // A request for a whole different site.
  if (
    /\b(start over|from scratch|completely different|brand new site|new website)\b/.test(lower) ||
    (/\b(website|site|landing page|page) for\b/.test(lower) &&
      matchArchetype(message).archetype.id !== current.archetype &&
      matchArchetype(message).score > 0)
  ) {
    return {
      config: createConfigFromPrompt(message),
      notes: ['Rebuilt the site from scratch'],
      rebuild: true,
    };
  }

  const hero = config.sections.find((s) => s.kind === 'hero');

  // Text edits — matched on the original message so quoted text is preserved.
  const rename =
    /\b(?:rename(?: (?:it|the (?:site|brand|business|website|company)))?\s+to|call it|change the (?:brand |business |site |company )?name to|name it)\s+(.+)/i.exec(
      message,
    );
  if (rename?.[1]) {
    const newName = quotedOrRest(rename[1]);
    if (newName) {
      const old = config.name;
      config.name = newName.slice(0, 60);
      const swap = (t?: string) => t?.replaceAll(old, config.name);
      for (const s of config.sections) {
        s.heading = swap(s.heading)!;
        s.eyebrow = swap(s.eyebrow);
        s.body = swap(s.body);
        s.items?.forEach((it) => {
          it.title = swap(it.title)!;
          it.description = swap(it.description);
        });
      }
      config.tagline = swap(config.tagline)!;
      notes.push(`Renamed the site to **${config.name}**`);
    }
  }

  const headline =
    /\b(?:main )?(?:headline|heading|title|hero (?:text|title|heading))\b.*?\b(?:to|say|says|reads?)\b\s*(.+)/i.exec(
      message,
    );
  if (headline?.[1] && hero && !rename) {
    const text = quotedOrRest(headline[1]);
    if (text) {
      hero.heading = text.slice(0, 120);
      notes.push(`Updated the headline to “${hero.heading}”`);
    }
  }

  const subtitle =
    /\b(?:subtitle|subheading|sub-?headline|tagline|description|intro)\b.*?\b(?:to|say|says|reads?)\b\s*(.+)/i.exec(
      message,
    );
  if (subtitle?.[1] && hero) {
    const text = quotedOrRest(subtitle[1]);
    if (text) {
      hero.body = text.slice(0, 280);
      config.tagline = hero.body;
      notes.push('Updated the hero description');
    }
  }

  const button = /\b(?:button|cta|call to action)\b.*?\b(?:to|say|says|reads?)\b\s*(.+)/i.exec(
    message,
  );
  if (button?.[1] && hero) {
    const text = quotedOrRest(button[1]);
    if (text) {
      hero.cta = text.slice(0, 40);
      notes.push(`Changed the main button to “${hero.cta}”`);
    }
  }

  const email = /[\w.+-]+@[\w-]+\.[\w.-]+/.exec(message)?.[0];
  if (email) {
    config.contact.email = email;
    notes.push(`Set the contact email to ${email}`);
  }
  if (/\b(phone|call|number|tel)\b/i.test(message)) {
    const phone = /(\+?\d[\d\s().-]{6,}\d)/.exec(message)?.[1];
    if (phone) {
      config.contact.phone = phone.trim();
      notes.push(`Set the phone number to ${config.contact.phone}`);
    }
  }
  const address = /\baddress\b\s*(?:is|to|:)\s*(.+)/i.exec(message)?.[1];
  if (address) {
    config.contact.address = quotedOrRest(address)?.slice(0, 120);
    notes.push('Updated the address');
  }

  // Theme edits — matched on unquoted text so headline copy doesn't recolour the site.
  const textEdit = Boolean(rename || headline || subtitle || button);
  const mode = detectMode(unquoted);
  if (mode && mode !== config.theme.mode) {
    config.theme.mode = mode;
    notes.push(mode === 'dark' ? 'Switched to a dark theme' : 'Switched to a light theme');
  }
  const accent = textEdit ? undefined : detectAccent(unquoted);
  if (accent && accent !== config.theme.accent) {
    config.theme.accent = accent;
    notes.push(`Changed the accent colour to ${ACCENT_NAMES[accent]}`);
  }
  const font = textEdit ? undefined : detectFont(unquoted);
  if (
    font &&
    font !== config.theme.font &&
    /\b(font|type|typography|style|look|feel|make it|more)\b/.test(lower)
  ) {
    config.theme.font = font;
    notes.push(`Switched to ${font === 'grotesk' ? 'technical grotesk' : font} typography`);
  }
  const radius = detectRadius(unquoted);
  if (radius && radius !== config.theme.radius) {
    config.theme.radius = radius;
    notes.push(
      radius === 'sharp' ? 'Squared off the corners' : 'Made the corners softer and rounder',
    );
  }
  if (/\bminimal(ist)?\b/.test(lower) && config.theme.radius !== 'sharp' && !radius) {
    config.theme.radius = 'sharp';
    if (config.theme.accent !== 'zinc' && !accent) config.theme.accent = 'zinc';
    notes.push('Gave it a more minimal look');
  }

  // Section edits, clause by clause, carrying the last verb forward ("add pricing and faq").
  if (!textEdit) {
    const archetype = getArchetype(config.archetype);
    let verb: 'add' | 'remove' | 'move' | null = null;
    for (const clause of lower.split(/[,.;]|\band\b|\bthen\b|\balso\b/)) {
      if (/\b(remove|delete|drop|hide|get rid of|take out|without|don'?t need)\b/.test(clause))
        verb = 'remove';
      else if (/\b(move|put .* (?:at|to) the (?:top|bottom)|reorder)\b/.test(clause)) verb = 'move';
      else if (/\b(add|include|insert|put|show|create|need|want|with|bring back)\b/.test(clause))
        verb = 'add';
      if (!verb) continue;
      for (const [re, kind] of SECTION_WORDS) {
        if (!re.test(clause) || kind === 'hero') continue;
        const existing = config.sections.findIndex((s) => s.kind === kind);
        if (verb === 'add' && existing === -1) {
          config.sections.push(buildSection(kind, archetype, config.name, config.location));
          config.sections = sortByReference(config.sections);
          notes.push(`Added a ${SECTION_LABELS[kind].toLowerCase()} section`);
        } else if (verb === 'remove' && existing !== -1) {
          config.sections.splice(existing, 1);
          notes.push(`Removed the ${SECTION_LABELS[kind].toLowerCase()} section`);
        } else if (verb === 'move' && existing !== -1) {
          const [section] = config.sections.splice(existing, 1);
          const toTop = /\b(top|first|up|higher|start)\b/.test(clause);
          config.sections.splice(toTop ? 1 : config.sections.length, 0, section!);
          notes.push(
            `Moved the ${SECTION_LABELS[kind].toLowerCase()} section ${toTop ? 'up near the top' : 'to the end'}`,
          );
        }
        break;
      }
    }
  }

  return { config, notes };
}
