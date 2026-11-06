/**
 * Turns a project's files into one self-contained HTML document for the preview iframe:
 * local stylesheets and scripts referenced by the entry page are inlined. Remote URLs (CDNs,
 * fonts, images) are left untouched.
 */
import { normalizePath, type ProjectFile } from './builder.js';

/** Tailwind's in-browser build, used by static sites and by the React preview. */
export const TAILWIND_CDN = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.1.11';

export const EMPTY_PREVIEW_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{height:100%;margin:0}body{display:grid;place-items:center;font:500 14px/1.5 system-ui,sans-serif;color:#71717a;background:#fafafa}
</style></head><body><p>Nothing to preview yet.</p></body></html>`;

function isRemote(url: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(url) || /^(data|blob|mailto|tel):/i.test(url);
}

function localPath(url: string): string {
  return normalizePath(url.split(/[?#]/)[0] ?? '');
}

/** Picks the page to show: `index.html` if present, else the first HTML file. */
export function findEntryFile(files: ProjectFile[]): ProjectFile | undefined {
  return (
    files.find((f) => normalizePath(f.path) === 'index.html') ??
    files.find((f) => /\.html?$/i.test(f.path))
  );
}

export function bundlePreview(files: ProjectFile[]): string {
  const entry = findEntryFile(files);
  if (!entry) return EMPTY_PREVIEW_HTML;
  const byPath = new Map(files.map((f) => [normalizePath(f.path), f.content]));
  const lookup = (url: string) => (isRemote(url) ? undefined : byPath.get(localPath(url)));

  let html = entry.content;

  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) return tag;
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const css = href ? lookup(href) : undefined;
    return css === undefined ? tag : `<style>\n${css.replace(/<\/style/gi, '<\\/style')}\n</style>`;
  });

  html = html.replace(
    /<script\b([^>]*?)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (tag, before: string, src: string, after: string) => {
      const js = lookup(src);
      if (js === undefined) return tag;
      const attrs = `${before}${after}`.replace(/\s+/g, ' ').trimEnd();
      return `<script${attrs}>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`;
    },
  );

  return html;
}
