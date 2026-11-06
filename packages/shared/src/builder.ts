/**
 * The chat-driven builder: a project is a set of files that an AI engine edits in response to
 * chat messages. Every build that changes files produces a version that can be restored.
 */
import { z } from 'zod';

export interface ProjectFile {
  /** Relative path, e.g. `index.html` or `assets/app.js`. */
  path: string;
  content: string;
}

export type FileOperation = 'create' | 'update' | 'delete';

export interface FileChange {
  path: string;
  operation: FileOperation;
}

export type ChatRole = 'user' | 'assistant';
export type MessageStatus = 'complete' | 'stopped' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  /** Markdown-ish prose. For assistant messages this excludes the file contents. */
  content: string;
  /** Files written by this assistant turn. */
  changes?: FileChange[];
  /** The version this turn produced, if it changed any files. */
  versionId?: string;
  status?: MessageStatus;
  createdAt: string;
}

export interface ProjectVersion {
  id: string;
  number: number;
  summary: string;
  createdAt: string;
  files: ProjectFile[];
}

export type EngineId = 'claude' | 'nim' | 'local';

export interface EngineInfo {
  id: EngineId;
  label: string;
}

export const MAX_PROMPT_LENGTH = 4000;

export const chatRequestSchema = z.object({
  prompt: z
    .string({ error: 'Tell Canvas what to build' })
    .trim()
    .min(1, 'Tell Canvas what to build')
    .max(MAX_PROMPT_LENGTH, `Keep it under ${MAX_PROMPT_LENGTH} characters`),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * Server-sent events streamed by `POST /projects/:id/chat`. `done` carries the saved project,
 * so the client never has to reconcile its optimistic state by itself.
 */
export type BuildEvent<P = unknown> =
  | { type: 'start'; userMessage: ChatMessage; assistantMessageId: string; engine: EngineInfo }
  | { type: 'text'; delta: string }
  /** The model's thinking, shown while it works and not saved. */
  | { type: 'reasoning'; delta: string }
  | { type: 'file_start'; path: string; operation: FileOperation }
  | { type: 'file_delta'; path: string; delta: string }
  | { type: 'file_end'; path: string }
  | { type: 'done'; project: P }
  | { type: 'error'; message: string; project?: P };

/** Normalises a file path from model output: forward slashes, no leading `./` or `/`. */
export function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, '/')
    .replace(/^(\.\/|\/)+/, '');
}

/** Rejects paths that could escape the project (`..`) or are otherwise unusable. */
export function isSafePath(path: string): boolean {
  const p = normalizePath(path);
  return (
    p.length > 0 &&
    p.length <= 200 &&
    !p.split('/').some((seg) => seg === '..' || seg === '') &&
    /^[\w.\-/ ]+$/.test(p)
  );
}

export type FileLanguage = 'markup' | 'css' | 'javascript' | 'json' | 'markdown' | 'text';

export function fileLanguage(path: string): FileLanguage {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html':
    case 'htm':
    case 'svg':
      return 'markup';
    case 'css':
      return 'css';
    case 'js':
    case 'mjs':
    case 'ts':
    case 'jsx':
    case 'tsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'text';
  }
}

/** Sorts files the way the code view lists them: index.html first, then folders, then a–z. */
export function sortFiles<T extends { path: string }>(files: T[]): T[] {
  const rank = (p: string) => (p === 'index.html' ? 0 : p.includes('/') ? 2 : 1);
  return [...files].sort((a, b) => rank(a.path) - rank(b.path) || a.path.localeCompare(b.path));
}

/** A short version label from the prompt that produced it. */
export function summarizePrompt(prompt: string, max = 64): string {
  const oneLine = prompt.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1).trimEnd()}…` : oneLine;
}
