import { useEffect, useState } from 'react';
import { api } from '../../../lib/admin/api-client';
import { useResourceList } from '../../../lib/admin/useResourceList';
import Table, { type Column } from '../ui/Table';
import Pagination from '../ui/Pagination';
import FilterSelect from '../ui/FilterSelect';
import EmptyState from '../ui/EmptyState';

interface ActivityLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AssignableUser {
  id: string;
  name: string;
}

const ENTITY_TYPES = [
  'service',
  'service_category',
  'portfolio_project',
  'case_study',
  'blog_post',
  'blog_category',
  'blog_tag',
  'testimonial',
  'media_asset',
  'website_page',
  'navigation_item',
  'redirect',
  'lead',
  'admin_user',
  'role',
  'site_settings',
  'seo_metadata',
];

export default function ActivityLogsManager() {
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const list = useResourceList<ActivityLog>({
    endpoint: '/api/activity-logs',
    pageSize: 30,
    defaultSortBy: 'createdAt',
    filters: filterValues,
  });
  const [users, setUsers] = useState<AssignableUser[]>([]);

  useEffect(() => {
    api
      .get<AssignableUser[]>('/api/admin-users/assignable')
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const userName = (id: string | null) =>
    id ? (users.find((u) => u.id === id)?.name ?? id) : 'System';

  const columns: Column<ActivityLog>[] = [
    {
      key: 'createdAt',
      label: 'When',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    { key: 'action', label: 'Action' },
    { key: 'entityType', label: 'Entity' },
    { key: 'userId', label: 'By', render: (row) => userName(row.userId) },
    { key: 'ipAddress', label: 'IP' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Activity Logs</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          A read-only audit trail of admin actions. Nothing here can be edited or deleted.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          label="Entity type"
          value={filterValues.entityType ?? ''}
          options={ENTITY_TYPES.map((t) => ({ value: t, label: t.replace('_', ' ') }))}
          onChange={(v) => setFilterValues((p) => ({ ...p, entityType: v }))}
        />
        <FilterSelect
          label="User"
          value={filterValues.userId ?? ''}
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          onChange={(v) => setFilterValues((p) => ({ ...p, userId: v }))}
        />
      </div>

      {list.error && (
        <p className="bg-danger-muted text-danger rounded-lg px-4 py-2 text-sm">{list.error}</p>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Table
          columns={columns}
          rows={list.data}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.setSort}
          emptyState={<EmptyState icon="activity" title="No activity recorded yet" />}
        />
        <Pagination pagination={list.pagination} onPageChange={list.setPage} />
      </div>
    </div>
  );
}
