import type { APIRoute } from 'astro';
import { and, desc, eq, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { leads, LEAD_STATUSES } from '../../../lib/db/schema';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { withErrorHandling } from '../../../lib/http/response';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';

export const prerender = false;

const CSV_COLUMNS = [
  'id',
  'name',
  'email',
  'phone',
  'company',
  'country',
  'source',
  'serviceInterest',
  'status',
  'assignedTo',
  'followUpDate',
  'createdAt',
] as const;

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = Array.isArray(value) ? value.join('; ') : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.LEADS_EXPORT);
  const db = drizzle(env.DB, { schema });

  const clauses = [];
  const status = ctx.url.searchParams.get('status');
  if (status) clauses.push(eq(leads.status, status as (typeof LEAD_STATUSES)[number]));
  const country = ctx.url.searchParams.get('country');
  if (country) clauses.push(eq(leads.country, country));
  const source = ctx.url.searchParams.get('source');
  if (source) clauses.push(eq(leads.source, source));
  const search = ctx.url.searchParams.get('search');
  if (search) {
    clauses.push(or(like(leads.name, `%${search}%`), like(leads.email, `%${search}%`)));
  }
  const where = clauses.length ? and(...clauses) : undefined;

  const rows = await db.select().from(leads).where(where).orderBy(desc(leads.createdAt));

  const header = CSV_COLUMNS.join(',');
  const lines = rows.map((row) =>
    CSV_COLUMNS.map((col) => toCsvValue((row as Record<string, unknown>)[col])).join(','),
  );
  const csv = [header, ...lines].join('\n');

  await logActivity(db, {
    userId: session.sub,
    action: 'lead.exported',
    entityType: 'lead',
    metadata: { count: rows.length },
    ipAddress: getClientIp(ctx.request),
  });

  return new Response(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="leads-export-${Date.now()}.csv"`,
    },
  });
});
