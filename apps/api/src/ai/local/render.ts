/**
 * Renders a SiteConfig to a single, responsive Tailwind page. All text from the config is
 * escaped — the config is user-editable (it is a project file), so nothing in it is trusted.
 */
import { escapeHtml as e } from '../../generator/render.js';
import { icon } from './icons.js';
import { FONTS, type Accent, type Item, type Section, type SiteConfig } from './model.js';

export const TAILWIND_CDN = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.1.11';

/** Accents light enough that buttons need dark text. */
const LIGHT_ACCENTS = new Set<Accent>(['lime', 'amber', 'sky', 'cyan']);

interface Tokens {
  page: string;
  muted: string;
  subtle: string;
  surface: string;
  card: string;
  border: string;
  accentText: string;
  accentSoft: string;
  btn: string;
  btnGhost: string;
  input: string;
  radius: { card: string; btn: string; img: string; pill: string };
  headingWeight: string;
  a: Accent;
}

function tokens(config: SiteConfig): Tokens {
  const { mode, accent: a, radius, font } = config.theme;
  const dark = mode === 'dark';
  const btn =
    a === 'zinc'
      ? dark
        ? 'bg-white text-zinc-900 hover:bg-zinc-200'
        : 'bg-zinc-900 text-white hover:bg-zinc-700'
      : dark || LIGHT_ACCENTS.has(a)
        ? LIGHT_ACCENTS.has(a)
          ? `bg-${a}-400 text-zinc-950 hover:bg-${a}-300`
          : `bg-${a}-500 text-white hover:bg-${a}-400`
        : `bg-${a}-600 text-white hover:bg-${a}-500`;
  return {
    page: dark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900',
    muted: dark ? 'text-zinc-400' : 'text-zinc-600',
    subtle: dark ? 'text-zinc-500' : 'text-zinc-500',
    surface: dark ? 'bg-zinc-900/40' : 'bg-zinc-50',
    card: dark
      ? 'bg-white/[0.03] border border-white/10'
      : 'bg-white border border-zinc-200/80 shadow-sm shadow-zinc-900/5',
    border: dark ? 'border-white/10' : 'border-zinc-200',
    accentText:
      a === 'zinc'
        ? dark
          ? 'text-white'
          : 'text-zinc-900'
        : dark
          ? `text-${a}-400`
          : `text-${a}-600`,
    accentSoft:
      a === 'zinc'
        ? dark
          ? 'bg-white/10 text-white'
          : 'bg-zinc-100 text-zinc-900'
        : dark
          ? `bg-${a}-500/10 text-${a}-300`
          : `bg-${a}-50 text-${a}-700`,
    btn,
    btnGhost: dark
      ? 'border border-white/15 text-white hover:bg-white/5'
      : 'border border-zinc-300 text-zinc-900 hover:bg-zinc-50',
    input: dark
      ? 'bg-white/5 border border-white/10 text-white placeholder:text-zinc-500'
      : 'bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400',
    radius:
      radius === 'sharp'
        ? { card: 'rounded-none', btn: 'rounded-none', img: 'rounded-none', pill: 'rounded-none' }
        : radius === 'round'
          ? { card: 'rounded-3xl', btn: 'rounded-full', img: 'rounded-3xl', pill: 'rounded-full' }
          : { card: 'rounded-2xl', btn: 'rounded-xl', img: 'rounded-2xl', pill: 'rounded-full' },
    headingWeight:
      font === 'display' ? 'font-normal' : font === 'serif' ? 'font-semibold' : 'font-bold',
    a,
  };
}

const CONTAINER = 'mx-auto max-w-6xl px-6';
const SECTION_PAD = 'py-20 sm:py-28';

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'site'
  );
}

function initials(name: string): string {
  return name
    .replace(/^(dr|mr|mrs|ms)\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

function image(config: SiteConfig, key: string, w = 900, h = 700): string {
  return `https://picsum.photos/seed/${slug(config.name)}-${slug(key)}/${w}/${h}`;
}

function button(t: Tokens, label: string, href: string, ghost = false, extra = ''): string {
  return `<a href="${e(href)}" class="inline-flex items-center justify-center gap-2 ${t.radius.btn} px-6 py-3 text-sm font-semibold transition ${ghost ? t.btnGhost : t.btn} ${extra}">${e(label)}${ghost ? '' : icon('arrow', 'h-4 w-4')}</a>`;
}

function heading(t: Tokens, s: Section, center = true): string {
  return `<div class="${center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} reveal">
      ${s.eyebrow ? `<p class="text-sm font-semibold uppercase tracking-widest ${t.accentText}">${e(s.eyebrow)}</p>` : ''}
      <h2 class="font-heading mt-3 text-3xl ${t.headingWeight} tracking-tight sm:text-5xl">${e(s.heading)}</h2>
      ${s.body ? `<p class="mt-4 text-lg ${t.muted}">${e(s.body)}</p>` : ''}
    </div>`;
}

function navLinks(config: SiteConfig): Section[] {
  const skip = new Set(['hero', 'logos', 'cta', 'newsletter', 'stats']);
  return config.sections.filter((s) => !skip.has(s.kind)).slice(0, 5);
}

function navLabel(s: Section): string {
  const labels: Partial<Record<Section['kind'], string>> = {
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
  return labels[s.kind] ?? s.kind;
}

function renderHeader(config: SiteConfig, t: Tokens): string {
  const hero = config.sections.find((s) => s.kind === 'hero');
  const links = navLinks(config);
  const dark = config.theme.mode === 'dark';
  const ctaTarget = config.sections.some((s) => s.kind === 'contact') ? '#contact' : '#';
  return `<header class="sticky top-0 z-50 border-b ${t.border} ${dark ? 'bg-zinc-950/70' : 'bg-white/70'} backdrop-blur-xl">
  <div class="${CONTAINER} flex h-16 items-center justify-between gap-6">
    <a href="#" class="flex items-center gap-2.5">
      <span class="grid h-8 w-8 place-items-center ${t.radius.btn === 'rounded-full' ? 'rounded-full' : t.radius.btn === 'rounded-none' ? 'rounded-none' : 'rounded-lg'} ${t.btn} text-sm font-bold">${e(initials(config.name).charAt(0) || 'S')}</span>
      <span class="font-heading text-lg ${t.headingWeight} tracking-tight">${e(config.name)}</span>
    </a>
    <nav class="hidden items-center gap-8 text-sm md:flex">
      ${links.map((s) => `<a href="#${s.kind}" class="${t.muted} transition hover:opacity-100 hover:${dark ? 'text-white' : 'text-zinc-900'}">${e(navLabel(s))}</a>`).join('\n      ')}
    </nav>
    <div class="flex items-center gap-3">
      ${button(t, hero?.cta ?? 'Get started', ctaTarget, false, 'hidden sm:inline-flex !px-4 !py-2')}
      <details class="relative md:hidden">
        <summary class="list-none cursor-pointer rounded-lg p-2 ${t.muted}" aria-label="Menu"><svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg></summary>
        <div class="absolute right-0 mt-2 w-48 ${t.radius.card === 'rounded-none' ? '' : 'rounded-xl'} ${t.card} ${dark ? 'bg-zinc-900' : 'bg-white'} p-2 shadow-xl">
          ${links.map((s) => `<a href="#${s.kind}" class="block rounded-lg px-3 py-2 text-sm hover:${dark ? 'bg-white/5' : 'bg-zinc-50'}">${e(navLabel(s))}</a>`).join('')}
        </div>
      </details>
    </div>
  </div>
</header>`;
}

function renderHero(config: SiteConfig, s: Section, t: Tokens): string {
  const dark = config.theme.mode === 'dark';
  const a = t.a === 'zinc' ? 'zinc' : t.a;
  const card = config.heroCard;
  return `<section id="hero" class="relative overflow-hidden">
  <div aria-hidden="true" class="pointer-events-none absolute inset-0">
    <div class="absolute -top-40 right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-${a}-${dark ? '500/25' : '300/40'} blur-3xl"></div>
    <div class="absolute -bottom-48 left-[-12rem] h-[30rem] w-[30rem] rounded-full ${dark ? 'bg-fuchsia-500/10' : 'bg-sky-200/50'} blur-3xl"></div>
    <div class="absolute inset-0 hero-grid ${dark ? 'opacity-[0.07]' : 'opacity-[0.35]'}"></div>
  </div>
  <div class="${CONTAINER} relative grid items-center gap-16 py-20 sm:py-28 lg:grid-cols-[1.1fr_0.9fr]">
    <div class="reveal">
      ${s.eyebrow ? `<span class="inline-flex items-center gap-2 ${t.radius.pill} border ${t.border} ${dark ? 'bg-white/5' : 'bg-white/80'} px-3 py-1 text-xs font-medium ${t.muted} backdrop-blur"><span class="h-1.5 w-1.5 rounded-full bg-${a === 'zinc' ? 'emerald' : a}-500"></span>${e(s.eyebrow)}</span>` : ''}
      <h1 class="font-heading mt-6 text-5xl ${t.headingWeight} leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">${e(s.heading)}</h1>
      ${s.body ? `<p class="mt-6 max-w-xl text-lg leading-relaxed ${t.muted}">${e(s.body)}</p>` : ''}
      <div class="mt-10 flex flex-wrap gap-3">
        ${s.cta ? button(t, s.cta, config.sections.some((x) => x.kind === 'contact') ? '#contact' : '#') : ''}
        ${s.secondaryCta ? button(t, s.secondaryCta, `#${config.sections[1]?.kind ?? 'hero'}`, true) : ''}
      </div>
      <div class="mt-10 flex items-center gap-4 text-sm ${t.muted}">
        <div class="flex -space-x-2">
          ${['AL', 'MK', 'JR', 'SP'].map((x, i) => `<span class="grid h-9 w-9 place-items-center rounded-full border-2 ${dark ? 'border-zinc-950' : 'border-white'} bg-gradient-to-br ${['from-rose-400 to-orange-300', 'from-sky-400 to-indigo-400', 'from-emerald-400 to-teal-400', 'from-violet-400 to-fuchsia-400'][i]} text-[11px] font-bold text-white">${x}</span>`).join('')}
        </div>
        <div><span class="text-amber-400">★★★★★</span><br/>Loved by 500+ customers</div>
      </div>
    </div>
    <div class="relative reveal">
      <div class="relative ${t.radius.card} ${t.card} ${dark ? 'bg-zinc-900/70' : 'bg-white/80'} p-6 shadow-2xl ${dark ? 'shadow-black/40' : 'shadow-zinc-900/10'} backdrop-blur-xl">
        <div class="flex items-center justify-between">
          <p class="text-sm ${t.subtle}">${e(card.label)}</p>
          <span class="${t.radius.pill} ${t.accentSoft} px-2.5 py-1 text-xs font-semibold">Live</span>
        </div>
        <p class="font-heading mt-3 text-3xl ${t.headingWeight} tracking-tight">${e(card.title)}</p>
        <div class="mt-6 h-36 overflow-hidden ${t.radius.img} bg-gradient-to-br from-${a}-${dark ? '500/30' : '200'} via-${a}-${dark ? '400/10' : '100'} to-transparent">
          <img src="${e(image(config, 'hero', 900, 400))}" alt="" loading="lazy" class="h-full w-full object-cover opacity-90 mix-blend-${dark ? 'luminosity' : 'multiply'}" onerror="this.remove()"/>
        </div>
        <dl class="mt-6 space-y-3">
          ${card.rows.map(([k, v]) => `<div class="flex items-center justify-between border-b ${t.border} pb-3 text-sm last:border-0"><dt class="${t.muted}">${e(k)}</dt><dd class="font-semibold">${e(v)}</dd></div>`).join('')}
        </dl>
        ${button(t, s.cta ?? 'Get started', '#contact', false, 'mt-6 w-full')}
      </div>
      <div class="absolute -bottom-6 -left-6 hidden items-center gap-3 ${t.radius.card} ${t.card} ${dark ? 'bg-zinc-900' : 'bg-white'} px-4 py-3 shadow-xl sm:flex">
        <span class="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">${icon('check', 'h-4 w-4')}</span>
        <div class="text-sm"><p class="font-semibold">${e(card.badge)}</p><p class="${t.subtle} text-xs">Just now</p></div>
      </div>
    </div>
  </div>
</section>`;
}

function renderLogos(s: Section, t: Tokens): string {
  return `<section id="logos" class="border-y ${t.border} py-12">
  <div class="${CONTAINER}">
    <p class="text-center text-sm ${t.subtle}">${e(s.heading)}</p>
    <div class="mt-8 grid grid-cols-2 items-center gap-8 text-center sm:grid-cols-3 lg:grid-cols-6">
      ${(s.items ?? []).map((i) => `<span class="font-heading text-xl font-semibold tracking-tight ${t.muted} opacity-70">${e(i.title)}</span>`).join('')}
    </div>
  </div>
</section>`;
}

function renderIconGrid(s: Section, t: Tokens, cols: string): string {
  return `<section id="${s.kind}" class="${SECTION_PAD}">
  <div class="${CONTAINER}">
    ${heading(t, s)}
    <div class="mt-16 grid gap-6 ${cols}">
      ${(s.items ?? [])
        .map(
          (
            i,
          ) => `<div class="group ${t.radius.card} ${t.card} p-7 transition hover:-translate-y-1 reveal">
        <span class="grid h-11 w-11 place-items-center ${t.radius.btn === 'rounded-full' ? 'rounded-full' : 'rounded-xl'} ${t.accentSoft}">${icon(i.icon ?? 'check')}</span>
        <h3 class="mt-5 text-lg font-semibold">${e(i.title)}</h3>
        ${i.description ? `<p class="mt-2 text-sm leading-relaxed ${t.muted}">${e(i.description)}</p>` : ''}
        ${i.meta ? `<p class="mt-4 text-sm font-semibold ${t.accentText}">${e(i.meta)}</p>` : ''}
      </div>`,
        )
        .join('\n      ')}
    </div>
  </div>
</section>`;
}

function renderAbout(config: SiteConfig, s: Section, t: Tokens): string {
  return `<section id="about" class="${SECTION_PAD}">
  <div class="${CONTAINER} grid items-center gap-14 lg:grid-cols-2">
    <div class="reveal">
      ${s.eyebrow ? `<p class="text-sm font-semibold uppercase tracking-widest ${t.accentText}">${e(s.eyebrow)}</p>` : ''}
      <h2 class="font-heading mt-3 text-3xl ${t.headingWeight} tracking-tight sm:text-5xl">${e(s.heading)}</h2>
      ${s.body ? `<p class="mt-6 text-lg leading-relaxed ${t.muted}">${e(s.body)}</p>` : ''}
      <ul class="mt-8 space-y-3 text-sm">
        ${['Independent & locally owned', 'Obsessed with quality', 'Here for the long run'].map((x) => `<li class="flex items-center gap-3"><span class="${t.accentText}">${icon('check', 'h-4 w-4')}</span>${x}</li>`).join('')}
      </ul>
    </div>
    <div class="aspect-[4/3] overflow-hidden ${t.radius.img} bg-gradient-to-br from-${t.a}-200 to-${t.a}-500 reveal">
      <img src="${e(image(config, 'about'))}" alt="" loading="lazy" class="h-full w-full object-cover" onerror="this.remove()"/>
    </div>
  </div>
</section>`;
}

function renderMenu(s: Section, t: Tokens): string {
  return `<section id="menu" class="${SECTION_PAD} ${t.surface}">
  <div class="${CONTAINER}">
    ${heading(t, s)}
    <div class="mx-auto mt-16 grid max-w-4xl gap-x-14 gap-y-8 md:grid-cols-2">
      ${(s.items ?? [])
        .map(
          (i) => `<div class="reveal">
        <div class="flex items-baseline gap-3"><h3 class="font-heading text-lg font-semibold">${e(i.title)}</h3><span class="flex-1 border-b border-dotted ${t.border}"></span><span class="font-semibold ${t.accentText}">${e(i.meta ?? '')}</span></div>
        ${i.description ? `<p class="mt-1 text-sm ${t.muted}">${e(i.description)}</p>` : ''}
      </div>`,
        )
        .join('\n      ')}
    </div>
  </div>
</section>`;
}

function renderCards(config: SiteConfig, s: Section, t: Tokens, action: string): string {
  const cols = (s.items?.length ?? 0) >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3';
  return `<section id="${s.kind}" class="${SECTION_PAD}">
  <div class="${CONTAINER}">
    ${heading(t, s)}
    <div class="mt-16 grid gap-6 ${cols}">
      ${(s.items ?? [])
        .map(
          (
            i: Item,
            n: number,
          ) => `<article class="group overflow-hidden ${t.radius.card} ${t.card} reveal">
        <div class="aspect-[4/3] overflow-hidden bg-gradient-to-br from-${t.a}-200 to-${t.a}-400">
          <img src="${e(image(config, `${s.kind}-${n}`, 800, 600))}" alt="${e(i.title)}" loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" onerror="this.remove()"/>
        </div>
        <div class="p-6">
          <div class="flex items-start justify-between gap-3"><h3 class="font-semibold">${e(i.title)}</h3>${i.meta ? `<span class="font-semibold ${t.accentText}">${e(i.meta)}</span>` : ''}</div>
          ${i.description ? `<p class="mt-2 text-sm ${t.muted}">${e(i.description)}</p>` : ''}
          <a href="#contact" class="mt-5 inline-flex items-center gap-1 text-sm font-semibold ${t.accentText}">${e(action)} ${icon('arrow', 'h-4 w-4')}</a>
        </div>
      </article>`,
        )
        .join('\n      ')}
    </div>
  </div>
</section>`;
}

function renderStats(s: Section, t: Tokens): string {
  return `<section id="stats" class="py-16 border-y ${t.border} ${t.surface}">
  <div class="${CONTAINER} grid grid-cols-2 gap-10 text-center lg:grid-cols-4">
    ${(s.items ?? []).map((i) => `<div class="reveal"><p class="font-heading text-4xl ${t.headingWeight} tracking-tight sm:text-5xl ${t.accentText}">${e(i.title)}</p><p class="mt-2 text-sm ${t.muted}">${e(i.description ?? '')}</p></div>`).join('\n    ')}
  </div>
</section>`;
}

function renderGallery(config: SiteConfig, s: Section, t: Tokens): string {
  return `<section id="gallery" class="${SECTION_PAD}">
  <div class="${CONTAINER}">
    ${heading(t, s)}
    <div class="mt-16 grid auto-rows-[200px] grid-cols-2 gap-4 md:grid-cols-3">
      ${(s.items ?? [])
        .map(
          (
            i,
            n,
          ) => `<figure class="group relative overflow-hidden ${t.radius.img} bg-gradient-to-br from-${t.a}-300 to-${t.a}-600 ${n === 0 ? 'row-span-2' : ''} ${n === 3 ? 'md:col-span-2' : ''} reveal">
        <img src="${e(image(config, `gallery-${n}`, 900, n === 0 ? 1200 : 700))}" alt="${e(i.title)}" loading="lazy" class="h-full w-full object-cover transition duration-700 group-hover:scale-110" onerror="this.remove()"/>
        <figcaption class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">${e(i.title)}</figcaption>
      </figure>`,
        )
        .join('\n      ')}
    </div>
  </div>
</section>`;
}

const AVATAR_GRADIENTS = [
  'from-rose-400 to-orange-300',
  'from-sky-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-fuchsia-500',
  'from-amber-300 to-orange-500',
];

function renderTeam(s: Section, t: Tokens): string {
  return `<section id="team" class="${SECTION_PAD} ${t.surface}">
  <div class="${CONTAINER}">
    ${heading(t, s)}
    <div class="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      ${(s.items ?? [])
        .map(
          (i, n) => `<div class="${t.radius.card} ${t.card} p-8 text-center reveal">
        <span class="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[n % AVATAR_GRADIENTS.length]} text-xl font-bold text-white shadow-lg">${e(initials(i.title))}</span>
        <h3 class="mt-5 text-lg font-semibold">${e(i.title)}</h3>
        ${i.meta ? `<p class="text-sm font-medium ${t.accentText}">${e(i.meta)}</p>` : ''}
        ${i.description ? `<p class="mt-3 text-sm ${t.muted}">${e(i.description)}</p>` : ''}
      </div>`,
        )
        .join('\n      ')}
    </div>
  </div>
</section>`;
}

function renderTestimonials(s: Section, t: Tokens): string {
  return `<section id="testimonials" class="${SECTION_PAD}">
  <div class="${CONTAINER}">
    ${heading(t, s)}
    <div class="mt-16 grid gap-6 md:grid-cols-${Math.min(3, Math.max(1, s.items?.length ?? 1))}">
      ${(s.items ?? [])
        .map(
          (i, n) => `<figure class="flex flex-col ${t.radius.card} ${t.card} p-8 reveal">
        <div class="text-amber-400">★★★★★</div>
        <blockquote class="mt-4 flex-1 text-lg leading-relaxed">“${e(i.title)}”</blockquote>
        <figcaption class="mt-6 flex items-center gap-3 text-sm">
          <span class="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[(n + 2) % AVATAR_GRADIENTS.length]} text-xs font-bold text-white">${e(initials(i.meta ?? 'A'))}</span>
          <span class="font-medium">${e(i.meta ?? '')}</span>
        </figcaption>
      </figure>`,
        )
        .join('\n      ')}
    </div>
  </div>
</section>`;
}

function renderPricing(s: Section, t: Tokens, dark: boolean): string {
  return `<section id="pricing" class="${SECTION_PAD} ${t.surface}">
  <div class="${CONTAINER}">
    ${heading(t, s)}
    <div class="mt-16 grid items-start gap-6 lg:grid-cols-${Math.min(3, s.items?.length ?? 3)}">
      ${(s.items ?? [])
        .map((i) => {
          const hl = i.highlight;
          const ring = hl
            ? `ring-2 ring-${t.a === 'zinc' ? (dark ? 'white' : 'zinc-900') : `${t.a}-500`} lg:-translate-y-3`
            : '';
          const price = i.meta ?? '';
          const perMonth =
            /^\$\d/.test(price) && price !== '$0'
              ? `<span class="text-base font-normal ${t.muted}">/mo</span>`
              : '';
          return `<div class="relative ${t.radius.card} ${t.card} ${ring} p-8 reveal">
        ${hl ? `<span class="absolute -top-3 left-8 ${t.radius.pill} ${t.btn} px-3 py-1 text-xs font-semibold">Most popular</span>` : ''}
        <h3 class="text-lg font-semibold">${e(i.title)}</h3>
        <p class="font-heading mt-4 text-5xl ${t.headingWeight} tracking-tight">${e(price)}${perMonth}</p>
        <ul class="mt-8 space-y-3 text-sm">
          ${(i.bullets ?? []).map((b) => `<li class="flex items-start gap-3"><span class="mt-0.5 ${t.accentText}">${icon('check', 'h-4 w-4')}</span><span class="${t.muted}">${e(b)}</span></li>`).join('')}
        </ul>
        ${button(t, 'Get started', '#contact', !hl, 'mt-8 w-full')}
      </div>`;
        })
        .join('\n      ')}
    </div>
  </div>
</section>`;
}

function renderFaq(s: Section, t: Tokens): string {
  return `<section id="faq" class="${SECTION_PAD}">
  <div class="${CONTAINER} max-w-3xl">
    ${heading(t, s)}
    <div class="mt-14 divide-y ${t.border.replace('border-', 'divide-')} border-y ${t.border}">
      ${(s.items ?? [])
        .map(
          (i) => `<details class="group py-6 reveal">
        <summary class="flex cursor-pointer list-none items-center justify-between gap-6 text-left font-semibold">${e(i.title)}<span class="grid h-7 w-7 shrink-0 place-items-center rounded-full ${t.accentSoft} transition group-open:rotate-45">+</span></summary>
        ${i.description ? `<p class="mt-4 leading-relaxed ${t.muted}">${e(i.description)}</p>` : ''}
      </details>`,
        )
        .join('\n      ')}
    </div>
  </div>
</section>`;
}

function renderNewsletter(s: Section, t: Tokens): string {
  return `<section id="newsletter" class="py-20">
  <div class="${CONTAINER}">
    <div class="${t.radius.card} ${t.card} px-8 py-12 text-center sm:px-16 reveal">
      <h2 class="font-heading text-3xl ${t.headingWeight} tracking-tight">${e(s.heading)}</h2>
      ${s.body ? `<p class="mx-auto mt-3 max-w-lg ${t.muted}">${e(s.body)}</p>` : ''}
      <form class="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row" data-thanks="You’re on the list!">
        <input type="email" required placeholder="you@example.com" aria-label="Email address" class="flex-1 ${t.radius.btn} ${t.input} px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-${t.a}-500"/>
        <button class="${t.radius.btn} ${t.btn} px-6 py-3 text-sm font-semibold transition">${e(s.cta ?? 'Subscribe')}</button>
      </form>
    </div>
  </div>
</section>`;
}

function renderCta(s: Section, t: Tokens): string {
  const a = t.a === 'zinc' ? 'zinc' : t.a;
  return `<section id="cta" class="py-20">
  <div class="${CONTAINER}">
    <div class="relative overflow-hidden ${t.radius.card} bg-gradient-to-br from-${a}-${a === 'zinc' ? '800' : '500'} to-${a}-${a === 'zinc' ? '950' : '800'} px-8 py-16 text-center text-white sm:px-16 reveal">
      <div aria-hidden="true" class="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl"></div>
      <h2 class="font-heading relative text-3xl ${t.headingWeight} tracking-tight sm:text-5xl">${e(s.heading)}</h2>
      ${s.body ? `<p class="relative mx-auto mt-4 max-w-xl text-lg text-white/80">${e(s.body)}</p>` : ''}
      <a href="#contact" class="relative mt-10 inline-flex items-center gap-2 ${t.radius.btn} bg-white px-7 py-3.5 text-sm font-semibold text-zinc-900 shadow-lg transition hover:bg-zinc-100">${e(s.cta ?? 'Get started')}${icon('arrow', 'h-4 w-4')}</a>
    </div>
  </div>
</section>`;
}

function renderContact(config: SiteConfig, s: Section, t: Tokens): string {
  const c = config.contact;
  const rows: [Parameters<typeof icon>[0], string | undefined][] = [
    ['mail', c.email],
    ['globe', c.phone],
    ['pin', c.address],
    ['clock', c.hours],
  ];
  return `<section id="contact" class="${SECTION_PAD} ${t.surface}">
  <div class="${CONTAINER} grid gap-14 lg:grid-cols-2">
    <div class="reveal">
      ${s.eyebrow ? `<p class="text-sm font-semibold uppercase tracking-widest ${t.accentText}">${e(s.eyebrow)}</p>` : ''}
      <h2 class="font-heading mt-3 text-3xl ${t.headingWeight} tracking-tight sm:text-5xl">${e(s.heading)}</h2>
      ${s.body ? `<p class="mt-4 text-lg ${t.muted}">${e(s.body)}</p>` : ''}
      <ul class="mt-10 space-y-5">
        ${rows
          .filter(([, v]) => v)
          .map(
            ([ic, v]) =>
              `<li class="flex items-center gap-4"><span class="grid h-11 w-11 place-items-center rounded-xl ${t.accentSoft}">${icon(ic)}</span><span>${e(v!)}</span></li>`,
          )
          .join('\n        ')}
      </ul>
    </div>
    <form class="${t.radius.card} ${t.card} space-y-4 p-8 reveal" data-thanks="Thanks! We’ll be in touch soon.">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block text-sm font-medium">Name<input required class="mt-2 w-full ${t.radius.btn === 'rounded-full' ? 'rounded-xl' : t.radius.btn} ${t.input} px-4 py-3 outline-none focus:ring-2 focus:ring-${t.a}-500" placeholder="Jane Doe"/></label>
        <label class="block text-sm font-medium">Email<input type="email" required class="mt-2 w-full ${t.radius.btn === 'rounded-full' ? 'rounded-xl' : t.radius.btn} ${t.input} px-4 py-3 outline-none focus:ring-2 focus:ring-${t.a}-500" placeholder="jane@example.com"/></label>
      </div>
      <label class="block text-sm font-medium">Message<textarea rows="5" required class="mt-2 w-full ${t.radius.btn === 'rounded-full' ? 'rounded-xl' : t.radius.btn} ${t.input} px-4 py-3 outline-none focus:ring-2 focus:ring-${t.a}-500" placeholder="How can we help?"></textarea></label>
      <button class="w-full ${t.radius.btn} ${t.btn} px-6 py-3.5 text-sm font-semibold transition">${e(s.cta ?? 'Send message')}</button>
    </form>
  </div>
</section>`;
}

function renderFooter(config: SiteConfig, t: Tokens): string {
  return `<footer class="border-t ${t.border} py-12">
  <div class="${CONTAINER} flex flex-col items-center justify-between gap-6 text-sm ${t.muted} md:flex-row">
    <div class="flex items-center gap-2"><span class="font-heading text-base ${t.headingWeight} ${config.theme.mode === 'dark' ? 'text-white' : 'text-zinc-900'}">${e(config.name)}</span><span>·</span><span>© ${new Date().getFullYear()}</span></div>
    <nav class="flex flex-wrap justify-center gap-6">${navLinks(config)
      .map((s) => `<a href="#${s.kind}" class="hover:underline">${e(navLabel(s))}</a>`)
      .join('')}</nav>
  </div>
</footer>`;
}

function renderSection(config: SiteConfig, s: Section, t: Tokens): string {
  const dark = config.theme.mode === 'dark';
  switch (s.kind) {
    case 'hero':
      return renderHero(config, s, t);
    case 'logos':
      return renderLogos(s, t);
    case 'about':
      return renderAbout(config, s, t);
    case 'features':
      return renderIconGrid(
        s,
        t,
        (s.items?.length ?? 0) >= 4 && (s.items?.length ?? 0) !== 6
          ? 'sm:grid-cols-2 lg:grid-cols-4'
          : 'sm:grid-cols-2 lg:grid-cols-3',
      );
    case 'services':
      return renderIconGrid(
        s,
        t,
        (s.items?.length ?? 0) === 4
          ? 'sm:grid-cols-2 lg:grid-cols-4'
          : 'sm:grid-cols-2 lg:grid-cols-3',
      );
    case 'menu':
      return renderMenu(s, t);
    case 'rooms':
      return renderCards(config, s, t, 'Book this room');
    case 'products':
      return renderCards(config, s, t, 'Add to cart');
    case 'stats':
      return renderStats(s, t);
    case 'gallery':
      return renderGallery(config, s, t);
    case 'team':
      return renderTeam(s, t);
    case 'testimonials':
      return renderTestimonials(s, t);
    case 'pricing':
      return renderPricing(s, t, dark);
    case 'faq':
      return renderFaq(s, t);
    case 'newsletter':
      return renderNewsletter(s, t);
    case 'cta':
      return renderCta(s, t);
    case 'contact':
      return renderContact(config, s, t);
  }
}

function fontsHref(config: SiteConfig): string {
  const f = FONTS[config.theme.font];
  const spec = (family: string) =>
    family === 'Instrument Serif'
      ? 'family=Instrument+Serif:ital@0;1'
      : `family=${family.replace(/ /g, '+')}:wght@400;500;600;700;800`;
  const families = [...new Set([f.heading, f.body])].map(spec).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

export function renderSite(config: SiteConfig): string {
  const t = tokens(config);
  const f = FONTS[config.theme.font];
  const hero = config.sections.find((s) => s.kind === 'hero');
  return `<!doctype html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${e(config.name)}</title>
  <meta name="description" content="${e(hero?.body ?? config.tagline)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${fontsHref(config)}" />
  <script>document.documentElement.classList.add('js')</script>
  <script src="${TAILWIND_CDN}"></script>
  <link rel="stylesheet" href="styles.css" />
</head>
<body class="${t.page} antialiased" style="font-family: '${f.body}', ui-sans-serif, system-ui, sans-serif">
${renderHeader(config, t)}
<main>
${config.sections.map((s) => renderSection(config, s, t)).join('\n\n')}
</main>
${renderFooter(config, t)}
<script src="app.js"></script>
</body>
</html>
`;
}

export function renderStyles(config: SiteConfig): string {
  const f = FONTS[config.theme.font];
  const dark = config.theme.mode === 'dark';
  return `/* ${config.name} — custom styles on top of Tailwind */
.font-heading {
  font-family: '${f.heading}', ui-serif, Georgia, serif;
  ${f.heading === 'Instrument Serif' ? 'letter-spacing: -0.01em;' : 'letter-spacing: -0.025em;'}
}

.hero-grid {
  background-image: radial-gradient(${dark ? '#ffffff' : '#a1a1aa'} 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: radial-gradient(ellipse at top, black 30%, transparent 70%);
}

summary::-webkit-details-marker { display: none; }

/* Scroll-reveal: only hidden when JavaScript is running, so content never disappears. */
.js .reveal { opacity: 0; transform: translateY(18px); transition: opacity .7s ease, transform .7s ease; }
.js .reveal.is-visible { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .js .reveal { opacity: 1; transform: none; transition: none; }
}
`;
}

export const APP_JS = `// Scroll-reveal animations and friendly form confirmations.

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12 },
);
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

document.querySelectorAll('form[data-thanks]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const note = document.createElement('p');
    note.textContent = form.dataset.thanks;
    note.className = 'text-sm font-medium text-emerald-500 mt-3';
    form.replaceChildren(note);
  });
});
`;
