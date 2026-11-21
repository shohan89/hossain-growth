import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { z } from 'zod';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { mediaAssets } from '../../../lib/db/schema';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { NotFoundError } from '../../../lib/http/errors';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';

export const prerender = false;

const updateMediaSchema = z.object({
  altText: z.string().max(500).nullable().optional(),
  fileName: z.string().min(1).max(300).optional(),
});

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.MEDIA_READ);
  const db = drizzle(env.DB, { schema });
  const [row] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, ctx.params.id as string));
  if (!row) throw new NotFoundError('Media asset not found.');
  return jsonOk(row);
});

export const PATCH: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.MEDIA_WRITE);
  const id = ctx.params.id as string;
  const body = updateMediaSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });

  const [row] = await db.update(mediaAssets).set(body).where(eq(mediaAssets.id, id)).returning();
  if (!row) throw new NotFoundError('Media asset not found.');

  await logActivity(db, {
    userId: session.sub,
    action: 'media_asset.updated',
    entityType: 'media_asset',
    entityId: id,
    ipAddress: getClientIp(ctx.request),
  });

  return jsonOk(row);
});

export const DELETE: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.MEDIA_DELETE);
  const id = ctx.params.id as string;
  const db = drizzle(env.DB, { schema });

  const [row] = await db.delete(mediaAssets).where(eq(mediaAssets.id, id)).returning();
  if (!row) throw new NotFoundError('Media asset not found.');

  await env.MEDIA.delete(row.r2Key);

  await logActivity(db, {
    userId: session.sub,
    action: 'media_asset.deleted',
    entityType: 'media_asset',
    entityId: id,
    ipAddress: getClientIp(ctx.request),
  });

  return new Response(null, { status: 204 });
});
