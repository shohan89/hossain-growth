import { z } from 'zod';
import { ValidationError } from './errors';

export interface ListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir: 'asc' | 'desc';
  search?: string;
}

const baseListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().min(1).max(64).optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().min(1).max(200).optional(),
});

/**
 * Parses page/pageSize/sortBy/sortDir/search from the query string.
 * `sortBy` is restricted to `allowedSortColumns` to prevent sorting by
 * arbitrary, unindexed, or sensitive columns.
 */
export function parseListQuery(url: URL, allowedSortColumns: readonly string[]): ListQuery {
  const parsed = baseListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues, 'Invalid query parameters.');
  }
  const { sortBy, ...rest } = parsed.data;
  if (sortBy && !allowedSortColumns.includes(sortBy)) {
    throw new ValidationError(
      { allowed: allowedSortColumns },
      `sortBy must be one of: ${allowedSortColumns.join(', ')}`,
    );
  }
  return { ...rest, sortBy };
}

export function offsetFor(query: ListQuery): number {
  return (query.page - 1) * query.pageSize;
}
