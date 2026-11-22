import Icon from './Icon';
import Button from './Button';

export default function KeyValueEditor({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  hint?: string;
}) {
  const entries = Object.entries(value);

  function update(index: number, key: string, val: string) {
    const next = [...entries];
    next[index] = [key, val];
    onChange(Object.fromEntries(next));
  }

  function remove(index: number) {
    const next = entries.filter((_, i) => i !== index);
    onChange(Object.fromEntries(next));
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-[var(--color-text)]">{label}</span>
      <div className="flex flex-col gap-2">
        {entries.map(([key, val], index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={key}
              onChange={(e) => update(index, e.target.value, val)}
              placeholder="Label"
              className="w-1/3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)]"
            />
            <input
              value={val}
              onChange={(e) => update(index, key, e.target.value)}
              placeholder="Value"
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)]"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label="Remove"
              className="hover:text-danger rounded-md p-1.5 text-[var(--color-text-muted)]"
            >
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Button
        variant="secondary"
        size="sm"
        type="button"
        className="w-fit"
        onClick={() => onChange({ ...value, '': '' })}
      >
        <Icon name="plus" className="h-3.5 w-3.5" /> Add row
      </Button>
      {hint && <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>}
    </div>
  );
}
