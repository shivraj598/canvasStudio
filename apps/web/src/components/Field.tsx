import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  id: string;
  children: React.ReactNode;
}

function FieldShell({ label, hint, error, optional, id, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {optional && <span className="ml-1 font-normal text-gray-500">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  'block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-xs focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none aria-[invalid=true]:border-red-500';

function describedBy(id: string, hint?: string, error?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
};

export function TextField({ label, hint, error, optional, ...props }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <input
        id={id}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
};

export function TextAreaField({ label, hint, error, optional, ...props }: TextAreaFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        id={id}
        rows={4}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      />
    </FieldShell>
  );
}
