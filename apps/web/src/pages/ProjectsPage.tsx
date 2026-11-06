import { STEP_IDS, type Project } from '@canvas/shared';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { useApi } from '../lib/ApiContext';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; projects: Project[] };

function StatusBadge({ project }: { project: Project }) {
  if (project.status === 'generated') {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        Generated
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      Draft · {project.completedSteps.length}/{STEP_IDS.length} steps
    </span>
  );
}

export function ProjectsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    setState({ status: 'loading' });
    api
      .listProjects()
      .then((projects) => setState({ status: 'ready', projects }))
      .catch((e: unknown) =>
        setState({ status: 'error', message: e instanceof Error ? e.message : 'Failed to load' }),
      );
  }, [api]);

  useEffect(load, [load]);

  async function handleCreate() {
    setCreating(true);
    setActionError(null);
    try {
      const project = await api.createProject();
      navigate(`/projects/${project.id}/build`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not create a website');
      setCreating(false);
    }
  }

  async function handleDelete(project: Project) {
    if (!window.confirm(`Delete “${project.name}”? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await api.deleteProject(project.id);
      setState((s) =>
        s.status === 'ready'
          ? { status: 'ready', projects: s.projects.filter((p) => p.id !== project.id) }
          : s,
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete the website');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your websites</h1>
          <p className="mt-1 text-gray-600">Pick up where you left off, or start something new.</p>
        </div>
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? 'Creating…' : '+ New website'}
        </Button>
      </div>

      {actionError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {actionError}
        </p>
      )}

      {state.status === 'loading' && (
        <p role="status" className="mt-10 text-gray-500">
          Loading your websites…
        </p>
      )}

      {state.status === 'error' && (
        <div role="alert" className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-red-700">{state.message}</p>
          <Button variant="secondary" className="mt-4" onClick={load}>
            Try again
          </Button>
        </div>
      )}

      {state.status === 'ready' && state.projects.length === 0 && (
        <div className="mt-10 rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
          <h2 className="text-lg font-semibold">No websites yet</h2>
          <p className="mt-2 text-gray-600">
            Answer a few questions about your business and we will build your first site.
          </p>
        </div>
      )}

      {state.status === 'ready' && state.projects.length > 0 && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.projects.map((project) => (
            <li
              key={project.id}
              className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{project.name}</h2>
                <StatusBadge project={project} />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Updated {new Date(project.updatedAt).toLocaleDateString()}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  to={`/projects/${project.id}/build`}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  aria-label={`Edit ${project.name}`}
                >
                  {project.status === 'generated' ? 'Edit answers' : 'Continue'}
                </Link>
                {project.status === 'generated' && (
                  <Link
                    to={`/projects/${project.id}/preview`}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
                    aria-label={`Preview ${project.name}`}
                  >
                    Preview
                  </Link>
                )}
                <Button
                  variant="ghost"
                  className="ml-auto text-red-600"
                  onClick={() => handleDelete(project)}
                  aria-label={`Delete ${project.name}`}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
