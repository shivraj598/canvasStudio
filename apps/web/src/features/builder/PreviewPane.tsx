import { bundlePreview, type ProjectFile } from '@canvas/shared';
import { Check, Globe, LoaderCircle, Lock, MousePointerClick } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { cn, slugify } from '../../lib/utils';
import { PREVIEW_SANDBOX } from './files';
import type { Turn } from './useBuild';

export const DEVICES = {
  desktop: { label: 'Desktop', width: '100%' },
  tablet: { label: 'Tablet', width: '820px' },
  mobile: { label: 'Mobile', width: '390px' },
} as const;
export type Device = keyof typeof DEVICES;

function BuildingState({ turn }: { turn: Turn | null }) {
  const active = turn?.files.find((f) => !f.done) ?? turn?.files.at(-1);
  const tail = active?.content.split('\n').slice(-14).join('\n') ?? '';
  return (
    <div className="relative grid h-full place-items-center overflow-hidden rounded-xl border bg-card">
      <div aria-hidden className="bg-dots absolute inset-0 opacity-60" />
      <div className="relative flex w-full max-w-md flex-col items-center px-6 text-center">
        <div className="relative size-24">
          <div className="bg-signature animate-float absolute inset-0 rounded-full opacity-80 blur-2xl" />
          <div className="bg-signature animate-float relative size-24 rounded-full shadow-2xl shadow-sig-2/40 [animation-delay:-1.5s]" />
          <div className="absolute inset-0 grid place-items-center">
            <LoaderCircle className="size-7 animate-spin text-white/90" />
          </div>
        </div>
        <p className="text-shimmer mt-8 text-lg font-semibold tracking-tight">
          {active ? `Writing ${active.path}…` : 'Designing your site…'}
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your preview appears here as soon as the first version is ready.
        </p>

        {turn && turn.files.length > 0 && (
          <ul className="mt-6 flex flex-wrap justify-center gap-1.5">
            {turn.files.map((f) => (
              <li
                key={f.path}
                className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 font-mono text-[11px]"
              >
                {f.done ? (
                  <Check className="size-3 text-emerald-600" />
                ) : (
                  <LoaderCircle className="size-3 animate-spin text-muted-foreground" />
                )}
                {f.path}
              </li>
            ))}
          </ul>
        )}

        {tail && (
          <pre
            aria-hidden
            className="mt-6 h-48 w-full overflow-hidden rounded-xl bg-zinc-950 p-4 text-left font-mono text-[10.5px] leading-relaxed text-zinc-400 [mask-image:linear-gradient(to_bottom,transparent,black_40%)]"
          >
            {tail}
            <span className="animate-blink ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 bg-sig-2" />
          </pre>
        )}
      </div>
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="relative grid h-full place-items-center overflow-hidden rounded-xl border bg-card">
      <div aria-hidden className="bg-dots absolute inset-0 opacity-60" />
      <div className="relative max-w-xs text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border bg-card shadow-sm">
          <MousePointerClick className="size-5 text-muted-foreground" />
        </span>
        <p className="mt-4 font-medium">Your website will appear here</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe what you want in the chat and watch it come to life.
        </p>
      </div>
    </div>
  );
}

export function PreviewPane({
  files,
  device,
  refreshKey,
  turn,
  name,
  dragging,
}: {
  files: ProjectFile[];
  device: Device;
  refreshKey: number;
  turn: Turn | null;
  name: string;
  dragging?: boolean;
}) {
  const html = useMemo(() => (files.length ? bundlePreview(files) : ''), [files]);

  if (!html) return turn ? <BuildingState turn={turn} /> : <EmptyPreview />;

  const mobile = device === 'mobile';
  return (
    <div className="bg-dots relative grid h-full place-items-center overflow-auto rounded-xl">
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        style={{ width: DEVICES[device].width }}
        className={cn(
          'relative flex h-full max-w-full flex-col overflow-hidden bg-card',
          mobile
            ? 'max-h-[844px] rounded-[2.4rem] border-[10px] border-zinc-900 shadow-2xl shadow-zinc-900/25'
            : 'rounded-xl border shadow-sm',
        )}
      >
        {!mobile && (
          <div className="flex h-9 shrink-0 items-center gap-3 border-b bg-muted/50 px-3">
            <div className="flex gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="mx-auto flex h-6 w-full max-w-sm items-center justify-center gap-1.5 rounded-md bg-card px-3 text-[11px] text-muted-foreground shadow-xs">
              <Lock className="size-3" />
              <span className="truncate">{slugify(name)}.canvas.site</span>
            </div>
            <Globe className="size-3.5 text-muted-foreground" aria-hidden />
          </div>
        )}
        <iframe
          key={refreshKey}
          title={`Preview of ${name}`}
          srcDoc={html}
          // Scripts may run, but never with our origin: no allow-same-origin.
          sandbox={PREVIEW_SANDBOX}
          className={cn('min-h-0 w-full flex-1 bg-white', dragging && 'pointer-events-none')}
        />
        <AnimatePresence>
          {turn && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute top-12 right-3 flex items-center gap-2 rounded-full border bg-card/95 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur"
              role="status"
            >
              <LoaderCircle className="size-3.5 animate-spin text-sig-2" />
              Updating…
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
