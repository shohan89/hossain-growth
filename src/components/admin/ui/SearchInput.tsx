import Icon from './Icon';

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full max-w-xs">
      <Icon
        name="search"
        className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pr-3 pl-9 text-sm text-[var(--color-text)] focus-visible:border-lime-500"
      />
    </div>
  );
}
