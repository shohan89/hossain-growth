import { useEffect, useState } from 'react';
import { api } from '../../lib/admin/api-client';
import { PERMISSIONS } from '../../lib/auth/permissions';
import Icon from './ui/Icon';
import Spinner from './ui/Spinner';
import type { AdminIconName } from '../../lib/admin/icons';

interface StatCard {
  key: string;
  label: string;
  icon: AdminIconName;
  permission: string;
  endpoint: string;
  params?: Record<string, string>;
  href: string;
}

const STAT_CARDS: StatCard[] = [
  {
    key: 'newLeads',
    label: 'New leads',
    icon: 'users',
    permission: PERMISSIONS.LEADS_READ,
    endpoint: '/api/leads',
    params: { status: 'new' },
    href: '/admin/leads',
  },
  {
    key: 'totalLeads',
    label: 'Total leads',
    icon: 'users',
    permission: PERMISSIONS.LEADS_READ,
    endpoint: '/api/leads',
    href: '/admin/leads',
  },
  {
    key: 'blogPosts',
    label: 'Published posts',
    icon: 'edit',
    permission: PERMISSIONS.BLOG_READ,
    endpoint: '/api/blog-posts',
    params: { status: 'published' },
    href: '/admin/blog',
  },
  {
    key: 'portfolio',
    label: 'Portfolio projects',
    icon: 'image',
    permission: PERMISSIONS.PORTFOLIO_READ,
    endpoint: '/api/portfolio-projects',
    href: '/admin/portfolio',
  },
  {
    key: 'caseStudies',
    label: 'Case studies',
    icon: 'filetext',
    permission: PERMISSIONS.CASE_STUDIES_READ,
    endpoint: '/api/case-studies',
    href: '/admin/case-studies',
  },
  {
    key: 'media',
    label: 'Media assets',
    icon: 'folder',
    permission: PERMISSIONS.MEDIA_READ,
    endpoint: '/api/media',
    href: '/admin/media',
  },
];

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  createdAt: string;
}

export default function OverviewDashboard({ permissions }: { permissions: string[] }) {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const cards = STAT_CARDS.filter((card) => permissions.includes(card.permission));

  useEffect(() => {
    cards.forEach((card) => {
      api
        .list(card.endpoint, { page: 1, pageSize: 1, ...card.params })
        .then((res) => setCounts((prev) => ({ ...prev, [card.key]: res.pagination.total })))
        .catch(() => setCounts((prev) => ({ ...prev, [card.key]: null })));
    });
  }, []);

  useEffect(() => {
    if (!permissions.includes(PERMISSIONS.ACTIVITY_LOGS_READ)) {
      setActivityLoading(false);
      return;
    }
    api
      .list<ActivityLog>('/api/activity-logs', { page: 1, pageSize: 8 })
      .then((res) => setActivity(res.data))
      .finally(() => setActivityLoading(false));
  }, [permissions]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          A snapshot of what's happening across the site.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <a
            key={card.key}
            href={card.href}
            className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-lime-500"
          >
            <span className="bg-ink-900 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lime-400">
              <Icon name={card.icon} className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">
                {counts[card.key] === undefined ? (
                  <Spinner className="h-5 w-5 text-[var(--color-text-muted)]" />
                ) : (
                  (counts[card.key] ?? '—')
                )}
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">{card.label}</p>
            </div>
          </a>
        ))}
      </div>

      {permissions.includes(PERMISSIONS.ACTIVITY_LOGS_READ) && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="font-semibold">Recent activity</h2>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {activityLoading && (
              <div className="flex justify-center py-8">
                <Spinner className="text-[var(--color-text-muted)]" />
              </div>
            )}
            {!activityLoading && activity.length === 0 && (
              <p className="px-5 py-6 text-sm text-[var(--color-text-muted)]">No activity yet.</p>
            )}
            {activity.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>
                  <span className="font-medium">{log.action}</span>
                  {log.entityType && (
                    <span className="text-[var(--color-text-muted)]"> · {log.entityType}</span>
                  )}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
