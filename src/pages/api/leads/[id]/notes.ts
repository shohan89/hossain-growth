import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../../lib/db/schema';
import { leadNotes, leads } from '../../../../lib/db/schema';
import { createLeadNoteSchema } from '../../../../lib/validation/leads';
import { requirePermission } from '../../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../../lib/http/response';
import { NotFoundError } from '../../../../lib/http/errors';
import { logActivity } from '../../../../lib/audit';
import { getClientIp } from '../../../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.LEADS_WRITE);
  const leadId = ctx.params.id as string;
  const body = createLeadNoteSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });

  const [lead] = await db.select({ id: leads.id }).from(leads).where(eq(leads.id, leadId));
  if (!lead) throw new NotFoundError('Lead not found.');

  const id = crypto.randomUUID();
  await db.insert(leadNotes).values({ id, leadId, authorId: session.sub, note: body.note });

  await logActivity(db, {
    userId: session.sub,
    action: 'lead_note.created',
    entityType: 'lead',
    entityId: leadId,
    ipAddress: getClientIp(ctx.request),
  });

  const [row] = await db.select().from(leadNotes).where(eq(leadNotes.id, id));
  return jsonOk(row, 201);
});
