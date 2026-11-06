import type { ChatMessage, FileChange, Project } from '@canvas/shared';
import {
  ArrowUp,
  Check,
  ChevronRight,
  FileMinus,
  FilePen,
  FilePlus,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Square,
  TriangleAlert,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { LogoMark } from '../../components/Logo';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tooltip } from '../../components/ui/tooltip';
import { cn } from '../../lib/utils';
import { FOLLOW_UPS, IDEAS } from './ideas';
import { Markdown } from './Markdown';
import type { BuildController, LiveFile } from './useBuild';

const OP_ICON = { create: FilePlus, update: FilePen, delete: FileMinus } as const;
const OP_TONE = {
  create: 'text-emerald-600',
  update: 'text-amber-600',
  delete: 'text-rose-600',
} as const;

function AssistantAvatar({ busy }: { busy?: boolean }) {
  return (
    <div className="relative mt-0.5 shrink-0">
      <LogoMark className="size-6 rounded-[7px]" />
      {busy && (
        <span className="absolute -inset-1 animate-ping rounded-[9px] bg-sig-2/20" aria-hidden />
      )}
    </div>
  );
}

function FileList({ changes, live }: { changes?: FileChange[]; live?: LiveFile[] }) {
  const [open, setOpen] = useState(true);
  const rows =
    live?.map((f) => ({ path: f.path, operation: f.operation, done: f.done })) ??
    changes?.map((c) => ({ ...c, done: true })) ??
    [];
  if (rows.length === 0) return null;
  const writing = rows.some((r) => !r.done);
  return (
    <div className="mt-3 overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted/60"
        aria-expanded={open}
      >
        <ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
        {writing ? 'Writing files…' : `${rows.length} file${rows.length === 1 ? '' : 's'} changed`}
      </button>
      {open && (
        <ul className="border-t px-1.5 py-1.5">
          {rows.map((row) => {
            const Icon = OP_ICON[row.operation];
            return (
              <li
                key={row.path}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 font-mono text-[12px]"
              >
                <Icon className={cn('size-3.5', OP_TONE[row.operation])} />
                <span className="min-w-0 flex-1 truncate">{row.path}</span>
                {row.done ? (
                  <Check className="size-3.5 text-emerald-600" aria-label="done" />
                ) : (
                  <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function VersionChip({
  message,
  project,
  onRestore,
  disabled,
}: {
  message: ChatMessage;
  project: Project;
  onRestore(id: string): void;
  disabled: boolean;
}) {
  const version = project.versions.find((v) => v.id === message.versionId);
  if (!version) return null;
  const current = version.id === project.currentVersionId;
  return (
    <div className="mt-2.5 flex items-center gap-2">
      <Badge variant={current ? 'accent' : 'outline'}>
        Version {version.number}
        {current && ' · current'}
      </Badge>
      {!current && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs text-muted-foreground"
          disabled={disabled}
          onClick={() => onRestore(version.id)}
        >
          <RotateCcw className="size-3" />
          Restore
        </Button>
      )}
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-muted px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap"
    >
      {text}
    </motion.div>
  );
}

function MessageView({ message, build }: { message: ChatMessage; build: BuildController }) {
  if (message.role === 'user') return <UserBubble text={message.content} />;
  const failed = message.status === 'error';
  return (
    <div className="flex gap-3">
      <AssistantAvatar />
      <div className="min-w-0 flex-1">
        {failed ? (
          <div className="flex gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <Markdown text={message.content} />
          </div>
        ) : (
          <Markdown text={message.content} />
        )}
        {message.status === 'stopped' && (
          <p className="mt-2 text-xs text-muted-foreground">Stopped early.</p>
        )}
        <FileList changes={message.changes} />
        <VersionChip
          message={message}
          project={build.project}
          onRestore={build.restore}
          disabled={build.isBuilding}
        />
      </div>
    </div>
  );
}

function LiveTurn({ build }: { build: BuildController }) {
  const turn = build.turn!;
  const thinking = !turn.text.trim() && turn.files.length === 0;
  return (
    <>
      <UserBubble text={turn.userMessage?.content ?? turn.prompt} />
      <div className="flex gap-3" aria-live="polite">
        <AssistantAvatar busy />
        <div className="min-w-0 flex-1">
          {thinking ? (
            <p className="text-shimmer text-sm font-medium">
              {build.engine?.id === 'claude' ? 'Thinking…' : 'Planning your site…'}
            </p>
          ) : (
            <Markdown text={turn.text} />
          )}
          <FileList live={turn.files} />
          {turn.files.length > 0 && turn.files.every((f) => f.done) && (
            <p className="text-shimmer mt-3 text-xs font-medium">Wrapping up…</p>
          )}
        </div>
      </div>
    </>
  );
}

function EmptyChat({ onPick }: { onPick(prompt: string): void }) {
  return (
    <div className="flex h-full flex-col justify-end pb-2">
      <div className="mb-5 flex items-center gap-2">
        <Sparkles className="size-4 text-sig-2" />
        <h2 className="text-lg font-semibold tracking-tight">What should we build?</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Describe your website in a sentence or two, or start from an idea:
      </p>
      <div className="grid gap-2">
        {IDEAS.slice(0, 4).map((idea) => (
          <button
            key={idea.label}
            type="button"
            onClick={() => onPick(idea.prompt)}
            className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left text-sm transition hover:border-foreground/20 hover:shadow-sm"
          >
            <idea.icon className="size-4 text-muted-foreground" />
            <span className="flex-1">{idea.label}</span>
            <ArrowUp className="size-3.5 rotate-45 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function Composer({
  onSend,
  onStop,
  busy,
  engineLabel,
}: {
  onSend(prompt: string): void;
  onStop(): void;
  busy: boolean;
  engineLabel?: string;
}) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  function submit() {
    if (busy || !value.trim()) return;
    onSend(value);
    setValue('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-2xl border bg-card shadow-sm transition focus-within:border-foreground/25 focus-within:shadow-md"
    >
      <label htmlFor="chat-input" className="sr-only">
        Message Canvas
      </label>
      <textarea
        id="chat-input"
        ref={ref}
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={busy ? 'Canvas is working…' : 'Ask Canvas to change something…'}
        className="scrollbar-thin block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[14px] outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center justify-between px-3 pb-2.5">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {engineLabel && (
            <>
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
              {engineLabel}
            </>
          )}
        </span>
        {busy ? (
          <Tooltip label="Stop">
            <Button
              type="button"
              size="icon-sm"
              className="rounded-full"
              onClick={onStop}
              aria-label="Stop generating"
            >
              <Square className="size-3 fill-current" />
            </Button>
          </Tooltip>
        ) : (
          <Button
            type="submit"
            size="icon-sm"
            className="rounded-full"
            disabled={!value.trim()}
            aria-label="Send"
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </div>
    </form>
  );
}

export function ChatPanel({ build }: { build: BuildController }) {
  const { project, turn, isBuilding } = build;
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const empty = project.messages.length === 0 && !isBuilding;

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [project.messages.length, turn]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-4"
      >
        {empty ? (
          <EmptyChat onPick={build.send} />
        ) : (
          <div className="space-y-6">
            {project.messages.map((m) => (
              <MessageView key={m.id} message={m} build={build} />
            ))}
            {turn && <LiveTurn build={build} />}
          </div>
        )}
      </div>

      <div className="px-3 pb-3">
        <AnimatePresence>
          {!isBuilding && project.files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="scrollbar-thin mb-2 flex gap-1.5 overflow-x-auto pb-1"
            >
              {FOLLOW_UPS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => build.send(s)}
                  className="shrink-0 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground transition hover:border-foreground/20 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <Composer
          onSend={build.send}
          onStop={build.stop}
          busy={isBuilding}
          engineLabel={build.engine?.label}
        />
      </div>
    </div>
  );
}
