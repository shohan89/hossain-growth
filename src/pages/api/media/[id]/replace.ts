import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../../lib/db/schema';
import { mediaAssets } from '../../../../lib/db/schema';
import { requirePermission } from '../../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../../lib/http/response';
import { ApiError, NotFoundError } from '../../../../lib/http/errors';
import { logActivity } from '../../../../lib/audit';
import { getClientIp } from '../../../../lib/rate-limit';
import { MAX_UPLOAD_BYTES, ALLOWED_MIME_TYPES } from '../index';
import { readImageDimensions } from '../../../../lib/image-dimensions';

export const prerender = false;

/**
 * Replaces a media asset's bytes in place, keeping the same id (and
 * therefore the same /media/:id URL) so existing references — featured
 * images, etc. — don't break.
 */
export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.MEDIA_WRITE);
  const id = ctx.params.id as string;
  const db = drizzle(env.DB, { schema });

  const [existing] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
  if (!existing) throw new NotFoundError('Media asset not found.');

  const formData = await ctx.request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'A "file" field is required.');
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      `File must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes.`,
    );
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `Unsupported file type: ${file.type}`);
  }

  const bytes = await file.arrayBuffer();
  const dimensions = readImageDimensions(bytes, file.type);

  await env.MEDIA.put(existing.r2Key, bytes, {
    httpMetadata: { contentType: file.type },
  });

  const [row] = await db
    .update(mediaAssets)
    .set({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
    })
    .where(eq(mediaAssets.id, id))
    .returning();

  await logActivity(db, {
    userId: session.sub,
    action: 'media_asset.replaced',
    entityType: 'media_asset',
    entityId: id,
    metadata: { fileName: file.name, sizeBytes: file.size },
    ipAddress: getClientIp(ctx.request),
  });

  return jsonOk(row);
});
