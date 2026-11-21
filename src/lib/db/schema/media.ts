import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { adminUsers } from './auth';

export const mediaAssets = sqliteTable(
  'media_assets',
  {
    id: text('id').primaryKey(),
    r2Key: text('r2_key').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    width: integer('width'),
    height: integer('height'),
    altText: text('alt_text'),
    uploadedBy: text('uploaded_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex('media_assets_r2_key_idx').on(t.r2Key)],
);
