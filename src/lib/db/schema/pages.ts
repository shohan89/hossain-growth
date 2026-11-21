import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { adminUsers } from './auth';

export const websitePages = sqliteTable(
  'website_pages',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    content: text('content', { mode: 'json' }).$type<unknown>(),
    template: text('template').notNull().default('default'),
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
  (t) => [uniqueIndex('website_pages_slug_idx').on(t.slug)],
);

export const navigationItems = sqliteTable(
  'navigation_items',
  {
    id: text('id').primaryKey(),
    label: text('label').notNull(),
    linkType: text('link_type', { enum: ['page', 'url'] })
      .notNull()
      .default('url'),
    pageId: text('page_id').references(() => websitePages.id, { onDelete: 'set null' }),
    url: text('url'),
    // Self-referencing tree; left as a plain column (no FK) to avoid circular
    // typing with sqlite-core — integrity is enforced at the application layer.
    parentId: text('parent_id'),
    orderIndex: integer('order_index').notNull().default(0),
    location: text('location', { enum: ['header', 'footer'] })
      .notNull()
      .default('header'),
    isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => [
    index('navigation_items_parent_idx').on(t.parentId),
    index('navigation_items_location_idx').on(t.location, t.orderIndex),
  ],
);
