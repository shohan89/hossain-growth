import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { roles } from '../../../lib/db/schema';
import { updateRoleSchema } from '../../../lib/validation/auth';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { NotFoundError } from '../../../lib/http/errors';
import { loadRolePermissions } from '../../../lib/auth/load-role-permissions';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';

export const prerender = false;

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.ROLES_MANAGE);
  const db = drizzle(env.DB, { schema });
  const [role] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, ctx.params.id as string));
  if (!role) throw new NotFoundError('Role not found.');
  return jsonOk({ ...role, permissions: await loadRolePermissions(db, role.id) });
});

export const PATCH: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.ROLES_MANAGE);
  const id = ctx.params.id as string;
  const body = updateRoleSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });

  const [row] = await db.update(roles).set(body).where(eq(roles.id, id)).returning();
  if (!row) throw new NotFoundError('Role not found.');

  await logActivity(db, {
    userId: session.sub,
    action: 'role.updated',
    entityType: 'role',
    entityId: id,
    ipAddress: getClientIp(ctx.request),
  });

  return jsonOk({ ...row, permissions: await loadRolePermissions(db, row.id) });
});
