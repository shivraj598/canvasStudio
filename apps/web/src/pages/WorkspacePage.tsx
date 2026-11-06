import type { Project } from '@canvas/shared';
import {
  ChevronDown,
  Code2,
  Download,
  ExternalLink,
  Eye,
  LayoutGrid,
  MessageSquare,
  Monitor,
  Pencil,
  RotateCw,
  Rocket,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { LogoMark } from '../components/Logo';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Tooltip } from '../components/ui/tooltip';
import { ChatPanel } from '../features/builder/ChatPanel';
import { CodePane } from '../features/builder/CodePane';
import { downloadZip, openPreviewInNewTab } from '../features/builder/files';
import { PreviewPane, type Device } from '../features/builder/PreviewPane';
import { useBuild } from '../features/builder/useBuild';
import { VersionMenu } from '../features/builder/VersionMenu';
import { useApi } from '../lib/ApiContext';
import { cn } from '../lib/utils';

const CHAT_WIDTH_KEY = 'canvas-studio.chat-width';
const MIN_CHAT = 320;
const MAX_CHAT = 640;

function readChatWidth(): number {
  try {
    const n = Number(localStorage.getItem(CHAT_WIDTH_KEY));
    return n >= MIN_CHAT && n <= MAX_CHAT ? n : 420;
  } catch {
    return 420;
  }
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange(v: NoInfer<T>): void;
  options: { value: NoInfer<T>; label: string; icon: typeof Eye; text?: boolean }[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center rounded-lg bg-muted p-0.5">
      {options.map((o) => (
        <Tooltip key={o.value} label={o.label}>
          <button
            type="button"
            aria-pressed={value === o.value}
            aria-label={o.label}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition',
              value === o.value && 'bg-card text-foreground shadow-sm',
            )}
          >
            <o.icon className="size-3.5" />
            {o.text && <span className="hidden sm:inline">{o.label}</span>}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}

function RenameDialog({
  project,
  open,
  onOpenChange,
  onRenamed,
}: {
  project: Project;
  open: boolean;
  onOpenChange(open: boolean): void;
  onRenamed(p: Project): void;
}) {
  const api = useApi();
  const [name, setName] = useState(project.name);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      onRenamed(await api.renameProject(project.id, name.trim()));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not rename');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Rename project</DialogTitle>
        <DialogDescription>This only changes the name in your dashboard.</DialogDescription>
        <form onSubmit={submit} className="space-y-4">
          <Input
            autoFocus
            aria-label="Project name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Workspace({ initial, autoPrompt }: { initial: Project; autoPrompt?: string }) {
  const build = useBuild(initial);
  const { project, turn } = build;
  const navigate = useNavigate();
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [device, setDevice] = useState<Device>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobilePane, setMobilePane] = useState<'chat' | 'preview'>('chat');
  const [chatWidth, setChatWidth] = useState(readChatWidth);
  const [dragging, setDragging] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const autoSent = useRef(false);
  const { send } = build;

  // A prompt typed on the landing page or dashboard starts the first build right away.
  useEffect(() => {
    if (autoSent.current || !autoPrompt || initial.messages.length > 0) return;
    autoSent.current = true;
    navigate('.', { replace: true, state: null });
    void send(autoPrompt);
  }, [autoPrompt, initial.messages.length, send, navigate]);

  useEffect(() => {
    document.title = `${project.name} · Canvas Studio`;
    return () => {
      document.title = 'Canvas Studio';
    };
  }, [project.name]);

  function startDrag(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }
  function onDrag(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setChatWidth(Math.min(MAX_CHAT, Math.max(MIN_CHAT, e.clientX)));
  }
  function endDrag() {
    setDragging(false);
    try {
      localStorage.setItem(CHAT_WIDTH_KEY, String(chatWidth));
    } catch {
      /* ignore */
    }
  }

  const hasFiles = project.files.length > 0;

  return (
    <div
      className={cn(
        'flex h-dvh flex-col bg-background',
        dragging && 'cursor-col-resize select-none',
      )}
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-2.5">
        <div
          className="flex min-w-0 items-center gap-1 md:w-[var(--chat-w)]"
          style={{ ['--chat-w' as string]: `${chatWidth - 10}px` }}
        >
          <Tooltip label="All projects">
            <Link
              to="/projects"
              className="rounded-lg p-1 transition hover:bg-muted"
              aria-label="All projects"
            >
              <LogoMark />
            </Link>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="min-w-0 gap-1 font-semibold">
                <span className="truncate">{project.name}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setRenaming(true)}>
                <Pencil /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!hasFiles}
                onSelect={() => downloadZip(project.files, project.name)}
              >
                <Download /> Download code
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/projects')}>
                <LayoutGrid /> All projects
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="md:hidden">
          <Segmented
            label="Panel"
            value={mobilePane}
            onChange={setMobilePane}
            options={[
              { value: 'chat', label: 'Chat', icon: MessageSquare },
              { value: 'preview', label: 'Preview', icon: Eye },
            ]}
          />
        </div>

        <div className="flex flex-1 items-center gap-2 max-md:hidden">
          <Segmented
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'preview', label: 'Preview', icon: Eye, text: true },
              { value: 'code', label: 'Code', icon: Code2, text: true },
            ]}
          />
          {view === 'preview' && (
            <>
              <Segmented
                label="Device"
                value={device}
                onChange={setDevice}
                options={[
                  { value: 'desktop', label: 'Desktop', icon: Monitor },
                  { value: 'tablet', label: 'Tablet', icon: Tablet },
                  { value: 'mobile', label: 'Mobile', icon: Smartphone },
                ]}
              />
              <Tooltip label="Reload preview">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Reload preview"
                  disabled={!hasFiles}
                  onClick={() => setRefreshKey((k) => k + 1)}
                >
                  <RotateCw />
                </Button>
              </Tooltip>
              <Tooltip label="Open in new tab">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Open in new tab"
                  disabled={!hasFiles}
                  onClick={() => openPreviewInNewTab(project.files, project.name)}
                >
                  <ExternalLink />
                </Button>
              </Tooltip>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <VersionMenu project={project} onRestore={build.restore} disabled={build.isBuilding} />
          <Tooltip label="Download code">
            <Button
              variant="ghost"
              size="icon-sm"
              className="max-sm:hidden"
              aria-label="Download code"
              disabled={!hasFiles}
              onClick={() => downloadZip(project.files, project.name)}
            >
              <Download />
            </Button>
          </Tooltip>
          <Tooltip label="One-click publishing is coming soon">
            <span tabIndex={0}>
              <Button size="sm" variant="signature" disabled className="ml-1 disabled:opacity-70">
                <Rocket /> Publish
              </Button>
            </span>
          </Tooltip>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          style={{ width: chatWidth }}
          className={cn(
            'flex min-h-0 shrink-0 flex-col max-md:!w-full',
            mobilePane !== 'chat' && 'max-md:hidden',
          )}
          aria-label="Chat"
        >
          <ChatPanel build={build} />
        </aside>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat"
          onPointerDown={startDrag}
          onPointerMove={onDrag}
          onPointerUp={endDrag}
          className="group relative hidden w-px shrink-0 cursor-col-resize bg-border md:block"
        >
          <span className="absolute inset-y-0 -left-1.5 w-3 transition group-hover:bg-ring/15" />
        </div>
        <main
          className={cn(
            'min-w-0 flex-1 bg-muted/50 p-2 md:p-3',
            mobilePane !== 'preview' && 'max-md:hidden',
          )}
        >
          {view === 'code' ? (
            <CodePane files={build.liveFiles} turn={turn} />
          ) : (
            <PreviewPane
              files={project.files}
              device={device}
              refreshKey={refreshKey}
              turn={turn}
              name={project.name}
              dragging={dragging}
            />
          )}
        </main>
      </div>

      <RenameDialog
        key={String(renaming)}
        project={project}
        open={renaming}
        onOpenChange={setRenaming}
        onRenamed={(p) => build.setProject((cur) => ({ ...cur, name: p.name }))}
      />
    </div>
  );
}

export function WorkspacePage() {
  const { id = '' } = useParams();
  const api = useApi();
  const location = useLocation();
  const autoPrompt = (location.state as { autoPrompt?: string } | null)?.autoPrompt;
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; project: Project }
  >({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    api
      .getProject(id)
      .then((project) => !cancelled && setState({ status: 'ready', project }))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : 'Could not load this project',
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  if (state.status === 'loading') {
    return (
      <div className="flex h-dvh flex-col" role="status" aria-label="Loading project">
        <div className="flex h-12 items-center gap-3 border-b px-3">
          <Skeleton className="size-7" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex flex-1">
          <div className="w-[420px] space-y-4 p-4 max-md:hidden">
            <Skeleton className="ml-auto h-10 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="flex-1 bg-muted/50 p-3">
            <Skeleton className="h-full w-full bg-card" />
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="grid h-dvh place-items-center px-6">
        <div role="alert" className="max-w-sm text-center">
          <p className="text-lg font-semibold">We couldn’t open this project</p>
          <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
          <Button asChild className="mt-6">
            <Link to="/projects">Back to projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <Workspace key={state.project.id} initial={state.project} autoPrompt={autoPrompt} />;
}
