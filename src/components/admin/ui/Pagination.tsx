import type { Pagination as PaginationData } from '../../../lib/admin/api-client';
import Icon from './Icon';
import Button from './Button';

export default function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationData | null;
  onPageChange: (page: number) => void;
}) {
  if (!pagination || pagination.total === 0) return null;

  const { page, totalPages, total, pageSize } = pagination;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <Icon name="chevronLeft" />
        </Button>
        <span className="text-[var(--color-text)]">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <Icon name="chevronRight" />
        </Button>
      </div>
    </div>
  );
}
