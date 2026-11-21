import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import { adminUsers, roles } from '../../../lib/db/schema';
import * as schema from '../../../lib/db/schema';
import { loginSchema } from '../../../lib/validation/auth';
import { verifyPassword } from '../../../lib/auth/password';
import { createSessionToken, SESSION_COOKIE_NAME } from '../../../lib/auth/session';
import { loadRolePermissions } from '../../../lib/auth/load-role-permissions';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { ApiError } from '../../../lib/http/errors';
import { enforceRateLimit, getClientIp } from '../../../lib/rate-limit';
import { logActivity } from '../../../lib/audit';

export const prerender = false;

export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const ip = getClientIp(ctx.request);
  await enforceRateLimit(env.SESSIONS, ip, { action: 'login', limit: 10, windowSeconds: 60 });

  const body = loginSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, body.email.toLowerCase()))
    .limit(1);

  const invalidCredentials = () =>
    new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');

  if (!user || !user.isActive) {
    await logActivity(db, {
      userId: null,
      action: 'auth.login_failed',
      entityType: 'admin_user',
      entityId: null,
      metadata: { email: body.email },
      ipAddress: ip,
    });
    throw invalidCredentials();
  }

  const passwordValid = await verifyPassword(body.password, user.passwordHash);
  if (!passwordValid) {
    await logActivity(db, {
      userId: user.id,
      action: 'auth.login_failed',
      entityType: 'admin_user',
      entityId: user.id,
      ipAddress: ip,
    });
    throw invalidCredentials();
  }

  const [role] = await db.select().from(roles).where(eq(roles.id, user.roleId)).limit(1);
  if (!role) throw invalidCredentials();

  const permissionKeys = await loadRolePermissions(db, role.id);

  const { token, maxAge } = await createSessionToken(
    { sub: user.id, email: user.email, roleKey: role.key, permissions: permissionKeys },
    env.SESSION_SIGNING_KEY,
  );

  ctx.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.ENVIRONMENT !== 'development',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));

  await logActivity(db, {
    userId: user.id,
    action: 'auth.login_succeeded',
    entityType: 'admin_user',
    entityId: user.id,
    ipAddress: ip,
  });

  return jsonOk({
    id: user.id,
    email: user.email,
    name: user.name,
    role: role.key,
    permissions: permissionKeys,
  });
});
