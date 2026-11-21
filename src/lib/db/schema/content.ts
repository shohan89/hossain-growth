import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { adminUsers } from './auth';
import { mediaAssets } from './media';

export const serviceCategories = sqliteTable(
  'service_categories',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
  },
  (t) => [uniqueIndex('service_categories_slug_idx').on(t.slug)],
);

export const services = sqliteTable(
  'services',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    categoryId: text('category_id').references(() => serviceCategories.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    summary: text('summary'),
    content: text('content'),
    icon: text('icon'),
    orderIndex: integer('order_index').notNull().default(0),
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex('services_slug_idx').on(t.slug),
    index('services_category_idx').on(t.categoryId),
  ],
);

export const portfolioProjects = sqliteTable(
  'portfolio_projects',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    clientName: text('client_name'),
    title: text('title').notNull(),
    summary: text('summary'),
    content: text('content'),
    serviceIds: text('service_ids', { mode: 'json' }).$type<string[]>().notNull().default([]),
    resultsMetrics: text('results_metrics', { mode: 'json' })
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    featuredImageId: text('featured_image_id').references(() => mediaAssets.id, {
      onDelete: 'set null',
    }),
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    createdBy: text('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex('portfolio_projects_slug_idx').on(t.slug),
    index('portfolio_projects_published_idx').on(t.isPublished, t.publishedAt),
  ],
);

export const portfolioProjectImages = sqliteTable(
  'portfolio_project_images',
  {
    id: text('id').primaryKey(),
    portfolioProjectId: text('portfolio_project_id')
      .notNull()
      .references(() => portfolioProjects.id, { onDelete: 'cascade' }),
    mediaAssetId: text('media_asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull().default(0),
  },
  (t) => [index('portfolio_project_images_project_idx').on(t.portfolioProjectId)],
);

export const caseStudies = sqliteTable(
  'case_studies',
  {
    id: text('id').primaryKey(),
    portfolioProjectId: text('portfolio_project_id').references(() => portfolioProjects.id, {
      onDelete: 'set null',
    }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    client: text('client'),
    industry: text('industry'),
    challenge: text('challenge'),
    solution: text('solution'),
    results: text('results'),
    content: text('content'),
    featuredImageId: text('featured_image_id').references(() => mediaAssets.id, {
      onDelete: 'set null',
    }),
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    createdBy: text('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex('case_studies_slug_idx').on(t.slug),
    index('case_studies_published_idx').on(t.isPublished, t.publishedAt),
  ],
);

export const blogCategories = sqliteTable(
  'blog_categories',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
  },
  (t) => [uniqueIndex('blog_categories_slug_idx').on(t.slug)],
);

export const blogTags = sqliteTable(
  'blog_tags',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
  },
  (t) => [uniqueIndex('blog_tags_slug_idx').on(t.slug)],
);

export const blogPosts = sqliteTable(
  'blog_posts',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    content: text('content').notNull(),
    featuredImageId: text('featured_image_id').references(() => mediaAssets.id, {
      onDelete: 'set null',
    }),
    authorId: text('author_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    categoryId: text('category_id').references(() => blogCategories.id, {
      onDelete: 'set null',
    }),
    status: text('status', { enum: ['draft', 'scheduled', 'published'] })
      .notNull()
      .default('draft'),
    scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex('blog_posts_slug_idx').on(t.slug),
    index('blog_posts_status_idx').on(t.status, t.publishedAt),
  ],
);

export const blogPostTags = sqliteTable(
  'blog_post_tags',
  {
    blogPostId: text('blog_post_id')
      .notNull()
      .references(() => blogPosts.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => blogTags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.blogPostId, t.tagId] })],
);

export const testimonials = sqliteTable(
  'testimonials',
  {
    id: text('id').primaryKey(),
    clientName: text('client_name').notNull(),
    clientTitle: text('client_title'),
    clientCompany: text('client_company'),
    content: text('content').notNull(),
    rating: integer('rating'),
    avatarMediaId: text('avatar_media_id').references(() => mediaAssets.id, {
      onDelete: 'set null',
    }),
    portfolioProjectId: text('portfolio_project_id').references(() => portfolioProjects.id, {
      onDelete: 'set null',
    }),
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(true),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('testimonials_published_idx').on(t.isPublished, t.orderIndex)],
);
