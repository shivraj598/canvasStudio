/**
 * Renders a SiteSpec to static HTML. Two modes:
 * - files:  one HTML document per page (index.html, about.html, ...) for export/deploy
 * - single: every page stacked in one document with in-page anchors, used for live preview
 *
 * Every value that came from the user is escaped; nothing here trusts the spec's strings.
 */
import {
  readableTextColor,
  type DesignStyle,
  type SitePage,
  type SiteSection,
  type SiteSpec,
  type SiteTheme,
} from '@canvas/shared';

type LinkMode = 'files' | 'single';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** Markup that has already been rendered or escaped and must not be escaped again. */
class SafeHtml {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

/** Trusted markup we generate ourselves (CSS, pre-built snippets). Never pass user input. */
const raw = (value: string) => new SafeHtml(value);

function interpolate(value: unknown): string {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(interpolate).join('');
  if (value === undefined || value === null || value === false) return '';
  return escapeHtml(String(value));
}

/**
 * Tagged template that escapes interpolated values. Nested `html` results (and arrays of them)
 * are inserted as-is, so templates compose without double escaping.
 */
function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  return new SafeHtml(strings.reduce((out, str, i) => out + interpolate(values[i - 1]) + str));
}

/** Resolves a spec link (`slug` or `slug#kind`) for the given mode. */
export function resolveHref(href: string, mode: LinkMode): string {
  const [slug = 'index', kind] = href.split('#');
  if (mode === 'single') return `#${kind ? `${slug}-${kind}` : `page-${slug}`}`;
  return `${slug}.html${kind ? `#${slug}-${kind}` : ''}`;
}

const STYLE_TOKENS: Record<
  DesignStyle,
  { radius: string; headingWeight: number; transform: string; spacing: string }
> = {
  modern: { radius: '12px', headingWeight: 700, transform: 'none', spacing: '5rem' },
  classic: { radius: '4px', headingWeight: 600, transform: 'none', spacing: '4.5rem' },
  minimal: { radius: '0', headingWeight: 500, transform: 'none', spacing: '6rem' },
  playful: { radius: '24px', headingWeight: 800, transform: 'none', spacing: '4.5rem' },
  elegant: { radius: '2px', headingWeight: 400, transform: 'none', spacing: '6rem' },
  bold: { radius: '8px', headingWeight: 800, transform: 'uppercase', spacing: '4rem' },
};

export function renderStyles(theme: SiteTheme): string {
  const { palette, fontFamilies } = theme;
  const tokens = STYLE_TOKENS[theme.style];
  return `
:root {
  --color-primary: ${palette.primary};
  --color-on-primary: ${readableTextColor(palette.primary)};
  --color-secondary: ${palette.secondary};
  --color-on-secondary: ${readableTextColor(palette.secondary)};
  --color-accent: ${palette.accent};
  --color-bg: ${palette.background};
  --color-text: ${palette.text};
  --font-heading: '${fontFamilies.heading}', system-ui, sans-serif;
  --font-body: '${fontFamilies.body}', system-ui, sans-serif;
  --radius: ${tokens.radius};
  --section-space: ${tokens.spacing};
}
* { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-body); background: var(--color-bg); color: var(--color-text); line-height: 1.6; }
h1, h2, h3 { font-family: var(--font-heading); font-weight: ${tokens.headingWeight}; text-transform: ${tokens.transform}; line-height: 1.2; margin: 0 0 1rem; }
a { color: var(--color-primary); }
img { max-width: 100%; }
.container { width: min(1100px, 100% - 2rem); margin-inline: auto; }
.site-header { position: sticky; top: 0; z-index: 10; background: var(--color-bg); border-bottom: 1px solid color-mix(in srgb, var(--color-text) 12%, transparent); }
.site-header .container { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-block: 1rem; flex-wrap: wrap; }
.brand { display: flex; align-items: center; gap: .75rem; font-family: var(--font-heading); font-weight: 700; font-size: 1.25rem; color: var(--color-text); text-decoration: none; }
.brand img { height: 40px; width: auto; }
.site-nav { display: flex; gap: 1.25rem; flex-wrap: wrap; }
.site-nav a { color: var(--color-text); text-decoration: none; opacity: .8; }
.site-nav a[aria-current="page"], .site-nav a:hover { color: var(--color-primary); opacity: 1; }
section { padding-block: var(--section-space); }
.page-title { padding-block: 3rem 0; }
.hero { background: var(--color-secondary); color: var(--color-on-secondary); text-align: center; padding-block: calc(var(--section-space) * 1.4); }
.hero h1 { font-size: clamp(2.25rem, 6vw, 4rem); }
.hero p { font-size: 1.25rem; max-width: 40rem; margin: 0 auto 2rem; opacity: .9; }
.button { display: inline-block; background: var(--color-primary); color: var(--color-on-primary); padding: .85rem 1.75rem; border-radius: var(--radius); text-decoration: none; font-weight: 600; border: 0; font: inherit; cursor: pointer; }
.hero .button { background: var(--color-accent); color: ${readableTextColor(palette.accent)}; }
.grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.card { background: color-mix(in srgb, var(--color-text) 4%, var(--color-bg)); border-radius: var(--radius); padding: 1.5rem; }
.card .meta { color: var(--color-primary); font-weight: 600; font-size: .9rem; }
.menu-item { display: flex; justify-content: space-between; gap: 1rem; border-bottom: 1px dashed color-mix(in srgb, var(--color-text) 25%, transparent); padding-block: 1rem; }
.gallery-item { aspect-ratio: 4 / 3; border-radius: var(--radius); background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); display: grid; place-items: center; color: var(--color-on-primary); }
blockquote { margin: 0; font-size: 1.15rem; font-style: italic; }
details { border-bottom: 1px solid color-mix(in srgb, var(--color-text) 15%, transparent); padding-block: 1rem; }
summary { cursor: pointer; font-weight: 600; }
.cta-band { background: var(--color-primary); color: var(--color-on-primary); text-align: center; }
.cta-band .button { background: var(--color-bg); color: var(--color-text); }
form { display: grid; gap: 1rem; max-width: 32rem; }
input, textarea { font: inherit; padding: .75rem; border-radius: var(--radius); border: 1px solid color-mix(in srgb, var(--color-text) 25%, transparent); background: var(--color-bg); color: var(--color-text); }
.contact-list { list-style: none; padding: 0; display: grid; gap: .5rem; }
.note { font-size: .9rem; opacity: .7; }
.site-footer { background: var(--color-secondary); color: var(--color-on-secondary); padding-block: 3rem; }
.site-footer a { color: inherit; }
.site-footer .container { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
`.trim();
}

function fontsLink(theme: SiteTheme): SafeHtml {
  const families = [...new Set([theme.fontFamilies.heading, theme.fontFamilies.body])]
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700;800`)
    .join('&');
  return html`<link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      rel="stylesheet"
      href="${`https://fonts.googleapis.com/css2?${families}&display=swap`}"
    />`;
}

function renderItems(section: SiteSection): SafeHtml[] {
  return (section.items ?? []).map(
    (item) =>
      html`<article class="card">
        ${item.meta ? html`<div class="meta">${item.meta}</div>` : ''}
        <h3>${item.title}</h3>
        ${item.description ? html`<p>${item.description}</p>` : ''}
      </article>`,
  );
}

function renderContactDetails(spec: SiteSpec): SafeHtml {
  const { email, phone, address } = spec.contact;
  const mapUrl =
    address && spec.features.includes('map')
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      : undefined;
  return html`<ul class="contact-list">
    ${email ? html`<li>Email: <a href="${`mailto:${email}`}">${email}</a></li>` : ''}
    ${phone ? html`<li>Phone: <a href="${`tel:${phone.replace(/[^+\d]/g, '')}`}">${phone}</a></li>` : ''}
    ${address ? html`<li>Address: ${address}</li>` : ''}
    ${mapUrl ? html`<li><a href="${mapUrl}" target="_blank" rel="noopener">Open in Google Maps</a></li>` : ''}
  </ul>`;
}

function renderSection(section: SiteSection, spec: SiteSpec, mode: LinkMode): SafeHtml {
  const cta = section.cta
    ? html`<a class="button" href="${resolveHref(section.cta.href, mode)}">${section.cta.label}</a>`
    : '';
  const body = section.body ? html`<p>${section.body}</p>` : '';
  const id = section.id;

  switch (section.kind) {
    case 'hero':
      return html`<section class="hero" id="${id}">
        <div class="container">
          <h1>${section.heading}</h1>
          ${body}${cta}
        </div>
      </section>`;
    case 'text':
      return html`<section id="${id}">
        <div class="container">
          <h2>${section.heading}</h2>
          ${body}
        </div>
      </section>`;
    case 'cards':
    case 'pricing':
      return html`<section id="${id}">
        <div class="container">
          <h2>${section.heading}</h2>
          ${body}
          <div class="grid">${renderItems(section)}</div>
        </div>
      </section>`;
    case 'menu':
      return html`<section id="${id}">
        <div class="container">
          <h2>${section.heading}</h2>
          ${(section.items ?? []).map(
            (item) =>
              html`<div class="menu-item">
                <div>
                  <h3>${item.title}</h3>
                  ${item.description ? html`<p>${item.description}</p>` : ''}
                </div>
                ${item.meta ? html`<strong>${item.meta}</strong>` : ''}
              </div>`,
          )}
        </div>
      </section>`;
    case 'gallery':
      return html`<section id="${id}">
        <div class="container">
          <h2>${section.heading}</h2>
          <div class="grid">
            ${(section.items ?? []).map(
              (item) =>
                html`<figure class="gallery-item" role="img" aria-label="${item.title}">
                  ${item.title}
                </figure>`,
            )}
          </div>
        </div>
      </section>`;
    case 'testimonials':
      return html`<section id="${id}">
        <div class="container">
          <h2>${section.heading}</h2>
          <div class="grid">
            ${(section.items ?? []).map(
              (item) =>
                html`<figure class="card">
                  <blockquote>${item.description ?? ''}</blockquote>
                  <figcaption>— ${item.title}</figcaption>
                </figure>`,
            )}
          </div>
        </div>
      </section>`;
    case 'faq':
      return html`<section id="${id}">
        <div class="container">
          <h2>${section.heading}</h2>
          ${(section.items ?? []).map(
            (item) =>
              html`<details>
                <summary>${item.title}</summary>
                <p>${item.description ?? ''}</p>
              </details>`,
          )}
        </div>
      </section>`;
    case 'contact':
      return html`<section id="${id}">
        <div class="container">
          <h2>${section.heading}</h2>
          ${body} ${renderContactDetails(spec)}
          ${
            spec.features.includes('contact-form')
              ? html`<form aria-label="Contact form" onsubmit="return false">
                  <input name="name" placeholder="Your name" required />
                  <input name="email" type="email" placeholder="Your email" required />
                  <textarea name="message" rows="4" placeholder="Your message" required></textarea>
                  <button class="button" type="submit">Send message</button>
                  <p class="note">
                    The form will start delivering messages once your site is live.
                  </p>
                </form>`
              : ''
          }
        </div>
      </section>`;
    case 'booking':
      return html`<section id="${id}">
        <div class="container">
          <h2>${section.heading}</h2>
          ${body}
          <form aria-label="Booking form" onsubmit="return false">
            <input name="name" placeholder="Your name" required />
            <input name="date" type="date" required />
            <button class="button" type="submit">${section.heading}</button>
          </form>
        </div>
      </section>`;
    case 'cta':
      return html`<section class="cta-band" id="${id}">
        <div class="container">
          <h2>${section.heading}</h2>
          ${body}${cta}
        </div>
      </section>`;
  }
}

function renderHeader(spec: SiteSpec, mode: LinkMode, activeSlug?: string): SafeHtml {
  return html`<header class="site-header">
    <div class="container">
      <a class="brand" href="${resolveHref('index', mode)}">
        ${spec.brand.logoUrl ? html`<img src="${spec.brand.logoUrl}" alt="" />` : ''}
        <span>${spec.brand.name}</span>
      </a>
      <nav class="site-nav" aria-label="Main">
        ${spec.navigation.map(
          (item) =>
            html`<a
              href="${resolveHref(item.href, mode)}"
              ${item.href === activeSlug ? raw(' aria-current="page"') : ''}
              >${item.label}</a
            >`,
        )}
      </nav>
    </div>
  </header>`;
}

function renderFooter(spec: SiteSpec, idPrefix: string): SafeHtml {
  const { instagram, facebook, linkedin } = spec.contact;
  const socials = (
    [
      ['Instagram', instagram],
      ['Facebook', facebook],
      ['LinkedIn', linkedin],
    ] as [string, string | undefined][]
  ).filter((entry): entry is [string, string] => Boolean(entry[1]));
  const year = new Date(spec.generatedAt).getUTCFullYear();

  return html`<footer class="site-footer" id="${`${idPrefix}-footer`}">
    <div class="container">
      <div>
        <strong>${spec.brand.name}</strong>
        ${spec.brand.tagline ? html`<p>${spec.brand.tagline}</p>` : ''}
        <p class="note">© ${year} ${spec.brand.name}</p>
      </div>
      <div>${renderContactDetails(spec)}</div>
      ${
        socials.length
          ? html`<div>
              <ul class="contact-list">
                ${socials.map(
                  ([label, url]) =>
                    html`<li><a href="${url}" target="_blank" rel="noopener">${label}</a></li>`,
                )}
              </ul>
            </div>`
          : ''
      }
      ${
        spec.features.includes('newsletter')
          ? html`<form aria-label="Newsletter" onsubmit="return false">
              <label for="${`${idPrefix}-newsletter`}">Join our newsletter</label>
              <input id="${`${idPrefix}-newsletter`}" type="email" placeholder="you@example.com" />
            </form>`
          : ''
      }
    </div>
  </footer>`;
}

function documentShell(spec: SiteSpec, title: string, body: SafeHtml): string {
  const description = spec.brand.tagline ?? spec.brand.name;
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <meta name="description" content="${description}" />
        <meta name="generator" content="Canvas Studio" />
        ${fontsLink(spec.theme)}
        <style>
          ${raw(renderStyles(spec.theme))}
        </style>
      </head>
      <body>
        ${body}
      </body>
    </html> `.value;
}

function pageTitle(spec: SiteSpec, page: SitePage): string {
  return page.slug === 'index' ? spec.brand.name : `${page.title} — ${spec.brand.name}`;
}

function renderPageBody(spec: SiteSpec, page: SitePage, mode: LinkMode): SafeHtml {
  const startsWithHero = page.sections[0]?.kind === 'hero';
  const title = startsWithHero
    ? ''
    : html`<div class="container page-title"><h1>${page.title}</h1></div>`;
  return html`${title}${page.sections.map((s) => renderSection(s, spec, mode))}`;
}

/** Renders one standalone HTML document for a page (files mode). */
export function renderPage(spec: SiteSpec, page: SitePage): string {
  const body = html`${renderHeader(spec, 'files', page.slug)}
    <main>${renderPageBody(spec, page, 'files')}</main>
    ${renderFooter(spec, page.slug)}`;
  return documentShell(spec, pageTitle(spec, page), body);
}

/** Renders every page to `<slug>.html`, ready to deploy as a static site. */
export function renderSiteFiles(spec: SiteSpec): Record<string, string> {
  return Object.fromEntries(
    spec.pages.map((page) => [`${page.slug}.html`, renderPage(spec, page)]),
  );
}

/** Renders all pages into a single scrollable document with anchor navigation (preview). */
export function renderSinglePage(spec: SiteSpec): string {
  const pages = spec.pages.map(
    (page) =>
      html`<div class="page" id="${`page-${page.slug}`}">
        ${renderPageBody(spec, page, 'single')}
      </div>`,
  );
  const body = html`${renderHeader(spec, 'single')}
    <main>${pages}</main>
    ${renderFooter(spec, 'index')}`;
  return documentShell(spec, spec.brand.name, body);
}
