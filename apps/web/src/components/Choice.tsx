import type { ReactNode } from 'react';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Extra visual shown inside the card, e.g. colour swatches. */
  adornment?: ReactNode;
}

interface BaseProps<T extends string> {
  legend: string;
  hint?: string;
  error?: string;
  options: ChoiceOption<T>[];
  columns?: 2 | 3 | 4;
}

const COLUMNS = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' };

function cardClass(checked: boolean, disabled?: boolean) {
  return [
    'flex cursor-pointer gap-3 rounded-xl border p-4 text-left transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600',
    checked ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-gray-200 bg-white hover:border-gray-300',
    disabled ? 'cursor-not-allowed opacity-60' : '',
  ].join(' ');
}

function Fieldset<T extends string>({
  legend,
  hint,
  error,
  columns = 3,
  children,
}: Omit<BaseProps<T>, 'options'> & { children: ReactNode }) {
  return (
    <fieldset className="space-y-3" aria-invalid={error ? true : undefined}>
      <legend className="text-sm font-medium">{legend}</legend>
      {hint && <p className="text-sm text-gray-500">{hint}</p>}
      <div className={`grid gap-3 ${COLUMNS[columns]}`}>{children}</div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function OptionBody({ option }: { option: ChoiceOption<string> }) {
  return (
    <span className="flex-1">
      <span className="block text-sm font-medium">{option.label}</span>
      {option.description && (
        <span className="mt-0.5 block text-sm text-gray-500">{option.description}</span>
      )}
      {option.adornment}
    </span>
  );
}

export function RadioCards<T extends string>({
  name,
  value,
  onChange,
  ...props
}: BaseProps<T> & { name: string; value: T | undefined; onChange: (value: T) => void }) {
  return (
    <Fieldset {...props}>
      {props.options.map((option) => (
        <label key={option.value} className={cardClass(value === option.value, option.disabled)}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={option.disabled}
            onChange={() => onChange(option.value)}
            className="mt-0.5 accent-brand-600"
          />
          <OptionBody option={option} />
        </label>
      ))}
    </Fieldset>
  );
}

export function CheckboxCards<T extends string>({
  value,
  onChange,
  ...props
}: BaseProps<T> & { value: readonly T[]; onChange: (value: T[]) => void }) {
  function toggle(option: T, checked: boolean) {
    // Keep the order of `options` so selections are stable regardless of click order.
    const next = new Set(value);
    if (checked) next.add(option);
    else next.delete(option);
    onChange(props.options.map((o) => o.value).filter((v) => next.has(v)));
  }

  return (
    <Fieldset {...props}>
      {props.options.map((option) => {
        const checked = value.includes(option.value);
        return (
          <label key={option.value} className={cardClass(checked, option.disabled)}>
            <input
              type="checkbox"
              value={option.value}
              checked={checked}
              disabled={option.disabled}
              onChange={(e) => toggle(option.value, e.target.checked)}
              className="mt-0.5 accent-brand-600"
            />
            <OptionBody option={option} />
          </label>
        );
      })}
    </Fieldset>
  );
}
