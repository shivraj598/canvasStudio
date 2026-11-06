/**
 * Runs one chat turn: streams the engine's output through the artifact parser, forwards live
 * events to the client, applies completed files and records a version. Storage is left to the
 * caller, which receives a patch to save.
 */
import { randomUUID } from 'node:crypto';
import {
  createArtifactParser,
  isSafePath,
  sortFiles,
  summarizePrompt,
  type BuildEvent,
  type ChatMessage,
  type FileOperation,
  type MessageStatus,
  type Project,
  type ProjectFile,
  type ProjectVersion,
} from '@canvas/shared';
import type { ProjectPatch } from '../store/types.js';
import { EngineError, type BuildEngine } from './types.js';

export const MAX_FILE_BYTES = 512 * 1024;
export const MAX_FILES = 60;
/** Oldest versions are dropped beyond this many. */
export const MAX_VERSIONS = 50;

export interface RunBuildOptions {
  engine: BuildEngine;
  project: Project;
  prompt: string;
  signal: AbortSignal;
  emit(event: BuildEvent<Project>): void;
  now?: () => Date;
  newId?: () => string;
  onUnexpectedError?(error: unknown): void;
}

export interface BuildResult {
  patch: ProjectPatch;
  status: MessageStatus;
  /** The artifact's title, used to name untitled projects. */
  title?: string;
  error?: string;
}

export function nextVersion(
  project: Pick<Project, 'versions'>,
  files: ProjectFile[],
  summary: string,
  createdAt: string,
  id: string,
): { version: ProjectVersion; versions: ProjectVersion[] } {
  const version: ProjectVersion = {
    id,
    number: (project.versions.at(-1)?.number ?? 0) + 1,
    summary,
    createdAt,
    files,
  };
  return { version, versions: [...project.versions, version].slice(-MAX_VERSIONS) };
}

export async function runBuild({
  engine,
  project,
  prompt,
  signal,
  emit,
  now = () => new Date(),
  newId = randomUUID,
  onUnexpectedError,
}: RunBuildOptions): Promise<BuildResult> {
  const userMessage: ChatMessage = {
    id: newId(),
    role: 'user',
    content: prompt,
    createdAt: now().toISOString(),
  };
  const assistantMessageId = newId();
  emit({ type: 'start', userMessage, assistantMessageId, engine: engine.info });

  const original = new Set(project.files.map((f) => f.path));
  const files = new Map(project.files.map((f) => [f.path, f.content]));
  const changes = new Map<string, FileOperation>();
  const accepted = (path: string) =>
    isSafePath(path) && (files.has(path) || files.size < MAX_FILES);
  let prose = '';
  let title: string | undefined;

  const parser = createArtifactParser({
    onText(delta) {
      prose += delta;
      emit({ type: 'text', delta });
    },
    onArtifactOpen(attrs) {
      title = attrs.title?.trim() || undefined;
    },
    onFileStart(path) {
      if (!accepted(path)) return;
      emit({ type: 'file_start', path, operation: original.has(path) ? 'update' : 'create' });
    },
    onFileDelta(path, delta) {
      if (accepted(path)) emit({ type: 'file_delta', path, delta });
    },
    onFileEnd(path, content) {
      if (!accepted(path) || Buffer.byteLength(content) > MAX_FILE_BYTES) return;
      files.set(path, content);
      changes.set(path, original.has(path) ? 'update' : 'create');
      emit({ type: 'file_end', path });
    },
    onDelete(path) {
      if (!files.has(path)) return;
      files.delete(path);
      if (original.has(path)) changes.set(path, 'delete');
      else changes.delete(path);
    },
  });

  let status: MessageStatus = 'complete';
  let error: string | undefined;
  try {
    for await (const chunk of engine.stream({
      prompt,
      history: project.messages,
      files: project.files,
      signal,
    })) {
      if (signal.aborted) break;
      parser.write(chunk);
    }
    parser.end();
    if (signal.aborted) status = 'stopped';
  } catch (e) {
    parser.end();
    if (signal.aborted) {
      status = 'stopped';
    } else {
      status = 'error';
      error =
        e instanceof EngineError
          ? e.message
          : 'Something went wrong while building. Please try again.';
      if (!(e instanceof EngineError)) onUnexpectedError?.(e);
    }
  }

  const createdAt = now().toISOString();
  // A failed turn changes nothing; a stopped one keeps the files that finished writing.
  const applied = status !== 'error' && changes.size > 0;
  const content =
    prose.trim() ||
    (status === 'stopped' ? 'Stopped.' : status === 'complete' && !applied ? 'Done.' : '');
  const assistantMessage: ChatMessage = {
    id: assistantMessageId,
    role: 'assistant',
    content: error ? `${content ? `${content}\n\n` : ''}${error}` : content,
    status,
    createdAt,
  };

  const patch: ProjectPatch = {};
  if (applied) {
    const nextFiles = sortFiles([...files].map(([path, c]) => ({ path, content: c })));
    const { version, versions } = nextVersion(
      project,
      nextFiles,
      summarizePrompt(prompt),
      createdAt,
      newId(),
    );
    assistantMessage.changes = [...changes].map(([path, operation]) => ({ path, operation }));
    assistantMessage.versionId = version.id;
    Object.assign(patch, {
      files: nextFiles,
      versions,
      currentVersionId: version.id,
      status: 'generated',
    } satisfies ProjectPatch);
  }
  patch.messages = [...project.messages, userMessage, assistantMessage];

  return { patch, status, title, error };
}
