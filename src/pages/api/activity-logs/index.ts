import type { APIRoute } from 'astro';
import { and, desc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { activityLogs } from '../../../lib/db/schema';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonList, withErrorHandling } from '../../../lib/http/response';
import { parseListQuery, offsetFor } from '../../../lib/http/pagination';

export const prerender = false;

const SORTABLE = ['createdAt'] as const;

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.ACTIVITY_LOGS_READ);
  const query = parseListQuery(ctx.url, SORTABLE);
  const db = drizzle(env.DB, { schema });

  const clauses = [];
  const entityType = ctx.url.searchParams.get('entityType');
  if (entityType) clauses.push(eq(activityLogs.entityType, entityType));
  const userId = ctx.url.searchParams.get('userId');
  if (userId) clauses.push(eq(activityLogs.userId, userId));
  const where = clauses.length ? and(...clauses) : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(activityLogs)
      .where(where)
      .orderBy(desc(activityLogs.createdAt))
      .limit(query.pageSize)
      .offset(offsetFor(query)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(where),
  ]);

  return jsonList(rows, {
    page: query.page,
    pageSize: query.pageSize,
    total: Number(totalRow[0]?.count ?? 0),
  });
});
