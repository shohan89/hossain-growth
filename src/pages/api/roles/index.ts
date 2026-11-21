import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { roles } from '../../../lib/db/schema';
import { createRoleSchema } from '../../../lib/validation/auth';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { ConflictError } from '../../../lib/http/errors';
import { loadRolePermissions } from '../../../lib/auth/load-role-permissions';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';

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

export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.ROLES_MANAGE);
  const body = createRoleSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });

  const [existing] = await db.select().from(roles).where(eq(roles.key, body.key)).limit(1);
  if (existing) throw new ConflictError('A role with this key already exists.');

  const id = crypto.randomUUID();
  await db
    .insert(roles)
    .values({ id, key: body.key, name: body.name, description: body.description });

  await logActivity(db, {
    userId: session.sub,
    action: 'role.created',
    entityType: 'role',
    entityId: id,
    ipAddress: getClientIp(ctx.request),
  });

  return jsonOk(
    { id, key: body.key, name: body.name, description: body.description, permissions: [] },
    201,
  );
});
