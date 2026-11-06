import type { QuestionnaireDraft, StepId, StepInput } from '@canvas/shared';

/** Form state for a step: like the step's input, but any field may still be empty. */
export type StepFormValue<S extends StepId> = Partial<StepInput<S>>;

export type StepFormValues = { [S in StepId]: StepFormValue<S> };

export interface StepProps<S extends StepId> {
  value: StepFormValue<S>;
  onChange: (value: StepFormValue<S>) => void;
  /** Field errors keyed by dotted path, e.g. `customPalette.primary`. */
  errors: Record<string, string>;
  /** Everything answered so far, for context-aware defaults and copy. */
  draft: QuestionnaireDraft;
}
