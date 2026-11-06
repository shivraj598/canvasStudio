import { BUSINESS_CATEGORIES, CATEGORY_INFO } from '@canvas/shared';
import { RadioCards } from '../../../components/Choice';
import { TextField } from '../../../components/Field';
import type { StepProps } from '../types';

const OPTIONS = BUSINESS_CATEGORIES.map((id) => ({
  value: id,
  label: CATEGORY_INFO[id].label,
  description: CATEGORY_INFO[id].description,
}));

export function CategoryStep({ value, onChange, errors }: StepProps<'category'>) {
  return (
    <div className="space-y-5">
      <RadioCards
        name="category"
        legend="Which best describes you?"
        options={OPTIONS}
        value={value.category}
        onChange={(category) => onChange({ ...value, category })}
        error={errors.category}
      />
      {value.category === 'other' && (
        <TextField
          label="Describe your category"
          placeholder="e.g. Pet grooming, Photography studio"
          value={value.customCategory ?? ''}
          onChange={(e) => onChange({ ...value, customCategory: e.target.value })}
          error={errors.customCategory}
          autoFocus
        />
      )}
    </div>
  );
}
