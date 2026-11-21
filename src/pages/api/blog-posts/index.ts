import type { APIRoute } from 'astro';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { blogPosts } from '../../../lib/db/schema';
import { createBlogPostSchema } from '../../../lib/validation/content';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonList, jsonOk, withErrorHandling } from '../../../lib/http/response';
import { parseListQuery, offsetFor } from '../../../lib/http/pagination';
import { ConflictError } from '../../../lib/http/errors';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';
import { syncBlogPostTags } from '../../../lib/blog-tags';

export const prerender = false;

const SORTABLE = ['title', 'slug', 'status', 'createdAt', 'updatedAt', 'publishedAt'] as const;

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.BLOG_READ);
  const query = parseListQuery(ctx.url, SORTABLE);
  const db = drizzle(env.DB, { schema });

  const clauses = [];
  const status = ctx.url.searchParams.get('status');
  if (status) clauses.push(eq(blogPosts.status, status as 'draft' | 'scheduled' | 'published'));
  const categoryId = ctx.url.searchParams.get('categoryId');
  if (categoryId) clauses.push(eq(blogPosts.categoryId, categoryId));
  const search = ctx.url.searchParams.get('search');
  if (search) {
    clauses.push(or(like(blogPosts.title, `%${search}%`), like(blogPosts.slug, `%${search}%`)));
  }
  const where = clauses.length ? and(...clauses) : undefined;

  const sortColumnMap = {
    title: blogPosts.title,
    slug: blogPosts.slug,
    status: blogPosts.status,
    createdAt: blogPosts.createdAt,
    updatedAt: blogPosts.updatedAt,
    publishedAt: blogPosts.publishedAt,
  } as const;
  const sortColumn = sortColumnMap[(query.sortBy ?? 'createdAt') as keyof typeof sortColumnMap];
  const orderBy = query.sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(blogPosts)
      .where(where)
      .orderBy(orderBy)
      .limit(query.pageSize)
      .offset(offsetFor(query)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(where),
  ]);

  return jsonList(rows, {
    page: query.page,
    pageSize: query.pageSize,
    total: Number(totalRow[0]?.count ?? 0),
  });
});

export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.BLOG_WRITE);
  const body = createBlogPostSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });
  const id = crypto.randomUUID();
  const { tagIds, status, ...fields } = body;

  if (status === 'published' || status === 'scheduled') {
    requirePermission(ctx.locals.session, PERMISSIONS.BLOG_PUBLISH);
  }

  try {
    await db.insert(blogPosts).values({
      id,
      authorId: session.sub,
      status: status ?? 'draft',
      ...fields,
    });
    if (tagIds?.length) await syncBlogPostTags(db, id, tagIds);

    await logActivity(db, {
      userId: session.sub,
      action: 'blog_post.created',
      entityType: 'blog_post',
      entityId: id,
      ipAddress: getClientIp(ctx.request),
    });

    const [row] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return jsonOk(row, 201);
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) {
      throw new ConflictError('A blog post with this slug already exists.');
    }
    throw error;
  }
});
