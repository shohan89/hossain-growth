import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import {
  serviceCategories,
  services,
  portfolioProjects,
  caseStudies,
  blogCategories,
  blogTags,
  blogPosts,
  testimonials,
} from '../db/schema';

const slug = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug must be lowercase, alphanumeric, hyphen-separated');

export const createServiceCategorySchema = createInsertSchema(serviceCategories, { slug }).omit({
  id: true,
});
export const updateServiceCategorySchema = createServiceCategorySchema.partial();

export const createServiceSchema = createInsertSchema(services, {
  slug,
  title: z.string().min(1).max(200),
}).omit({ id: true, createdAt: true, updatedAt: true });
export const updateServiceSchema = createServiceSchema.partial();

export const createPortfolioProjectSchema = createInsertSchema(portfolioProjects, {
  slug,
  title: z.string().min(1).max(200),
  serviceIds: z.array(z.string()).optional(),
  resultsMetrics: z.record(z.string(), z.string()).optional(),
  publishedAt: z.coerce.date().nullable().optional(),
})
  .omit({ id: true, createdAt: true, updatedAt: true, createdBy: true })
  .extend({ imageIds: z.array(z.string()).optional() });
export const updatePortfolioProjectSchema = createPortfolioProjectSchema.partial();

export const createCaseStudySchema = createInsertSchema(caseStudies, {
  slug,
  title: z.string().min(1).max(200),
  // Overridden so a plain ISO string over JSON (e.g. from the admin
  // dashboard) is accepted — drizzle-zod's default mapping for a
  // timestamp-mode column requires an actual Date instance, which JSON
  // can't represent.
  publishedAt: z.coerce.date().nullable().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true, createdBy: true });
export const updateCaseStudySchema = createCaseStudySchema.partial();

export const createBlogCategorySchema = createInsertSchema(blogCategories, { slug }).omit({
  id: true,
});
export const updateBlogCategorySchema = createBlogCategorySchema.partial();

export const createBlogTagSchema = createInsertSchema(blogTags, { slug }).omit({ id: true });
export const updateBlogTagSchema = createBlogTagSchema.partial();

export const createBlogPostSchema = createInsertSchema(blogPosts, {
  slug,
  title: z.string().min(1).max(300),
  content: z.string().min(1),
  scheduledAt: z.coerce.date().nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
})
  .omit({ id: true, createdAt: true, updatedAt: true, authorId: true })
  .extend({ tagIds: z.array(z.string()).optional() });
export const updateBlogPostSchema = createBlogPostSchema.partial();

export const createTestimonialSchema = createInsertSchema(testimonials, {
  clientName: z.string().min(1).max(200),
  content: z.string().min(1),
  rating: z.number().int().min(1).max(5).optional(),
}).omit({ id: true, createdAt: true });
export const updateTestimonialSchema = createTestimonialSchema.partial();
