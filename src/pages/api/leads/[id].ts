import type { APIRoute } from 'astro';
import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { adminUsers, leadNotes, leads } from '../../../lib/db/schema';
import { updateLeadSchema } from '../../../lib/validation/leads';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { NotFoundError } from '../../../lib/http/errors';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';

export const prerender = false;

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.LEADS_READ);
  const id = ctx.params.id as string;
  const db = drizzle(env.DB, { schema });

  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  if (!lead) throw new NotFoundError('Lead not found.');

  const notes = await db
    .select({
      id: leadNotes.id,
      note: leadNotes.note,
      createdAt: leadNotes.createdAt,
      authorId: leadNotes.authorId,
      authorName: adminUsers.name,
    })
    .from(leadNotes)
    .leftJoin(adminUsers, eq(adminUsers.id, leadNotes.authorId))
    .where(eq(leadNotes.leadId, id))
    .orderBy(asc(leadNotes.createdAt));

  return jsonOk({ ...lead, notes });
});

export const PATCH: APIRoute = withErrorHandling(async (ctx) => {
  const id = ctx.params.id as string;
  const body = updateLeadSchema.parse(await ctx.request.json());
  const session = requirePermission(ctx.locals.session, PERMISSIONS.LEADS_WRITE);

  if (body.assignedTo !== undefined) {
    requirePermission(ctx.locals.session, PERMISSIONS.LEADS_ASSIGN);
  }

  const db = drizzle(env.DB, { schema });
  const updates = body.email !== undefined ? { ...body, email: body.email.toLowerCase() } : body;

  const [row] = await db.update(leads).set(updates).where(eq(leads.id, id)).returning();
  if (!row) throw new NotFoundError('Lead not found.');

  await logActivity(db, {
    userId: session.sub,
    action: 'lead.updated',
    entityType: 'lead',
    entityId: id,
    metadata: { fields: Object.keys(body) },
    ipAddress: getClientIp(ctx.request),
  });

  return jsonOk(row);
});

export const DELETE: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.LEADS_DELETE);
  const id = ctx.params.id as string;
  const db = drizzle(env.DB, { schema });

  const [row] = await db.delete(leads).where(eq(leads.id, id)).returning();
  if (!row) throw new NotFoundError('Lead not found.');

  await logActivity(db, {
    userId: session.sub,
    action: 'lead.deleted',
    entityType: 'lead',
    entityId: id,
    ipAddress: getClientIp(ctx.request),
  });

  return new Response(null, { status: 204 });
});
