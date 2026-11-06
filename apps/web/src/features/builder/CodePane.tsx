import { fileLanguage, sortFiles, type ProjectFile } from '@canvas/shared';
import {
  Check,
  ChevronRight,
  Copy,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Palette,
} from 'lucide-react';
import { Highlight, themes } from 'prism-react-renderer';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import type { Turn } from './useBuild';

function FileIcon({ path, className }: { path: string; className?: string }) {
  const lang = fileLanguage(path);
  const Icon =
    lang === 'css' ? Palette : lang === 'json' ? FileJson : lang === 'text' ? FileText : FileCode2;
  const tone =
    lang === 'markup'
      ? 'text-orange-400'
      : lang === 'css'
        ? 'text-sky-400'
        : lang === 'typescript' || lang === 'tsx'
          ? 'text-blue-400'
          : lang === 'javascript' || lang === 'jsx'
            ? 'text-yellow-400'
            : 'text-zinc-400';
  return <Icon className={cn('size-3.5 shrink-0', tone, className)} />;
}

interface TreeNode {
  name: string;
  path: string;
  folders: TreeNode[];
  files: ProjectFile[];
}

/** Nests paths into folders: folders first, then files, each alphabetically (index.html first). */
export function buildTree(files: ProjectFile[]): TreeNode {
  const root: TreeNode = { name: '', path: '', folders: [], files: [] };
  for (const file of files) {
    const parts = file.path.split('/');
    let node = root;
    for (const part of parts.slice(0, -1)) {
      const path = node.path ? `${node.path}/${part}` : part;
      let next = node.folders.find((f) => f.name === part);
      if (!next) {
        next = { name: part, path, folders: [], files: [] };
        node.folders.push(next);
        node.folders.sort((a, b) => a.name.localeCompare(b.name));
      }
      node = next;
    }
    node.files.push(file);
  }
  return root;
}

function FileTree({
  node,
  depth,
  current,
  writing,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  current: string;
  writing: string | null;
  onSelect(path: string): void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const pad = { paddingLeft: `${8 + depth * 12}px` };
  return (
    <ul className="space-y-0.5">
      {node.folders.map((folder) => {
        const open = !collapsed[folder.path];
        return (
          <li key={folder.path}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setCollapsed((c) => ({ ...c, [folder.path]: open }))}
              style={pad}
              className="flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left font-mono text-[12px] text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
            >
              <ChevronRight
                className={cn('size-3 shrink-0 transition-transform', open && 'rotate-90')}
              />
              {open ? (
                <FolderOpen className="size-3.5 shrink-0 text-zinc-500" />
              ) : (
                <Folder className="size-3.5 shrink-0 text-zinc-500" />
              )}
              <span className="truncate">{folder.name}</span>
            </button>
            {open && (
              <FileTree
                node={folder}
                depth={depth + 1}
                current={current}
                writing={writing}
                onSelect={onSelect}
              />
            )}
          </li>
        );
      })}
      {node.files.map((f) => (
        <li key={f.path}>
          <button
            type="button"
            onClick={() => onSelect(f.path)}
            aria-current={f.path === current ? 'true' : undefined}
            title={f.path}
            style={{ paddingLeft: `${8 + depth * 12 + 16}px` }}
            className={cn(
              'flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left font-mono text-[12px] text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200',
              f.path === current && 'bg-white/[0.07] text-zinc-100',
            )}
          >
            <FileIcon path={f.path} />
            <span className="min-w-0 flex-1 truncate">{f.path.split('/').pop()}</span>
            {f.path === writing && (
              <span className="size-1.5 animate-pulse rounded-full bg-sig-2" />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

const PRISM_LANG = {
  markup: 'markup',
  css: 'css',
  javascript: 'javascript',
  jsx: 'jsx',
  typescript: 'typescript',
  tsx: 'tsx',
  json: 'json',
  markdown: 'markdown',
} as const;

function CodeView({ file, streaming }: { file: ProjectFile; streaming: boolean }) {
  const code = useDeferredValue(file.content);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lang = fileLanguage(file.path);

  useEffect(() => {
    if (streaming && scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [code, streaming]);

  return (
    <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-auto">
      <Highlight
        theme={themes.oneDark}
        code={code.replace(/\n$/, '')}
        language={lang in PRISM_LANG ? PRISM_LANG[lang as keyof typeof PRISM_LANG] : 'markup'}
      >
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre className="min-w-max py-3 font-mono text-[12.5px] leading-[1.65]">
            {tokens.map((line, i) => {
              const { key: _lineKey, ...lineProps } = getLineProps({ line });
              void _lineKey;
              return (
                <div key={i} {...lineProps} className="flex px-4 hover:bg-white/[0.03]">
                  <span className="w-10 shrink-0 pr-4 text-right text-zinc-600 select-none">
                    {i + 1}
                  </span>
                  <span>
                    {line.map((token, j) => {
                      const { key: _tokenKey, ...tokenProps } = getTokenProps({ token });
                      void _tokenKey;
                      return <span key={j} {...tokenProps} />;
                    })}
                    {streaming && i === tokens.length - 1 && (
                      <span className="animate-blink ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-sig-2" />
                    )}
                  </span>
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

export function CodePane({ files, turn }: { files: ProjectFile[]; turn: Turn | null }) {
  const sorted = sortFiles(files);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const writing = turn?.activePath ?? null;

  // Follow the file being written, like watching someone type.
  const path = writing ?? (selected && files.some((f) => f.path === selected) ? selected : null);
  const current = sorted.find((f) => f.path === path) ?? sorted[0];

  async function copy() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to the clipboard');
    }
  }

  if (!current) {
    return (
      <div className="grid h-full place-items-center rounded-xl border bg-zinc-950 text-sm text-zinc-500">
        No files yet — they’ll stream in here as Canvas writes them.
      </div>
    );
  }

  const lines = current.content.split('\n').length;
  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-zinc-800 bg-[#1e2127] text-zinc-200 shadow-sm">
      <nav
        aria-label="Files"
        className="scrollbar-thin hidden w-52 shrink-0 overflow-y-auto border-r border-white/5 bg-[#181a1f] p-2 sm:block"
      >
        <p className="px-2 pt-1 pb-2 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
          Files
        </p>
        <FileTree
          node={buildTree(sorted)}
          depth={0}
          current={current.path}
          writing={writing}
          onSelect={setSelected}
        />
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/5 px-3">
          <FileIcon path={current.path} />
          <select
            aria-label="Choose file"
            value={current.path}
            onChange={(e) => setSelected(e.target.value)}
            className="bg-transparent font-mono text-[12px] text-zinc-300 outline-none sm:hidden"
          >
            {sorted.map((f) => (
              <option key={f.path} value={f.path} className="bg-zinc-900">
                {f.path}
              </option>
            ))}
          </select>
          <span className="hidden font-mono text-[12px] text-zinc-300 sm:inline">
            {current.path}
          </span>
          <span className="text-[11px] text-zinc-600">{lines} lines</span>
          {current.path === writing && (
            <span className="text-shimmer text-[11px] font-medium">writing…</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={copy}
            className="ml-auto h-7 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <CodeView file={current} streaming={current.path === writing} />
      </div>
    </div>
  );
}
