import type { APIRoute } from 'astro';
import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { mediaAssets, portfolioProjectImages, portfolioProjects } from '../../../lib/db/schema';
import { updatePortfolioProjectSchema } from '../../../lib/validation/content';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { ConflictError, NotFoundError } from '../../../lib/http/errors';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';
import { syncPortfolioProjectImages } from '../../../lib/portfolio-images';

export const prerender = false;

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.PORTFOLIO_READ);
  const id = ctx.params.id as string;
  const db = drizzle(env.DB, { schema });

  const [project] = await db.select().from(portfolioProjects).where(eq(portfolioProjects.id, id));
  if (!project) throw new NotFoundError('Portfolio project not found.');

  const images = await db
    .select({
      id: mediaAssets.id,
      r2Key: mediaAssets.r2Key,
      altText: mediaAssets.altText,
      orderIndex: portfolioProjectImages.orderIndex,
    })
    .from(portfolioProjectImages)
    .innerJoin(mediaAssets, eq(mediaAssets.id, portfolioProjectImages.mediaAssetId))
    .where(eq(portfolioProjectImages.portfolioProjectId, id))
    .orderBy(asc(portfolioProjectImages.orderIndex));

  return jsonOk({ ...project, images });
});

export const PATCH: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.PORTFOLIO_WRITE);
  const id = ctx.params.id as string;
  const body = updatePortfolioProjectSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });
  const { imageIds, ...fields } = body;

  try {
    if (Object.keys(fields).length > 0) {
      const [row] = await db
        .update(portfolioProjects)
        .set(fields)
        .where(eq(portfolioProjects.id, id))
        .returning();
      if (!row) throw new NotFoundError('Portfolio project not found.');
    } else {
      const [existing] = await db
        .select()
        .from(portfolioProjects)
        .where(eq(portfolioProjects.id, id));
      if (!existing) throw new NotFoundError('Portfolio project not found.');
    }

    if (imageIds !== undefined) await syncPortfolioProjectImages(db, id, imageIds);

    await logActivity(db, {
      userId: session.sub,
      action: 'portfolio_project.updated',
      entityType: 'portfolio_project',
      entityId: id,
      ipAddress: getClientIp(ctx.request),
    });

    const [row] = await db.select().from(portfolioProjects).where(eq(portfolioProjects.id, id));
    return jsonOk(row);
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) {
      throw new ConflictError('A portfolio project with this slug already exists.');
    }
    throw error;
  }
});

export const DELETE: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.PORTFOLIO_DELETE);
  const id = ctx.params.id as string;
  const db = drizzle(env.DB, { schema });

  const [row] = await db.delete(portfolioProjects).where(eq(portfolioProjects.id, id)).returning();
  if (!row) throw new NotFoundError('Portfolio project not found.');

  await logActivity(db, {
    userId: session.sub,
    action: 'portfolio_project.deleted',
    entityType: 'portfolio_project',
    entityId: id,
    ipAddress: getClientIp(ctx.request),
  });

  return new Response(null, { status: 204 });
});
