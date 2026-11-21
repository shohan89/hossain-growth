import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../../lib/db/schema';
import { seoMetadata } from '../../../../lib/db/schema';
import { upsertSeoMetadataSchema } from '../../../../lib/validation/settings';
import { requirePermission } from '../../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../../lib/http/response';
import { NotFoundError } from '../../../../lib/http/errors';
import { logActivity } from '../../../../lib/audit';
import { getClientIp } from '../../../../lib/rate-limit';

export const prerender = false;

function entityWhere(entityType: string, entityId: string) {
  return and(eq(seoMetadata.entityType, entityType as never), eq(seoMetadata.entityId, entityId));
}

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.SEO_WRITE);
  const { entityType, entityId } = ctx.params as { entityType: string; entityId: string };
  const db = drizzle(env.DB, { schema });

  const [row] = await db.select().from(seoMetadata).where(entityWhere(entityType, entityId));
  if (!row) throw new NotFoundError('No SEO metadata set for this entity.');
  return jsonOk(row);
});

export const PUT: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.SEO_WRITE);
  const { entityType, entityId } = ctx.params as { entityType: string; entityId: string };
  const jsonBody = (await ctx.request.json()) as Record<string, unknown>;
  const body = upsertSeoMetadataSchema.parse({ ...jsonBody, entityType, entityId });
  const db = drizzle(env.DB, { schema });

  const [existing] = await db.select().from(seoMetadata).where(entityWhere(entityType, entityId));

  const row = existing
    ? (
        await db.update(seoMetadata).set(body).where(entityWhere(entityType, entityId)).returning()
      )[0]
    : (
        await db
          .insert(seoMetadata)
          .values({ id: crypto.randomUUID(), ...body })
          .returning()
      )[0];

  await logActivity(db, {
    userId: session.sub,
    action: existing ? 'seo_metadata.updated' : 'seo_metadata.created',
    entityType: 'seo_metadata',
    entityId: row.id,
    metadata: { targetEntityType: entityType, targetEntityId: entityId },
    ipAddress: getClientIp(ctx.request),
  });

  return jsonOk(row, existing ? 200 : 201);
});
