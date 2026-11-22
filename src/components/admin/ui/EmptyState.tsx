import type { ReactNode } from 'react';
import type { AdminIconName } from '../../../lib/admin/icons';
import Icon from './Icon';

export default function EmptyState({
  icon = 'folder',
  title,
  description,
  action,
}: {
  icon?: AdminIconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="font-semibold text-[var(--color-text)]">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>
      )}
      {action}
    </div>
  );
}
