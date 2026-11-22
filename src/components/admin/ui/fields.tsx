import type { ReactNode } from 'react';

function FieldShell({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--color-text)]">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>}
      {error && <span className="text-danger text-xs">{error}</span>}
    </label>
  );
}

const inputClass =
  'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus-visible:border-lime-500 disabled:opacity-60';

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required,
  hint,
  error,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'url' | 'password' | 'number';
  required?: boolean;
  hint?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className={inputClass}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  required,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
  hint?: string;
  error?: string;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        required={required}
        className={inputClass}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  hint,
  error,
  placeholder = 'Select…',
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={inputClass}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] accent-lime-500"
      />
      <span>
        <span className="font-medium text-[var(--color-text)]">{label}</span>
        {hint && <span className="block text-xs text-[var(--color-text-muted)]">{hint}</span>}
      </span>
    </label>
  );
}

export function DateField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </FieldShell>
  );
}

export { FieldShell, inputClass };
