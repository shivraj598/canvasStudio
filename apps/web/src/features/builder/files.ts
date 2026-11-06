import { bundlePreview, type ProjectFile } from '@canvas/shared';
import { strToU8, zipSync } from 'fflate';
import { slugify } from '../../lib/utils';

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/** Same isolation as the in-app preview: the site runs in an opaque-origin sandbox. */
export const PREVIEW_SANDBOX = 'allow-scripts allow-forms allow-popups allow-modals';

/**
 * Opens the site full-screen in a new tab. The generated site is never given our origin: it
 * runs inside a sandboxed iframe on a wrapper page that contains no other code.
 */
export function openPreviewInNewTab(files: ProjectFile[], title: string) {
  const wrapper = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeAttribute(title)}</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}</style></head><body><iframe sandbox="${PREVIEW_SANDBOX}" srcdoc="${escapeAttribute(bundlePreview(files))}"></iframe></body></html>`;
  const url = URL.createObjectURL(new Blob([wrapper], { type: 'text/html' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadZip(files: ProjectFile[], name: string) {
  const zip = zipSync(Object.fromEntries(files.map((f) => [f.path, strToU8(f.content)])));
  const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(name)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
