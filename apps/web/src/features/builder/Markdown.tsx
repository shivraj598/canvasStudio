/**
 * A tiny Markdown renderer for chat messages: paragraphs, bullet and numbered lists, headings,
 * **bold**, _italic_ and `code`. It produces React elements only — never raw HTML — so model
 * output can't inject markup.
 */
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|_[^_\s][^_]*_|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('**')) out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`'))
      out.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>,
      );
    else out.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = m.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'h'; text: string };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of source.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    const last = blocks.at(-1);
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    if (!line.trim()) {
      blocks.push({ kind: 'p', lines: [] });
    } else if (heading) {
      blocks.push({ kind: 'h', text: heading[1]! });
    } else if (bullet) {
      if (last?.kind === 'ul') last.items.push(bullet[1]!);
      else blocks.push({ kind: 'ul', items: [bullet[1]!] });
    } else if (numbered) {
      if (last?.kind === 'ol') last.items.push(numbered[1]!);
      else blocks.push({ kind: 'ol', items: [numbered[1]!] });
    } else if (last?.kind === 'p') {
      last.lines.push(line);
    } else {
      blocks.push({ kind: 'p', lines: [line] });
    }
  }
  return blocks.filter((b) => b.kind !== 'p' || b.lines.length > 0);
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('space-y-3 text-[14px] leading-relaxed', className)}>
      {parse(text).map((block, i) => {
        const key = `b${i}`;
        if (block.kind === 'h')
          return (
            <p key={key} className="font-semibold">
              {inline(block.text, key)}
            </p>
          );
        if (block.kind === 'p')
          return (
            <p key={key}>
              {block.lines.map((l, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  {inline(l, `${key}-${j}`)}
                </span>
              ))}
            </p>
          );
        const List = block.kind === 'ul' ? 'ul' : 'ol';
        return (
          <List
            key={key}
            className={cn('space-y-1 pl-5', block.kind === 'ul' ? 'list-disc' : 'list-decimal')}
          >
            {block.items.map((item, j) => (
              <li key={j} className="marker:text-muted-foreground">
                {inline(item, `${key}-${j}`)}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
