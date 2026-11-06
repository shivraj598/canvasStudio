/**
 * Streaming parser for the artifact protocol engines speak (the same idea Bolt uses):
 *
 *   Some prose for the chat…
 *   <canvasArtifact title="Bright Smile Dental">
 *   <canvasAction type="file" path="index.html">
 *   …full file contents…
 *   </canvasAction>
 *   <canvasAction type="delete" path="old.js"></canvasAction>
 *   </canvasArtifact>
 *   More prose…
 *
 * Model output arrives in arbitrary chunks, so tags can be split across `write()` calls. The
 * parser holds back only the minimum text that might still turn into a tag, which keeps the chat
 * and the live code view streaming smoothly.
 */
import { normalizePath } from './builder.js';

export interface ArtifactParserCallbacks {
  /** Prose outside the artifact, for the chat bubble. */
  onText?(delta: string): void;
  onArtifactOpen?(attrs: { title?: string }): void;
  onFileStart?(path: string): void;
  /** Raw content as it streams in (may include the leading newline). */
  onFileDelta?(path: string, delta: string): void;
  /** Final, cleaned file contents. */
  onFileEnd?(path: string, content: string): void;
  onDelete?(path: string): void;
}

const ARTIFACT_OPEN = '<canvasArtifact';
const ARTIFACT_CLOSE = '</canvasArtifact>';
const ACTION_OPEN = '<canvasAction';
const ACTION_CLOSE = '</canvasAction>';

type State =
  | { kind: 'text' }
  | { kind: 'artifact' }
  | { kind: 'action'; type: string; path: string; content: string };

export function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    attrs[m[1]!] = m[3] ?? m[4] ?? '';
  }
  return attrs;
}

/**
 * Length of the longest suffix of `text` that is a prefix of one of `tags`. That suffix might
 * become a tag once more text arrives, so it must not be emitted yet.
 */
function partialTagLength(text: string, tags: string[]): number {
  const lastLt = text.lastIndexOf('<');
  if (lastLt === -1) return 0;
  const tail = text.slice(lastLt);
  return tags.some((tag) => tag.startsWith(tail)) ? tail.length : 0;
}

/** Removes one leading newline and normalises trailing whitespace to a single newline. */
function cleanContent(content: string): string {
  const body = content.replace(/^\r?\n/, '').replace(/\s+$/, '');
  return body.length > 0 ? `${body}\n` : '';
}

export function createArtifactParser(callbacks: ArtifactParserCallbacks) {
  let buffer = '';
  let state: State = { kind: 'text' };

  function process(final: boolean) {
    for (;;) {
      if (state.kind === 'text') {
        const at = buffer.indexOf(ARTIFACT_OPEN);
        if (at === -1) {
          const hold = final ? 0 : partialTagLength(buffer, [ARTIFACT_OPEN]);
          const emit = buffer.slice(0, buffer.length - hold);
          if (emit) callbacks.onText?.(emit);
          buffer = buffer.slice(emit.length);
          return;
        }
        const end = buffer.indexOf('>', at);
        if (end === -1) {
          if (at > 0) callbacks.onText?.(buffer.slice(0, at));
          buffer = buffer.slice(at);
          if (final) buffer = '';
          return;
        }
        if (at > 0) callbacks.onText?.(buffer.slice(0, at));
        const attrs = parseAttributes(buffer.slice(at, end));
        callbacks.onArtifactOpen?.({ title: attrs.title });
        buffer = buffer.slice(end + 1);
        state = { kind: 'artifact' };
        continue;
      }

      if (state.kind === 'artifact') {
        const actionAt = buffer.indexOf(ACTION_OPEN);
        const closeAt = buffer.indexOf(ARTIFACT_CLOSE);
        if (closeAt !== -1 && (actionAt === -1 || closeAt < actionAt)) {
          buffer = buffer.slice(closeAt + ARTIFACT_CLOSE.length);
          state = { kind: 'text' };
          continue;
        }
        if (actionAt === -1) {
          // Whitespace between actions is discarded; keep a possible partial tag.
          const hold = final ? 0 : partialTagLength(buffer, [ACTION_OPEN, ARTIFACT_CLOSE]);
          buffer = buffer.slice(buffer.length - hold);
          return;
        }
        const end = buffer.indexOf('>', actionAt);
        if (end === -1) {
          buffer = final ? '' : buffer.slice(actionAt);
          return;
        }
        const rawTag = buffer.slice(actionAt, end);
        const selfClosing = rawTag.endsWith('/');
        const attrs = parseAttributes(rawTag);
        const path = normalizePath(attrs.path ?? attrs.filePath ?? '');
        const type = attrs.type ?? 'file';
        buffer = buffer.slice(end + 1);
        if (!path) {
          state = selfClosing
            ? { kind: 'artifact' }
            : { kind: 'action', type: 'ignore', path: '', content: '' };
          continue;
        }
        if (type === 'delete') {
          callbacks.onDelete?.(path);
          state = selfClosing
            ? { kind: 'artifact' }
            : { kind: 'action', type: 'delete', path, content: '' };
          continue;
        }
        callbacks.onFileStart?.(path);
        state = { kind: 'action', type: 'file', path, content: '' };
        if (selfClosing) {
          callbacks.onFileEnd?.(path, '');
          state = { kind: 'artifact' };
        }
        continue;
      }

      // Inside an action: stream content until the closing tag.
      const closeAt = buffer.indexOf(ACTION_CLOSE);
      const chunk =
        closeAt !== -1
          ? buffer.slice(0, closeAt)
          : buffer.slice(0, buffer.length - (final ? 0 : partialTagLength(buffer, [ACTION_CLOSE])));
      if (chunk && state.type === 'file') {
        state.content += chunk;
        callbacks.onFileDelta?.(state.path, chunk);
      }
      buffer = buffer.slice(chunk.length);
      if (closeAt === -1) {
        // A stream that ends mid-file leaves the file unfinished; it is not applied.
        if (final) buffer = '';
        return;
      }
      buffer = buffer.slice(ACTION_CLOSE.length);
      if (state.type === 'file') callbacks.onFileEnd?.(state.path, cleanContent(state.content));
      state = { kind: 'artifact' };
    }
  }

  return {
    write(chunk: string) {
      buffer += chunk;
      process(false);
    },
    /** Flushes remaining prose. An unterminated file action is dropped. */
    end() {
      process(true);
    },
  };
}
