import type { APIRoute } from 'astro';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { leads, LEAD_STATUSES } from '../../../lib/db/schema';
import { createLeadSchema } from '../../../lib/validation/leads';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonList, jsonOk, withErrorHandling } from '../../../lib/http/response';
import { parseListQuery, offsetFor } from '../../../lib/http/pagination';
import { ApiError } from '../../../lib/http/errors';
import { enforceRateLimit, getClientIp } from '../../../lib/rate-limit';
import { verifyTurnstileToken } from '../../../lib/turnstile';
import { logActivity } from '../../../lib/audit';

export const prerender = false;

const SORTABLE = ['createdAt', 'updatedAt', 'name', 'status', 'followUpDate'] as const;

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.LEADS_READ);
  const query = parseListQuery(ctx.url, SORTABLE);
  const db = drizzle(env.DB, { schema });

  const clauses = [];
  const status = ctx.url.searchParams.get('status');
  if (status) clauses.push(eq(leads.status, status as (typeof LEAD_STATUSES)[number]));
  const country = ctx.url.searchParams.get('country');
  if (country) clauses.push(eq(leads.country, country));
  const source = ctx.url.searchParams.get('source');
  if (source) clauses.push(eq(leads.source, source));
  const assignedTo = ctx.url.searchParams.get('assignedTo');
  if (assignedTo) clauses.push(eq(leads.assignedTo, assignedTo));
  const serviceInterest = ctx.url.searchParams.get('serviceInterest');
  if (serviceInterest) clauses.push(like(leads.serviceInterest, `%"${serviceInterest}"%`));
  const search = ctx.url.searchParams.get('search');
  if (search) {
    clauses.push(
      or(
        like(leads.name, `%${search}%`),
        like(leads.email, `%${search}%`),
        like(leads.company, `%${search}%`),
      ),
    );
  }
  const where = clauses.length ? and(...clauses) : undefined;

  const sortColumnMap = {
    createdAt: leads.createdAt,
    updatedAt: leads.updatedAt,
    name: leads.name,
    status: leads.status,
    followUpDate: leads.followUpDate,
  } as const;
  const sortColumn = sortColumnMap[(query.sortBy ?? 'createdAt') as keyof typeof sortColumnMap];
  const orderBy = query.sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(where)
      .orderBy(orderBy)
      .limit(query.pageSize)
      .offset(offsetFor(query)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(where),
  ]);

  return jsonList(rows, {
    page: query.page,
    pageSize: query.pageSize,
    total: Number(totalRow[0]?.count ?? 0),
  });
});

/** Public endpoint — no session required, but rate-limited and Turnstile-verified. */
export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const ip = getClientIp(ctx.request);
  await enforceRateLimit(env.SESSIONS, ip, {
    action: 'lead-create',
    limit: 5,
    windowSeconds: 60,
  });

  const body = createLeadSchema.parse(await ctx.request.json());
  const { turnstileToken, ...fields } = body;

  const verified = await verifyTurnstileToken(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
  if (!verified) {
    throw new ApiError(400, 'TURNSTILE_FAILED', 'Bot verification failed. Please try again.');
  }

  const db = drizzle(env.DB, { schema });
  const id = crypto.randomUUID();

  await db.insert(leads).values({
    id,
    ...fields,
    email: fields.email.toLowerCase(),
    turnstileVerified: true,
  });

  await logActivity(db, {
    userId: null,
    action: 'lead.created',
    entityType: 'lead',
    entityId: id,
    metadata: { source: fields.source },
    ipAddress: ip,
  });

  const [row] = await db.select().from(leads).where(eq(leads.id, id));
  return jsonOk(row, 201);
});
