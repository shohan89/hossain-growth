import type { APIRoute } from 'astro';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { roles } from '../../../lib/db/schema';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { loadRolePermissions } from '../../../lib/auth/load-role-permissions';

export const prerender = false;

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.ROLES_MANAGE);
  const db = drizzle(env.DB, { schema });
  const allRoles = await db.select().from(roles);

  const withPermissions = await Promise.all(
    allRoles.map(async (role) => ({
      ...role,
      permissions: await loadRolePermissions(db, role.id),
    })),
  );

  return jsonOk(withPermissions);
});
