import { GOAL_LABELS, WEBSITE_GOALS } from '@canvas/shared';
import { CheckboxCards } from '../../../components/Choice';
import { TextAreaField } from '../../../components/Field';
import type { StepProps } from '../types';

const OPTIONS = WEBSITE_GOALS.map((id) => ({ value: id, label: GOAL_LABELS[id] }));

export function GoalsStep({ value, onChange, errors }: StepProps<'goals'>) {
  return (
    <div className="space-y-6">
      <CheckboxCards
        legend="What should your website do for you?"
        hint="Pick as many as you like."
        options={OPTIONS}
        value={value.goals ?? []}
        onChange={(goals) => onChange({ ...value, goals })}
        error={errors.goals}
        columns={2}
      />
      <TextAreaField
        label="Anything else you expect from your website?"
        optional
        placeholder="e.g. Patients should be able to see our opening hours and book without calling."
        value={value.expectations ?? ''}
        onChange={(e) => onChange({ ...value, expectations: e.target.value })}
        error={errors.expectations}
      />
      <TextAreaField
        label="Websites you like"
        optional
        rows={2}
        placeholder="Paste links or describe sites whose look you love."
        value={value.inspiration ?? ''}
        onChange={(e) => onChange({ ...value, inspiration: e.target.value })}
        error={errors.inspiration}
      />
    </div>
  );
}
