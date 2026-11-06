import type { Project } from '@canvas/shared';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '../components/Button';
import { useApi } from '../lib/ApiContext';

const DEVICES = [
  { id: 'desktop', label: 'Desktop', width: '100%' },
  { id: 'tablet', label: 'Tablet', width: '768px' },
  { id: 'mobile', label: 'Mobile', width: '390px' },
] as const;
type DeviceId = (typeof DEVICES)[number]['id'];

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; project: Project; html: string };

export function PreviewPage() {
  const { id = '' } = useParams();
  const api = useApi();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [device, setDevice] = useState<DeviceId>('desktop');

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getProject(id), api.previewHtml(id)])
      .then(([project, html]) => {
        if (!cancelled) setState({ status: 'ready', project, html });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : 'Could not load the preview',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  if (state.status === 'loading') {
    return (
      <p role="status" className="text-gray-500">
        Loading preview…
      </p>
    );
  }
  if (state.status === 'error') {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{state.message}</p>
        <Link to={`/projects/${id}/build`} className="mt-4 inline-block font-medium text-brand-700">
          Back to the builder
        </Link>
      </div>
    );
  }

  const width = DEVICES.find((d) => d.id === device)!.width;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{state.project.name}</h1>
          <p className="mt-1 text-gray-600">Here is your website. Like it? Publishing is coming soon.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Preview size" className="flex rounded-lg border border-gray-300 bg-white p-0.5">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={device === d.id}
                onClick={() => setDevice(d.id)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  device === d.id ? 'bg-brand-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <Link
            to={`/projects/${id}/build`}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Edit answers
          </Link>
          <Button disabled title="Publishing is coming soon">
            Publish
          </Button>
        </div>
      </div>

      <div className="mt-6 flex justify-center rounded-2xl border border-gray-200 bg-gray-100 p-4">
        <iframe
          title={`Preview of ${state.project.name}`}
          srcDoc={state.html}
          // No allow-scripts / allow-same-origin: the generated site runs fully isolated.
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          style={{ width }}
          className="h-[75vh] max-w-full rounded-lg border border-gray-200 bg-white shadow-sm transition-all"
        />
      </div>
    </div>
  );
}
