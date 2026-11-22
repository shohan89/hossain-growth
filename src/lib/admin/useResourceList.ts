import { useCallback, useEffect, useState } from 'react';
import { api, type Pagination } from './api-client';

export interface UseResourceListOptions {
  endpoint: string;
  pageSize?: number;
  defaultSortBy?: string;
  defaultSortDir?: 'asc' | 'desc';
  /** Extra static query filters, e.g. { status: 'published' }. */
  filters?: Record<string, string | undefined>;
}

export function useResourceList<T>({
  endpoint,
  pageSize = 20,
  defaultSortBy,
  defaultSortDir = 'desc',
  filters = {},
}: UseResourceListOptions) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const filterKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.list<T>(endpoint, {
        page,
        pageSize,
        sortBy,
        sortDir,
        search: search || undefined,
        ...filters,
      });
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
    // `filters` is a new object each render; `filterKey` is its stable
    // JSON-stringified dependency, intentionally used in place of it here.
  }, [endpoint, page, pageSize, sortBy, sortDir, search, filterKey, reloadToken]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 whenever search or filters change.
  useEffect(() => {
    setPage(1);
  }, [search, filterKey]);

  const refetch = useCallback(() => setReloadToken((n) => n + 1), []);

  return {
    data,
    pagination,
    loading,
    error,
    page,
    setPage,
    search,
    setSearch,
    sortBy,
    sortDir,
    setSort: (col: string) => {
      if (sortBy === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(col);
        setSortDir('asc');
      }
    },
    refetch,
  };
}
