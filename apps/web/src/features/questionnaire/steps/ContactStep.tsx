import { TextField } from '../../../components/Field';
import type { StepProps } from '../types';

type ContactKey = 'email' | 'phone' | 'address' | 'instagram' | 'facebook' | 'linkedin';

const FIELDS: { key: ContactKey; label: string; type: string; placeholder: string }[] = [
  { key: 'email', label: 'Email', type: 'email', placeholder: 'hello@yourbusiness.com' },
  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+977 1 555 0100' },
  { key: 'address', label: 'Address', type: 'text', placeholder: 'Street, city' },
  { key: 'instagram', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/…' },
  { key: 'facebook', label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/…' },
  { key: 'linkedin', label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/…' },
];

export function ContactStep({ value, onChange, errors }: StepProps<'contact'>) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {FIELDS.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          optional
          type={field.type}
          placeholder={field.placeholder}
          value={value[field.key] ?? ''}
          onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
          error={errors[field.key]}
        />
      ))}
    </div>
  );
}
