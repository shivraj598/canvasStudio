import { TextField } from '../../../components/Field';
import type { StepProps } from '../types';

export function BrandStep({ value, onChange, errors }: StepProps<'brand'>) {
  return (
    <div className="space-y-5">
      <TextField
        label="Brand or business name"
        placeholder="e.g. Sunrise Dental Clinic"
        value={value.brandName ?? ''}
        onChange={(e) => onChange({ ...value, brandName: e.target.value })}
        error={errors.brandName}
        autoFocus
      />
      <TextField
        label="Tagline"
        optional
        placeholder="e.g. Gentle care for the whole family"
        hint="A short line that sums up what you do."
        value={value.tagline ?? ''}
        onChange={(e) => onChange({ ...value, tagline: e.target.value })}
        error={errors.tagline}
      />
      <TextField
        label="Logo URL"
        optional
        type="url"
        placeholder="https://…/logo.png"
        hint="Paste a link to your logo for now — uploads are coming soon."
        value={value.logoUrl ?? ''}
        onChange={(e) => onChange({ ...value, logoUrl: e.target.value })}
        error={errors.logoUrl}
      />
      {value.logoUrl && !errors.logoUrl && /^https?:\/\//.test(value.logoUrl) && (
        <img
          src={value.logoUrl}
          alt="Logo preview"
          className="h-16 w-auto rounded border border-gray-200 bg-white p-2"
        />
      )}
    </div>
  );
}
