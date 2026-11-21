import { sqliteTable, text, integer, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const roles = sqliteTable(
  'roles',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex('roles_key_idx').on(t.key)],
);

export const permissions = sqliteTable(
  'permissions',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    description: text('description'),
  },
  (t) => [uniqueIndex('permissions_key_idx').on(t.key)],
);

export const rolePermissions = sqliteTable(
  'role_permissions',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const adminUsers = sqliteTable(
  'admin_users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex('admin_users_email_idx').on(t.email)],
);
