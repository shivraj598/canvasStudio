/**
 * Runs a Vite + React + TypeScript project inside the preview iframe without a server:
 *
 *  - every .ts/.tsx/.js/.jsx file is compiled in the browser with Sucrase into a CommonJS-style
 *    function, and a tiny module registry wires up relative imports (and the `@/` alias);
 *  - npm packages are loaded from esm.sh through an import map, at the versions in
 *    package.json, with React marked external so the whole app shares one React;
 *  - CSS is handed to Tailwind's in-browser build, so `@import 'tailwindcss'` and `@theme`
 *    tokens work as they do in the real Vite build.
 *
 * Runtime and compile errors are shown inside the preview and posted to the parent window
 * (`canvas:preview-error`), which offers to send them to the AI to fix.
 */
import { TAILWIND_CDN, normalizePath, type ProjectFile } from '@canvas/shared';

export const PREVIEW_ERROR_MESSAGE = 'canvas:preview-error';

const CODE_FILE = /\.(tsx?|jsx?|mjs)$/;
const CONFIG_FILE = /(^|\/)(vite|vitest|tailwind|postcss|eslint|prettier)\.config\.[cm]?[jt]s$/;
const DEFAULT_VERSIONS: Record<string, string> = { react: '19.1.0', 'react-dom': '19.1.0' };

/** A React/TypeScript project rather than a hand-written static page. */
export function isReactProject(files: ProjectFile[]): boolean {
  const pkg = files.find((f) => f.path === 'package.json');
  if (pkg && /"react"\s*:/.test(pkg.content)) return true;
  return files.some((f) => /^src\/.*\.(tsx|jsx)$/.test(f.path));
}

function readVersions(files: ProjectFile[]): Record<string, string> {
  const pkg = files.find((f) => f.path === 'package.json');
  if (!pkg) return {};
  try {
    const json = JSON.parse(pkg.content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return { ...json.devDependencies, ...json.dependencies };
  } catch {
    return {};
  }
}

/** "^19.1.0" → "19.1.0"; anything unusual (tags, ranges, git URLs) → undefined. */
function cleanVersion(range: string | undefined): string | undefined {
  const match = range?.trim().match(/^[\^~>=v]*(\d+(?:\.\d+){0,2}(?:-[\w.]+)?)$/);
  return match?.[1];
}

export function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
}

/** esm.sh URL for a bare import, sharing React across every package. */
export function esmUrl(specifier: string, versions: Record<string, string>): string {
  const name = packageName(specifier);
  const subpath = specifier.slice(name.length);
  const version = cleanVersion(versions[name]) ?? DEFAULT_VERSIONS[name];
  const at = version ? `${name}@${version}` : name;
  if (name === 'react') return `https://esm.sh/${at}${subpath}`;
  if (name === 'react-dom') return `https://esm.sh/${at}${subpath}?external=react`;
  return `https://esm.sh/${at}${subpath}?external=react,react-dom`;
}

/** Keeps inline code from closing the surrounding <script> or <style> element. */
function inlineSafe(text: string, tag: 'script' | 'style'): string {
  return text.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`);
}

function findEntry(files: ProjectFile[], html: string): string | undefined {
  const fromHtml = /<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/i.exec(html)?.[1];
  const candidates = [
    fromHtml && normalizePath(fromHtml),
    'src/main.tsx',
    'src/main.jsx',
    'src/main.ts',
    'src/index.tsx',
    'src/index.jsx',
  ];
  return candidates.find((c) => c && files.some((f) => f.path === c)) ?? undefined;
}

/** Tailwind's browser build already includes Tailwind; package imports can't load. */
function prepareCss(css: string): string {
  return css
    .replace(/^\s*@import\s+(?!url\()["'][^"']+["'][^;]*;\s*$/gm, '')
    .replace(/^\s*@(plugin|config|source)\s+[^;]+;\s*$/gm, '');
}

const DEFAULT_HTML =
  '<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head><body><div id="root"></div></body></html>';

/** The in-iframe loader. Kept as plain JS so it runs without compilation. */
const RUNTIME = `
const report = (error) => {
  const message = String((error && (error.stack || error.message)) || error).slice(0, 4000);
  try { parent.postMessage({ type: '${PREVIEW_ERROR_MESSAGE}', message }, '*'); } catch {}
  let box = document.getElementById('__canvas_error');
  if (!box) {
    box = document.createElement('div');
    box.id = '__canvas_error';
    box.style.cssText = 'position:fixed;inset:auto 12px 12px 12px;z-index:2147483647;max-height:45vh;overflow:auto;padding:14px 16px;border-radius:12px;background:#1f1416;color:#fecaca;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;box-shadow:0 20px 50px rgba(0,0,0,.35);border:1px solid #7f1d1d';
    document.body.appendChild(box);
  }
  box.textContent = '⚠ ' + message;
};
window.addEventListener('error', (e) => report(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => report(e.reason));

const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '.mjs', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];
const cache = {};
const external = {};

function resolvePath(from, spec) {
  let parts;
  if (spec.startsWith('@/')) parts = ['src', ...spec.slice(2).split('/')];
  else if (spec.startsWith('/')) parts = spec.slice(1).split('/');
  else parts = [...from.split('/').slice(0, -1), ...spec.split('/')];
  const out = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p && p !== '.') out.push(p);
  }
  const base = out.join('/');
  for (const ext of extensions) if (MODULES[base + ext]) return base + ext;
  if (ASSETS[base] !== undefined) return base;
  return null;
}

function load(path) {
  if (ASSETS[path] !== undefined) return { __esModule: true, default: ASSETS[path] };
  if (cache[path]) return cache[path].exports;
  const module = { exports: {} };
  cache[path] = module;
  MODULES[path](makeRequire(path), module, module.exports);
  return module.exports;
}

function makeRequire(from) {
  return (spec) => {
    if (/\\.(css|scss|sass|less)$/.test(spec)) return {};
    if (!spec.startsWith('.') && !spec.startsWith('/') && !spec.startsWith('@/')) {
      if (!(spec in external)) throw new Error('The package "' + spec + '" is not available in the preview.');
      return external[spec];
    }
    const path = resolvePath(from, spec);
    if (!path) throw new Error('Cannot find "' + spec + '" (imported from ' + from + ')');
    return load(path);
  };
}

(async () => {
  if (COMPILE_ERROR) return report(COMPILE_ERROR);
  try {
    const loaded = await Promise.all(PACKAGES.map((spec) => import(spec)));
    PACKAGES.forEach((spec, i) => { external[spec] = Object.assign({ __esModule: true }, loaded[i]); });
  } catch (error) {
    return report('Could not load a package from esm.sh: ' + (error && error.message));
  }
  try {
    if (!ENTRY) throw new Error('No entry file found. Add src/main.tsx and reference it from index.html.');
    load(ENTRY);
  } catch (error) {
    report(error);
  }
})();
`;

export interface ReactBundle {
  html: string;
  /** First compile error, if any (the preview also shows it). */
  compileError?: string;
}

export async function bundleReactPreview(files: ProjectFile[]): Promise<ReactBundle> {
  const { transform } = await import('sucrase');
  const versions = readVersions(files);
  const indexHtml = files.find((f) => f.path === 'index.html')?.content ?? DEFAULT_HTML;
  const entry = findEntry(files, indexHtml);

  const modules: string[] = [];
  const packages = new Set<string>();
  let compileError: string | undefined;

  for (const file of files) {
    if (!CODE_FILE.test(file.path) || CONFIG_FILE.test(file.path) || file.path.endsWith('.d.ts'))
      continue;
    const isTs = /\.tsx?$/.test(file.path);
    let code: string;
    try {
      code = transform(file.content, {
        transforms: isTs ? ['typescript', 'jsx', 'imports'] : ['jsx', 'imports'],
        jsxRuntime: 'automatic',
        production: true,
        filePath: file.path,
      }).code;
    } catch (error) {
      compileError ??= `${file.path}: ${error instanceof Error ? error.message : String(error)}`;
      continue;
    }
    for (const m of code.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const spec = m[1]!;
      if (!/^[./]/.test(spec) && !spec.startsWith('@/') && !/\.(css|scss|sass|less)$/.test(spec)) {
        packages.add(spec);
      }
    }
    modules.push(`${JSON.stringify(file.path)}: function (require, module, exports) {\n${code}\n}`);
  }

  const assets: Record<string, string> = {};
  for (const file of files) {
    if (file.path.endsWith('.svg')) {
      assets[file.path] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(file.content)}`;
    }
  }

  const importMap = {
    imports: Object.fromEntries([...packages].map((spec) => [spec, esmUrl(spec, versions)])),
  };
  const css = files
    .filter((f) => f.path.endsWith('.css'))
    .map((f) => prepareCss(f.content))
    .join('\n');

  const boot = [
    `const MODULES = {\n${modules.join(',\n')}\n};`,
    `const ASSETS = ${JSON.stringify(assets)};`,
    `const PACKAGES = ${JSON.stringify([...packages])};`,
    `const ENTRY = ${JSON.stringify(entry ?? null)};`,
    `const COMPILE_ERROR = ${JSON.stringify(compileError ?? null)};`,
    RUNTIME,
  ].join('\n');

  const head = [
    `<script type="importmap">${inlineSafe(JSON.stringify(importMap), 'script')}</script>`,
    `<script src="${TAILWIND_CDN}"></script>`,
    `<style type="text/tailwindcss">\n${inlineSafe(css, 'style')}\n</style>`,
  ].join('\n');
  const body = `<script type="module">\n${inlineSafe(boot, 'script')}\n</script>`;

  let html = indexHtml
    // The project's own entry script and source stylesheets are replaced by the bundle.
    .replace(/<script\b[^>]*\bsrc=["'](?:\.?\/)?src\/[^"']*["'][^>]*>\s*<\/script>/gi, '')
    .replace(/<link\b[^>]*\bhref=["'](?:\.?\/)?src\/[^"']*\.css["'][^>]*>/gi, '');
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${head}\n</head>`) : head + html;
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${body}\n</body>`) : html + body;
  return { html, compileError };
}
