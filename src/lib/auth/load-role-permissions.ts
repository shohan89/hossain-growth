import { eq } from 'drizzle-orm';
import { permissions, rolePermissions, roles } from '../db/schema';
import type { AppDb } from '../db/client';

export async function loadRolePermissions(db: AppDb, roleId: string): Promise<string[]> {
  const rows = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(rolePermissions.roleId, roleId));
  return rows.map((r) => r.key);
}

export async function getRoleByKey(db: AppDb, roleKey: string) {
  const [role] = await db.select().from(roles).where(eq(roles.key, roleKey)).limit(1);
  return role ?? null;
}
