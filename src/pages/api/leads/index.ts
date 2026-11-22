import type { APIRoute } from 'astro';
import { and, asc, desc, eq, gt, like, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { leadNotes, leads, LEAD_STATUSES } from '../../../lib/db/schema';
import { adminCreateLeadSchema, createLeadSchema } from '../../../lib/validation/leads';
import { hasPermission, requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonList, jsonOk, withErrorHandling } from '../../../lib/http/response';
import { parseListQuery, offsetFor } from '../../../lib/http/pagination';
import { ApiError } from '../../../lib/http/errors';
import { enforceRateLimit, getClientIp } from '../../../lib/rate-limit';
import { verifyTurnstileToken } from '../../../lib/turnstile';
import { logActivity } from '../../../lib/audit';
import { notifyNewLead } from '../../../lib/lead-notifications';

/** A visually hidden form field real visitors never fill in; bots that
 * auto-fill every input reveal themselves by putting something here. */
const HONEYPOT_FIELD = 'website_url';
/** A second submission from the same email within this window is treated
 * as a resubmission of the same inquiry rather than a brand-new lead. */
const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

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
  const budget = ctx.url.searchParams.get('budget');
  if (budget) clauses.push(eq(leads.budget, budget));
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

/**
 * Public endpoint — no session required for anonymous visitors (rate
 * limited + Turnstile-verified). An authenticated admin with
 * `leads.write` can instead log a lead manually (phone call, in person,
 * etc.) without Turnstile — that request already came from a verified
 * session, not an anonymous form.
 */
export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const db = drizzle(env.DB, { schema });
  const ip = getClientIp(ctx.request);

  if (ctx.locals.session && hasPermission(ctx.locals.session, PERMISSIONS.LEADS_WRITE)) {
    const body = adminCreateLeadSchema.parse(await ctx.request.json());
    const id = crypto.randomUUID();

    await db.insert(leads).values({
      id,
      ...body,
      email: body.email.toLowerCase(),
      source: body.source ?? 'manual',
      turnstileVerified: false,
    });

    await logActivity(db, {
      userId: ctx.locals.session.sub,
      action: 'lead.created',
      entityType: 'lead',
      entityId: id,
      metadata: { source: body.source ?? 'manual' },
      ipAddress: ip,
    });

    const [row] = await db.select().from(leads).where(eq(leads.id, id));
    return jsonOk(row, 201);
  }

  await enforceRateLimit(env.SESSIONS, ip, {
    action: 'lead-create',
    limit: 5,
    windowSeconds: 60,
  });

  const rawBody = (await ctx.request.json()) as Record<string, unknown>;
  const body = createLeadSchema.parse(rawBody);
  const { turnstileToken, ...fields } = body;

  const verified = await verifyTurnstileToken(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
  if (!verified) {
    throw new ApiError(400, 'TURNSTILE_FAILED', 'Bot verification failed. Please try again.');
  }

  // Honeypot: a filled-in decoy field means a bot auto-filled every input
  // on the form. Respond exactly like a real success so the bot has no
  // signal it was caught, but never write the submission to the leads
  // table.
  const honeypotValue = rawBody[HONEYPOT_FIELD];
  if (typeof honeypotValue === 'string' && honeypotValue.trim().length > 0) {
    await logActivity(db, {
      userId: null,
      action: 'lead.spam_rejected',
      entityType: 'lead',
      metadata: { reason: 'honeypot', email: fields.email },
      ipAddress: ip,
    });
    return jsonOk({ id: crypto.randomUUID(), ...fields }, 201);
  }

  const normalizedEmail = fields.email.toLowerCase();

  // Duplicate handling: a resubmission from the same email within the
  // window (double-click, retry after a flaky connection, "actually, one
  // more thing") is folded into the existing lead as a note instead of
  // creating a second row for the same inquiry.
  const [recentDuplicate] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.email, normalizedEmail),
        gt(leads.createdAt, new Date(Date.now() - DUPLICATE_WINDOW_MS)),
      ),
    )
    .orderBy(desc(leads.createdAt))
    .limit(1);

  if (recentDuplicate) {
    if (fields.message) {
      await db.insert(leadNotes).values({
        id: crypto.randomUUID(),
        leadId: recentDuplicate.id,
        authorId: null,
        note: `Submitted the form again within ${DUPLICATE_WINDOW_MS / 60_000} minutes: ${fields.message}`,
      });
    }
    await logActivity(db, {
      userId: null,
      action: 'lead.duplicate_merged',
      entityType: 'lead',
      entityId: recentDuplicate.id,
      ipAddress: ip,
    });
    return jsonOk(recentDuplicate, 200);
  }

  const id = crypto.randomUUID();

  await db.insert(leads).values({
    id,
    ...fields,
    email: normalizedEmail,
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

  await notifyNewLead(db, env, {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    country: row.country,
    budget: row.budget,
    message: row.message,
    source: row.source,
    serviceInterest: row.serviceInterest,
  });

  return jsonOk(row, 201);
});
