import type { APIRoute } from 'astro';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../../lib/db/schema';
import { permissions, rolePermissions, roles } from '../../../../lib/db/schema';
import { updateRolePermissionsSchema } from '../../../../lib/validation/auth';
import { requirePermission } from '../../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../../lib/http/response';
import { NotFoundError, ValidationError } from '../../../../lib/http/errors';
import { loadRolePermissions } from '../../../../lib/auth/load-role-permissions';
import { logActivity } from '../../../../lib/audit';
import { getClientIp } from '../../../../lib/rate-limit';

export const prerender = false;

/** Replaces a role's entire permission set — this is what makes permissions "configurable" rather than hardcoded. */
export const PUT: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.ROLES_MANAGE);
  const roleId = ctx.params.id as string;
  const body = updateRolePermissionsSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });

  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  if (!role) throw new NotFoundError('Role not found.');

  const uniqueKeys = [...new Set(body.permissionKeys)];
  const matched = uniqueKeys.length
    ? await db.select().from(permissions).where(inArray(permissions.key, uniqueKeys))
    : [];
  const unknownKeys = uniqueKeys.filter((key) => !matched.some((p) => p.key === key));
  if (unknownKeys.length > 0) {
    throw new ValidationError({ unknownKeys }, 'One or more permission keys do not exist.');
  }

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  if (matched.length > 0) {
    await db.insert(rolePermissions).values(matched.map((p) => ({ roleId, permissionId: p.id })));
  }

  await logActivity(db, {
    userId: session.sub,
    action: 'role.permissions_updated',
    entityType: 'role',
    entityId: roleId,
    metadata: { permissionKeys: uniqueKeys },
    ipAddress: getClientIp(ctx.request),
  });

  return jsonOk({ ...role, permissions: await loadRolePermissions(db, roleId) });
});
