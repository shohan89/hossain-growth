import type { APIRoute } from 'astro';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { portfolioProjects } from '../../../lib/db/schema';
import { createPortfolioProjectSchema } from '../../../lib/validation/content';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonList, jsonOk, withErrorHandling } from '../../../lib/http/response';
import { parseListQuery, offsetFor } from '../../../lib/http/pagination';
import { ConflictError } from '../../../lib/http/errors';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';
import { syncPortfolioProjectImages } from '../../../lib/portfolio-images';

export const prerender = false;

const SORTABLE = ['title', 'slug', 'createdAt', 'updatedAt', 'publishedAt'] as const;

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.PORTFOLIO_READ);
  const query = parseListQuery(ctx.url, SORTABLE);
  const db = drizzle(env.DB, { schema });

  const clauses = [];
  const isPublished = ctx.url.searchParams.get('isPublished');
  if (isPublished !== null) clauses.push(eq(portfolioProjects.isPublished, isPublished === 'true'));
  const search = ctx.url.searchParams.get('search');
  if (search) {
    clauses.push(
      or(like(portfolioProjects.title, `%${search}%`), like(portfolioProjects.slug, `%${search}%`)),
    );
  }
  const where = clauses.length ? and(...clauses) : undefined;

  const sortColumnMap = {
    title: portfolioProjects.title,
    slug: portfolioProjects.slug,
    createdAt: portfolioProjects.createdAt,
    updatedAt: portfolioProjects.updatedAt,
    publishedAt: portfolioProjects.publishedAt,
  } as const;
  const sortColumn = sortColumnMap[(query.sortBy ?? 'createdAt') as keyof typeof sortColumnMap];
  const orderBy = query.sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(portfolioProjects)
      .where(where)
      .orderBy(orderBy)
      .limit(query.pageSize)
      .offset(offsetFor(query)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(portfolioProjects)
      .where(where),
  ]);

  return jsonList(rows, {
    page: query.page,
    pageSize: query.pageSize,
    total: Number(totalRow[0]?.count ?? 0),
  });
});

export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.PORTFOLIO_WRITE);
  const body = createPortfolioProjectSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });
  const id = crypto.randomUUID();
  const { imageIds, ...fields } = body;

  try {
    await db.insert(portfolioProjects).values({ id, createdBy: session.sub, ...fields });
    if (imageIds?.length) await syncPortfolioProjectImages(db, id, imageIds);

    await logActivity(db, {
      userId: session.sub,
      action: 'portfolio_project.created',
      entityType: 'portfolio_project',
      entityId: id,
      ipAddress: getClientIp(ctx.request),
    });

    const [row] = await db.select().from(portfolioProjects).where(eq(portfolioProjects.id, id));
    return jsonOk(row, 201);
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) {
      throw new ConflictError('A portfolio project with this slug already exists.');
    }
    throw error;
  }
});
