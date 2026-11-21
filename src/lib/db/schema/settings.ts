import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { mediaAssets } from './media';

export const siteSettings = sqliteTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).$type<unknown>(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const seoMetadata = sqliteTable(
  'seo_metadata',
  {
    id: text('id').primaryKey(),
    entityType: text('entity_type', {
      enum: ['page', 'blog_post', 'portfolio_project', 'case_study', 'service'],
    }).notNull(),
    entityId: text('entity_id').notNull(),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    ogImageId: text('og_image_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
    canonicalUrl: text('canonical_url'),
    structuredData: text('structured_data', { mode: 'json' }).$type<unknown>(),
    noIndex: integer('no_index', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [uniqueIndex('seo_metadata_entity_idx').on(t.entityType, t.entityId)],
);

export const redirects = sqliteTable(
  'redirects',
  {
    id: text('id').primaryKey(),
    fromPath: text('from_path').notNull(),
    toPath: text('to_path').notNull(),
    statusCode: integer('status_code').notNull().default(301),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex('redirects_from_path_idx').on(t.fromPath)],
);
