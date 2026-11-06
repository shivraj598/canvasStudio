import type { ChatMessage, EngineInfo, ProjectFile } from '@canvas/shared';

export interface EngineInput {
  /** The new user message. */
  prompt: string;
  /** Earlier messages, oldest first (excludes `prompt`). */
  history: ChatMessage[];
  /** The project's current files. */
  files: ProjectFile[];
  signal: AbortSignal;
}

/** Output text in the artifact protocol, or a piece of the model's reasoning (not saved). */
export type EngineChunk = string | { reasoning: string };

/**
 * A build engine streams raw output in the artifact protocol (see `createArtifactParser`):
 * chat prose plus `<canvasArtifact>` / `<canvasAction>` blocks with whole-file contents.
 * Engines never touch storage — the build runner parses, applies and saves.
 */
export interface BuildEngine {
  info: EngineInfo;
  stream(input: EngineInput): AsyncIterable<EngineChunk>;
}

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineError';
  }
}
