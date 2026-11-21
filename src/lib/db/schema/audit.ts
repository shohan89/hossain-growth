import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { adminUsers } from './auth';

export const activityLogs = sqliteTable(
  'activity_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
    ipAddress: text('ip_address'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index('activity_logs_created_idx').on(t.createdAt),
    index('activity_logs_user_idx').on(t.userId),
    index('activity_logs_entity_idx').on(t.entityType, t.entityId),
  ],
);
