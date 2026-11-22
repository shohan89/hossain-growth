type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const TONES: Record<Tone, string> = {
  success: 'bg-success-muted text-success',
  warning: 'bg-warning-muted text-warning',
  danger: 'bg-danger-muted text-danger',
  info: 'bg-lime-400/20 text-lime-600',
  neutral: 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]',
};

export default function StatusBadge({ tone = 'neutral', label }: { tone?: Tone; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${TONES[tone]}`}
    >
      {label}
    </span>
  );
}
