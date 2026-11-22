import type { ReactNode } from 'react';
import Icon from './Icon';
import Spinner from './Spinner';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
}

export default function Table<T extends { id: string }>({
  columns,
  rows,
  loading,
  sortBy,
  sortDir,
  onSort,
  rowActions,
  emptyState,
}: {
  columns: Column<T>[];
  rows: T[];
  loading: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  rowActions?: (row: T) => ReactNode;
  emptyState?: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-xs tracking-wide text-[var(--color-text-muted)] uppercase">
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 font-semibold ${col.className ?? ''}`}>
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSort?.(col.key)}
                    className="inline-flex items-center gap-1 hover:text-[var(--color-text)]"
                  >
                    {col.label}
                    {sortBy === col.key && (
                      <Icon
                        name={sortDir === 'asc' ? 'chevronRight' : 'chevronDown'}
                        className="h-3 w-3"
                      />
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
            {rowActions && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td
                colSpan={columns.length + (rowActions ? 1 : 0)}
                className="px-4 py-12 text-center"
              >
                <Spinner className="mx-auto h-6 w-6 text-[var(--color-text-muted)]" />
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-4 py-6">
                {emptyState ?? (
                  <p className="text-center text-[var(--color-text-muted)]">Nothing here yet.</p>
                )}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-hover)]"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-[var(--color-text)] ${col.className ?? ''}`}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
                {rowActions && <td className="px-4 py-3 text-right">{rowActions(row)}</td>}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
