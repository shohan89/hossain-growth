import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { blogPostTags, blogPosts, blogTags } from '../../../lib/db/schema';
import { updateBlogPostSchema } from '../../../lib/validation/content';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { ConflictError, NotFoundError } from '../../../lib/http/errors';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';
import { syncBlogPostTags } from '../../../lib/blog-tags';

export const prerender = false;

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.BLOG_READ);
  const id = ctx.params.id as string;
  const db = drizzle(env.DB, { schema });

  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!post) throw new NotFoundError('Blog post not found.');

  const tags = await db
    .select({ id: blogTags.id, slug: blogTags.slug, name: blogTags.name })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogTags.id, blogPostTags.tagId))
    .where(eq(blogPostTags.blogPostId, id));

  return jsonOk({ ...post, tags });
});

export const PATCH: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.BLOG_WRITE);
  const id = ctx.params.id as string;
  const body = updateBlogPostSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });
  const { tagIds, status, ...fields } = body;

  if (status === 'published' || status === 'scheduled') {
    requirePermission(ctx.locals.session, PERMISSIONS.BLOG_PUBLISH);
  }

  try {
    const updates = status !== undefined ? { ...fields, status } : fields;
    if (Object.keys(updates).length > 0) {
      const [row] = await db.update(blogPosts).set(updates).where(eq(blogPosts.id, id)).returning();
      if (!row) throw new NotFoundError('Blog post not found.');
    } else {
      const [existing] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
      if (!existing) throw new NotFoundError('Blog post not found.');
    }

    if (tagIds !== undefined) await syncBlogPostTags(db, id, tagIds);

    await logActivity(db, {
      userId: session.sub,
      action: 'blog_post.updated',
      entityType: 'blog_post',
      entityId: id,
      ipAddress: getClientIp(ctx.request),
    });

    const [row] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return jsonOk(row);
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) {
      throw new ConflictError('A blog post with this slug already exists.');
    }
    throw error;
  }
});

export const DELETE: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.BLOG_DELETE);
  const id = ctx.params.id as string;
  const db = drizzle(env.DB, { schema });

  const [row] = await db.delete(blogPosts).where(eq(blogPosts.id, id)).returning();
  if (!row) throw new NotFoundError('Blog post not found.');

  await logActivity(db, {
    userId: session.sub,
    action: 'blog_post.deleted',
    entityType: 'blog_post',
    entityId: id,
    ipAddress: getClientIp(ctx.request),
  });

  return new Response(null, { status: 204 });
});
