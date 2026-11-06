import type {
  BuildEvent,
  ChatMessage,
  EngineInfo,
  FileOperation,
  Project,
  ProjectFile,
} from '@canvas/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useApi } from '../../lib/ApiContext';

export interface LiveFile {
  path: string;
  operation: FileOperation;
  content: string;
  done: boolean;
}

/** The chat turn currently streaming in. */
export interface Turn {
  prompt: string;
  userMessage?: ChatMessage;
  text: string;
  files: LiveFile[];
  /** The file being written right now. */
  activePath: string | null;
}

function reduce(turn: Turn | null, event: BuildEvent<Project>): Turn | null {
  if (!turn) return turn;
  switch (event.type) {
    case 'start':
      return { ...turn, userMessage: event.userMessage };
    case 'text':
      return { ...turn, text: turn.text + event.delta };
    case 'file_start':
      return {
        ...turn,
        activePath: event.path,
        files: [
          ...turn.files.filter((f) => f.path !== event.path),
          { path: event.path, operation: event.operation, content: '', done: false },
        ],
      };
    case 'file_delta':
      return {
        ...turn,
        files: turn.files.map((f) =>
          f.path === event.path ? { ...f, content: f.content + event.delta } : f,
        ),
      };
    case 'file_end':
      return {
        ...turn,
        activePath: turn.activePath === event.path ? null : turn.activePath,
        files: turn.files.map((f) => (f.path === event.path ? { ...f, done: true } : f)),
      };
    default:
      return turn;
  }
}

/**
 * Drives one project's chat: sends prompts, folds the event stream into a live `turn`, and
 * swaps in the saved project when the server is done. A build keeps running on the server if
 * the page is left, so leaving never loses work.
 */
export function useBuild(initial: Project) {
  const api = useApi();
  const [project, setProject] = useState(initial);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [engine, setEngine] = useState<EngineInfo | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const projectId = project.id;

  useEffect(() => {
    let cancelled = false;
    api
      .builderInfo()
      .then((info) => !cancelled && setEngine(info.engine))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api]);

  const reload = useCallback(async () => {
    try {
      setProject(await api.getProject(projectId));
    } catch {
      /* keep what we have */
    }
  }, [api, projectId]);

  const send = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt || controllerRef.current) return;
      const controller = new AbortController();
      controllerRef.current = controller;
      setTurn({ prompt, text: '', files: [], activePath: null });

      let settled = false;
      try {
        await api.streamChat(projectId, prompt, {
          signal: controller.signal,
          onEvent(event) {
            if (event.type === 'start') setEngine(event.engine);
            if (event.type === 'done') {
              settled = true;
              setProject(event.project);
              setTurn(null);
            } else if (event.type === 'error') {
              settled = true;
              if (event.project) setProject(event.project);
              setTurn(null);
              toast.error(event.message);
            } else {
              setTurn((t) => reduce(t, event));
            }
          },
        });
        if (!settled) await reload();
      } catch (error) {
        if (controller.signal.aborted) {
          // The server keeps the files that finished; give it a moment to save them.
          await new Promise((r) => setTimeout(r, 450));
        } else {
          toast.error(error instanceof Error ? error.message : 'Something went wrong');
        }
        await reload();
      } finally {
        controllerRef.current = null;
        setTurn(null);
      }
    },
    [api, projectId, reload],
  );

  const stop = useCallback(() => controllerRef.current?.abort(), []);

  const restore = useCallback(
    async (versionId: string) => {
      try {
        const updated = await api.restoreVersion(projectId, versionId);
        setProject(updated);
        const number = updated.versions.find((v) => v.id === updated.currentVersionId)?.number;
        toast.success(number ? `Restored as version ${number}` : 'Version restored');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not restore that version');
      }
    },
    [api, projectId],
  );

  /** Saved files with in-progress writes layered on top, for the code view. */
  const savedFiles = project.files;
  const turnFiles = turn?.files;
  const liveFiles = useMemo<ProjectFile[]>(() => {
    if (!turnFiles?.length) return savedFiles;
    const map = new Map(savedFiles.map((f) => [f.path, f.content]));
    for (const f of turnFiles) map.set(f.path, f.content);
    return [...map].map(([path, content]) => ({ path, content }));
  }, [savedFiles, turnFiles]);

  return {
    project,
    setProject,
    turn,
    isBuilding: turn !== null,
    engine,
    liveFiles,
    send,
    stop,
    restore,
  };
}

export type BuildController = ReturnType<typeof useBuild>;
