import { TextAreaField, TextField } from '../../../components/Field';
import type { StepProps } from '../types';

export function AboutStep({ value, onChange, errors, draft }: StepProps<'about'>) {
  const name = draft.brand?.brandName ?? 'your business';
  const description = value.description ?? '';
  return (
    <div className="space-y-5">
      <TextAreaField
        label={`What does ${name} do?`}
        placeholder="e.g. We are a family dental clinic offering check-ups, whitening and braces…"
        hint={`${description.trim().length}/1000 · At least 20 characters. Write naturally — we will polish it.`}
        value={description}
        maxLength={1000}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
        error={errors.description}
        autoFocus
      />
      <TextField
        label="Who are your customers?"
        optional
        placeholder="e.g. Families and young professionals in Kathmandu"
        value={value.audience ?? ''}
        onChange={(e) => onChange({ ...value, audience: e.target.value })}
        error={errors.audience}
      />
      <TextField
        label="What makes you different?"
        optional
        placeholder="e.g. Same-day appointments and a pain-free promise"
        value={value.uniqueValue ?? ''}
        onChange={(e) => onChange({ ...value, uniqueValue: e.target.value })}
        error={errors.uniqueValue}
      />
      <TextField
        label="Where are you based?"
        optional
        placeholder="e.g. Lalitpur, Nepal — or 'Online'"
        value={value.location ?? ''}
        onChange={(e) => onChange({ ...value, location: e.target.value })}
        error={errors.location}
      />
    </div>
  );
}
