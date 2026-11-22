import type { APIRoute } from 'astro';
import { inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { mediaAssets } from '../../../lib/db/schema';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';
import { findOrphanedMediaIds } from '../../../lib/media-orphans';

export const prerender = false;

/**
 * Media assets with no record referencing them anywhere (featured
 * images, avatars, gallery entries, OG images) — candidates for cleanup.
 * See `findOrphanedMediaIds` for the one-hour grace period rationale.
 */
export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.MEDIA_READ);
  const db = drizzle(env.DB, { schema });

  const ids = await findOrphanedMediaIds(db);
  if (ids.length === 0) return jsonOk([]);

  const rows = await db.select().from(mediaAssets).where(inArray(mediaAssets.id, ids));
  return jsonOk(rows);
});

/** Deletes every currently-orphaned media asset from both R2 and D1. */
export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.MEDIA_DELETE);
  const db = drizzle(env.DB, { schema });

  const ids = await findOrphanedMediaIds(db);
  if (ids.length === 0) return jsonOk({ deleted: 0 });

  const rows = await db.select().from(mediaAssets).where(inArray(mediaAssets.id, ids));
  await Promise.all(rows.map((row) => env.MEDIA.delete(row.r2Key)));
  await db.delete(mediaAssets).where(inArray(mediaAssets.id, ids));

  await logActivity(db, {
    userId: session.sub,
    action: 'media_asset.orphan_cleanup',
    entityType: 'media_asset',
    metadata: { count: rows.length, ids },
    ipAddress: getClientIp(ctx.request),
  });

  return jsonOk({ deleted: rows.length });
});
