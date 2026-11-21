import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  primaryKey,
  index,
} from 'drizzle-orm/sqlite-core';
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
    // Bumped on every password change/reset (and available for a future
    // "log out everywhere" action). Mirrored into KV at login/bump time so
    // the middleware can invalidate all outstanding session JWTs for this
    // user with a fast KV read instead of a D1 round trip per request.
    tokenVersion: integer('token_version').notNull().default(0),
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

export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    // SHA-256 hash of the token; the raw token is only ever held by the
    // requester (emailed/returned once) and never stored.
    tokenHash: text('token_hash').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex('password_reset_tokens_hash_idx').on(t.tokenHash),
    index('password_reset_tokens_user_idx').on(t.userId),
  ],
);
