import { and, asc, desc, eq, inArray, like, ne } from 'drizzle-orm';
import type { AppDb } from '../db/client';
import {
  services,
  serviceCategories,
  portfolioProjects,
  caseStudies,
  blogPosts,
  blogCategories,
  blogTags,
  blogPostTags,
  testimonials,
  siteSettings,
  navigationItems,
  adminUsers,
} from '../db/schema';

export async function getPublishedServices(db: AppDb) {
  return db
    .select()
    .from(services)
    .where(eq(services.isPublished, true))
    .orderBy(asc(services.orderIndex));
}

export async function getServiceBySlug(db: AppDb, slug: string) {
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.slug, slug), eq(services.isPublished, true)));
  return service ?? null;
}

export async function getServiceCategories(db: AppDb) {
  return db.select().from(serviceCategories).orderBy(asc(serviceCategories.orderIndex));
}

export async function getPublishedPortfolioProjects(db: AppDb, limit?: number) {
  const query = db
    .select()
    .from(portfolioProjects)
    .where(eq(portfolioProjects.isPublished, true))
    .orderBy(desc(portfolioProjects.publishedAt));
  return limit ? query.limit(limit) : query;
}

export async function getPortfolioProjectBySlug(db: AppDb, slug: string) {
  const [project] = await db
    .select()
    .from(portfolioProjects)
    .where(and(eq(portfolioProjects.slug, slug), eq(portfolioProjects.isPublished, true)));
  return project ?? null;
}

export async function getCaseStudiesForService(db: AppDb, serviceId: string, limit = 2) {
  const projects = await db
    .select({ id: portfolioProjects.id })
    .from(portfolioProjects)
    .where(
      and(
        eq(portfolioProjects.isPublished, true),
        like(portfolioProjects.serviceIds, `%"${serviceId}"%`),
      ),
    );
  const projectIds = projects.map((project) => project.id);
  if (!projectIds.length) return [];

  return db
    .select()
    .from(caseStudies)
    .where(
      and(eq(caseStudies.isPublished, true), inArray(caseStudies.portfolioProjectId, projectIds)),
    )
    .limit(limit);
}

export async function getPublishedCaseStudies(db: AppDb, limit?: number) {
  const query = db
    .select()
    .from(caseStudies)
    .where(eq(caseStudies.isPublished, true))
    .orderBy(desc(caseStudies.publishedAt));
  return limit ? query.limit(limit) : query;
}

export async function getCaseStudyBySlug(db: AppDb, slug: string) {
  const [caseStudy] = await db
    .select()
    .from(caseStudies)
    .where(and(eq(caseStudies.slug, slug), eq(caseStudies.isPublished, true)));
  return caseStudy ?? null;
}

export async function getPublishedBlogPosts(
  db: AppDb,
  options: { limit?: number; categorySlug?: string } = {},
) {
  const clauses = [eq(blogPosts.status, 'published')];

  let categoryId: string | undefined;
  if (options.categorySlug) {
    const [category] = await db
      .select()
      .from(blogCategories)
      .where(eq(blogCategories.slug, options.categorySlug));
    categoryId = category?.id;
    if (!categoryId) return [];
    clauses.push(eq(blogPosts.categoryId, categoryId));
  }

  const query = db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      title: blogPosts.title,
      excerpt: blogPosts.excerpt,
      publishedAt: blogPosts.publishedAt,
      categoryId: blogPosts.categoryId,
      categoryName: blogCategories.name,
      categorySlug: blogCategories.slug,
    })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
    .where(and(...clauses))
    .orderBy(desc(blogPosts.publishedAt));

  return options.limit ? query.limit(options.limit) : query;
}

export async function getBlogPostBySlug(db: AppDb, slug: string) {
  const [post] = await db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      title: blogPosts.title,
      excerpt: blogPosts.excerpt,
      content: blogPosts.content,
      publishedAt: blogPosts.publishedAt,
      updatedAt: blogPosts.updatedAt,
      categoryId: blogPosts.categoryId,
      categoryName: blogCategories.name,
      categorySlug: blogCategories.slug,
      authorName: adminUsers.name,
    })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
    .leftJoin(adminUsers, eq(adminUsers.id, blogPosts.authorId))
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, 'published')));

  if (!post) return null;

  const tags = await db
    .select({ name: blogTags.name, slug: blogTags.slug })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogTags.id, blogPostTags.tagId))
    .where(eq(blogPostTags.blogPostId, post.id));

  return { ...post, tags };
}

export async function getRelatedBlogPosts(
  db: AppDb,
  postId: string,
  categoryId: string | null,
  limit = 3,
) {
  if (!categoryId) return [];
  return db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      excerpt: blogPosts.excerpt,
      publishedAt: blogPosts.publishedAt,
    })
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.status, 'published'),
        eq(blogPosts.categoryId, categoryId),
        ne(blogPosts.id, postId),
      ),
    )
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit);
}

export async function getPublishedTestimonials(db: AppDb, limit?: number) {
  const query = db
    .select()
    .from(testimonials)
    .where(eq(testimonials.isPublished, true))
    .orderBy(asc(testimonials.orderIndex));
  return limit ? query.limit(limit) : query;
}

export async function getSiteSetting<T = unknown>(db: AppDb, key: string): Promise<T | null> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
  return (row?.value as T) ?? null;
}

export async function getNavigationItems(db: AppDb, location: 'header' | 'footer') {
  return db
    .select()
    .from(navigationItems)
    .where(and(eq(navigationItems.location, location), eq(navigationItems.isVisible, true)))
    .orderBy(asc(navigationItems.orderIndex));
}
