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
import { setCachedTokenVersion } from '../../../lib/auth/token-version';
import { clearFailedLogins, isAccountLocked, recordFailedLogin } from '../../../lib/auth/lockout';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { AccountLockedError, ApiError } from '../../../lib/http/errors';
import { enforceRateLimit, getClientIp } from '../../../lib/rate-limit';
import { verifyTurnstileToken } from '../../../lib/turnstile';
import { logActivity } from '../../../lib/audit';

export const prerender = false;

export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const ip = getClientIp(ctx.request);
  // IP-based throttle (covers distributed/rotating-account attacks)...
  await enforceRateLimit(env.SESSIONS, ip, { action: 'login', limit: 10, windowSeconds: 60 });

  const body = loginSchema.parse(await ctx.request.json());
  const email = body.email.toLowerCase();

  const turnstileOk = await verifyTurnstileToken(body.turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
  if (!turnstileOk) {
    throw new ApiError(400, 'TURNSTILE_FAILED', 'Bot verification failed. Please try again.');
  }

  // ...account-based lockout (covers credential stuffing against one account from many IPs).
  if (await isAccountLocked(env.SESSIONS, email)) {
    throw new AccountLockedError();
  }

  const db = drizzle(env.DB, { schema });

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);

  const invalidCredentials = () =>
    new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');

  const failLogin = async (userId: string | null) => {
    const failures = await recordFailedLogin(env.SESSIONS, email);
    await logActivity(db, {
      userId,
      action: 'auth.login_failed',
      entityType: 'admin_user',
      entityId: userId,
      metadata: { email, failedAttempts: failures },
      ipAddress: ip,
    });
  };

  if (!user || !user.isActive) {
    await failLogin(user?.id ?? null);
    throw invalidCredentials();
  }

  const passwordValid = await verifyPassword(body.password, user.passwordHash);
  if (!passwordValid) {
    await failLogin(user.id);
    throw invalidCredentials();
  }

  const [role] = await db.select().from(roles).where(eq(roles.id, user.roleId)).limit(1);
  if (!role) throw invalidCredentials();

  await clearFailedLogins(env.SESSIONS, email);

  const permissionKeys = await loadRolePermissions(db, role.id);

  const { token, maxAge } = await createSessionToken(
    {
      sub: user.id,
      email: user.email,
      roleKey: role.key,
      permissions: permissionKeys,
      tokenVersion: user.tokenVersion,
    },
    env.SESSION_SIGNING_KEY,
  );
  await setCachedTokenVersion(env.SESSIONS, user.id, user.tokenVersion);

  ctx.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.ENVIRONMENT !== 'development',
    sameSite: 'strict',
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
