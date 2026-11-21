import type { APIRoute } from 'astro';
import { desc, eq, like, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { mediaAssets } from '../../../lib/db/schema';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonList, jsonOk, withErrorHandling } from '../../../lib/http/response';
import { parseListQuery, offsetFor } from '../../../lib/http/pagination';
import { ApiError } from '../../../lib/http/errors';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';

export const prerender = false;

const SORTABLE = ['fileName', 'createdAt', 'sizeBytes'] as const;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
]);

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.MEDIA_READ);
  const query = parseListQuery(ctx.url, SORTABLE);
  const db = drizzle(env.DB, { schema });

  const search = ctx.url.searchParams.get('search');
  const where = search ? like(mediaAssets.fileName, `%${search}%`) : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(mediaAssets)
      .where(where)
      .orderBy(desc(mediaAssets.createdAt))
      .limit(query.pageSize)
      .offset(offsetFor(query)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(mediaAssets)
      .where(where),
  ]);

  return jsonList(rows, {
    page: query.page,
    pageSize: query.pageSize,
    total: Number(totalRow[0]?.count ?? 0),
  });
});

export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.MEDIA_WRITE);

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

  const altText = formData.get('altText');
  const db = drizzle(env.DB, { schema });
  const id = crypto.randomUUID();
  const extension = file.name.includes('.') ? file.name.split('.').pop() : undefined;
  const r2Key = `media/${id}${extension ? `.${extension}` : ''}`;

  await env.MEDIA.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  await db.insert(mediaAssets).values({
    id,
    r2Key,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    altText: typeof altText === 'string' ? altText : null,
    uploadedBy: session.sub,
  });

  await logActivity(db, {
    userId: session.sub,
    action: 'media_asset.uploaded',
    entityType: 'media_asset',
    entityId: id,
    metadata: { fileName: file.name, sizeBytes: file.size },
    ipAddress: getClientIp(ctx.request),
  });

  const [row] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
  return jsonOk(row, 201);
});
