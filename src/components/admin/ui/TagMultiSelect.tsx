import Icon from './Icon';

export interface SelectOption {
  id: string;
  label: string;
}

export default function TagMultiSelect({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: SelectOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  hint?: string;
}) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--color-text)]">{label}</span>
      <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        {options.length === 0 && (
          <span className="text-xs text-[var(--color-text-muted)]">No options yet.</span>
        )}
        {options.map((opt) => {
          const selected = value.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selected
                  ? 'bg-ink-900 text-bone-50'
                  : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {selected && <Icon name="check" className="h-3 w-3" />}
              {opt.label}
            </button>
          );
        })}
      </div>
      {hint && <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>}
    </div>
  );
}
