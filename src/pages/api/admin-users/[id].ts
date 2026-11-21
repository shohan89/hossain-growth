import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { adminUsers, roles } from '../../../lib/db/schema';
import { updateAdminUserSchema } from '../../../lib/validation/auth';
import { hashPassword } from '../../../lib/auth/password';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { ConflictError, NotFoundError } from '../../../lib/http/errors';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';

export const prerender = false;

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.USERS_MANAGE);
  const db = drizzle(env.DB, { schema });
  const [row] = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      roleId: adminUsers.roleId,
      roleKey: roles.key,
      isActive: adminUsers.isActive,
      lastLoginAt: adminUsers.lastLoginAt,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .innerJoin(roles, eq(roles.id, adminUsers.roleId))
    .where(eq(adminUsers.id, ctx.params.id as string))
    .limit(1);

  if (!row) throw new NotFoundError('Admin user not found.');
  return jsonOk(row);
});

export const PATCH: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.USERS_MANAGE);
  const id = ctx.params.id as string;
  const body = updateAdminUserSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });

  const updates: Partial<typeof adminUsers.$inferInsert> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.roleId !== undefined) updates.roleId = body.roleId;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.email !== undefined) updates.email = body.email.toLowerCase();
  if (body.password !== undefined) updates.passwordHash = await hashPassword(body.password);

  if (Object.keys(updates).length === 0) {
    const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Admin user not found.');
    const { passwordHash: _omit, ...safe } = existing;
    return jsonOk(safe);
  }

  try {
    const [row] = await db.update(adminUsers).set(updates).where(eq(adminUsers.id, id)).returning();
    if (!row) throw new NotFoundError('Admin user not found.');

    await logActivity(db, {
      userId: session.sub,
      action: 'admin_user.updated',
      entityType: 'admin_user',
      entityId: id,
      ipAddress: getClientIp(ctx.request),
    });

    const { passwordHash: _omit, ...safe } = row;
    return jsonOk(safe);
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) {
      throw new ConflictError('A user with this email already exists.');
    }
    throw error;
  }
});

export const DELETE: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.USERS_MANAGE);
  const id = ctx.params.id as string;
  const db = drizzle(env.DB, { schema });

  // Soft delete: deactivate rather than remove, preserving FK history
  // (audit logs, authored content, assigned leads).
  const [row] = await db
    .update(adminUsers)
    .set({ isActive: false })
    .where(eq(adminUsers.id, id))
    .returning();

  if (!row) throw new NotFoundError('Admin user not found.');

  await logActivity(db, {
    userId: session.sub,
    action: 'admin_user.deactivated',
    entityType: 'admin_user',
    entityId: id,
    ipAddress: getClientIp(ctx.request),
  });

  return new Response(null, { status: 204 });
});
