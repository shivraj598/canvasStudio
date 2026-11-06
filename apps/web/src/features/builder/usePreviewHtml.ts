import { bundlePreview, type ProjectFile } from '@canvas/shared';
import { useEffect, useState } from 'react';
import { bundleReactPreview, isReactProject } from './reactPreview';

/** The document to show for a project: static HTML as-is, React projects compiled in-browser. */
export async function previewHtmlFor(files: ProjectFile[]): Promise<string> {
  if (files.length === 0) return '';
  if (isReactProject(files)) return (await bundleReactPreview(files)).html;
  return bundlePreview(files);
}

/** Async preview HTML for a set of files; `null` while a React bundle is being prepared. */
export function usePreviewHtml(files: ProjectFile[]): string | null {
  const [state, setState] = useState<{ files: ProjectFile[]; html: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    previewHtmlFor(files).then(
      (html) => !cancelled && setState({ files, html }),
      (error: unknown) =>
        !cancelled &&
        setState({
          files,
          html: `<pre style="padding:16px;color:#b91c1c;font:13px ui-monospace,monospace;white-space:pre-wrap">Preview failed: ${String(error).replace(/</g, '&lt;')}</pre>`,
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [files]);

  // Keep showing the previous document until the new one is ready (no flash).
  return state?.html ?? null;
}
