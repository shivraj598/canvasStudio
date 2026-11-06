import { STEP_IDS, type Project } from '@canvas/shared';
import { ArrowRight, ClipboardList, Ellipsis, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { PromptBox } from '../components/PromptBox';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Skeleton } from '../components/ui/skeleton';
import { PREVIEW_SANDBOX } from '../features/builder/files';
import { usePreviewHtml } from '../features/builder/usePreviewHtml';
import { useApi } from '../lib/ApiContext';
import { timeAgo } from '../lib/utils';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; projects: Project[] };

/** Where a project card leads: unfinished guided setups go back to the questionnaire. */
export function projectHref(project: Project): string {
  return project.files.length === 0 && project.completedSteps.length > 0
    ? `/projects/${project.id}/build`
    : `/projects/${project.id}`;
}

const THUMB_WIDTH = 1280;

/** The real site, rendered at desktop size and scaled down to fit the card. */
function Thumbnail({ project }: { project: Project }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  const html = usePreviewHtml(project.files);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / THUMB_WIDTH || 0.25);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <iframe
        title={`Thumbnail of ${project.name}`}
        srcDoc={html ?? ''}
        sandbox={PREVIEW_SANDBOX}
        loading="lazy"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 origin-top-left border-0 bg-white"
        style={{ width: THUMB_WIDTH, height: THUMB_WIDTH * 0.625, transform: `scale(${scale})` }}
      />
    </div>
  );
}

function Placeholder({ project }: { project: Project }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-violet-100 via-pink-50 to-orange-100">
      <span className="font-serif text-6xl text-foreground/25 italic">
        {project.name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function StatusBadge({ project }: { project: Project }) {
  if (project.files.length > 0) {
    const current = project.versions.find((v) => v.id === project.currentVersionId);
    return <Badge variant="success">{current ? `v${current.number}` : 'Live preview'}</Badge>;
  }
  if (project.completedSteps.length > 0) {
    return (
      <Badge variant="warning">
        Guided setup · {project.completedSteps.length}/{STEP_IDS.length}
      </Badge>
    );
  }
  return <Badge>Empty</Badge>;
}

function ProjectCard({
  project,
  onDelete,
}: {
  project: Project;
  onDelete(project: Project): void;
}) {
  const navigate = useNavigate();
  const href = projectHref(project);
  return (
    <li className="group relative">
      <Link
        to={href}
        aria-label={`Open ${project.name}`}
        className="block overflow-hidden rounded-2xl border bg-card p-2 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-zinc-900/5"
      >
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border bg-muted">
          {project.files.length > 0 ? (
            <Thumbnail project={project} />
          ) : (
            <Placeholder project={project} />
          )}
        </div>
        <div className="flex items-center gap-2 px-1.5 pt-3 pb-1">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-medium">{project.name}</h2>
            <p className="text-xs text-muted-foreground">Edited {timeAgo(project.updatedAt)}</p>
          </div>
          <StatusBadge project={project} />
        </div>
      </Link>
      <div className="absolute top-4 right-4 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              className="bg-card/90 backdrop-blur"
              aria-label={`Actions for ${project.name}`}
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => navigate(href)}>
              <FolderOpen /> Open
            </DropdownMenuItem>
            {project.completedSteps.length > 0 && (
              <DropdownMenuItem onSelect={() => navigate(`/projects/${project.id}/build`)}>
                <Pencil /> Edit guided answers
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(project)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

export function ProjectsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const { state: auth } = useAuth();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [creating, setCreating] = useState(false);
  // Bumped by "Try again" to re-run the load effect.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .listProjects()
      .then((projects) => {
        if (!cancelled) setState({ status: 'ready', projects });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', message: e instanceof Error ? e.message : 'Failed to load' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, reloadKey]);

  function retry() {
    setState({ status: 'loading' });
    setReloadKey((k) => k + 1);
  }

  async function createFromPrompt(prompt: string) {
    setCreating(true);
    try {
      const project = await api.createProject({ prompt });
      navigate(`/projects/${project.id}`, { state: { autoPrompt: prompt } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create a website');
      setCreating(false);
    }
  }

  async function startGuidedSetup() {
    setCreating(true);
    try {
      const project = await api.createProject();
      navigate(`/projects/${project.id}/build`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create a website');
      setCreating(false);
    }
  }

  async function handleDelete(project: Project) {
    if (!window.confirm(`Delete “${project.name}”? This cannot be undone.`)) return;
    try {
      await api.deleteProject(project.id);
      setState((s) =>
        s.status === 'ready'
          ? { status: 'ready', projects: s.projects.filter((p) => p.id !== project.id) }
          : s,
      );
      toast.success(`Deleted “${project.name}”`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete the website');
    }
  }

  const firstName = auth.user?.name.split(/\s+/)[0];

  return (
    <div>
      <section className="relative overflow-hidden rounded-[2rem] border bg-card px-5 pt-14 pb-10 sm:px-10">
        <div
          aria-hidden
          className="animate-aurora pointer-events-none absolute inset-x-0 -bottom-48 h-96 opacity-60 blur-[70px] [background:radial-gradient(30%_50%_at_30%_50%,rgba(110,86,255,.5),transparent_70%),radial-gradient(30%_50%_at_55%_50%,rgba(225,70,183,.45),transparent_70%),radial-gradient(30%_50%_at_78%_50%,rgba(255,138,61,.5),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            What should we build{firstName ? `, ${firstName}` : ''}
            <span className="text-signature font-serif font-normal italic">?</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Describe a website and Canvas will design and build it while you watch.
          </p>
          <PromptBox className="mt-8" onSubmit={createFromPrompt} busy={creating} />
          <button
            type="button"
            onClick={startGuidedSetup}
            disabled={creating}
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ClipboardList className="size-4" />
            Prefer questions? Use the guided setup
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </section>

      <div className="mt-12 flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Your websites</h2>
        {state.status === 'ready' && state.projects.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {state.projects.length} project{state.projects.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {state.status === 'loading' && (
        <div
          role="status"
          aria-label="Loading your websites"
          className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border bg-card p-2">
              <Skeleton className="aspect-[16/10] w-full" />
              <Skeleton className="mx-1.5 mt-3 mb-1 h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-6"
        >
          <p className="text-destructive">{state.message}</p>
          <Button variant="outline" className="mt-4" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {state.status === 'ready' && state.projects.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed p-12 text-center">
          <FolderOpen className="mx-auto size-5 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">No websites yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe one above — your first site is a sentence away.
          </p>
        </div>
      )}

      {state.status === 'ready' && state.projects.length > 0 && (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {state.projects.map((project) => (
            <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}
