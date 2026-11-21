import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { adminUsers } from '../../../lib/db/schema';
import { changePasswordSchema } from '../../../lib/validation/auth';
import { hashPassword, verifyPassword } from '../../../lib/auth/password';
import { requireSession } from '../../../lib/auth/rbac';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { ApiError, NotFoundError } from '../../../lib/http/errors';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const session = requireSession(ctx.locals.session);
  const body = changePasswordSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, session.sub)).limit(1);
  if (!user) throw new NotFoundError('User not found.');

  const valid = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect.');

  const passwordHash = await hashPassword(body.newPassword);
  await db.update(adminUsers).set({ passwordHash }).where(eq(adminUsers.id, user.id));

  await logActivity(db, {
    userId: user.id,
    action: 'auth.password_changed',
    entityType: 'admin_user',
    entityId: user.id,
    ipAddress: getClientIp(ctx.request),
  });

  return jsonOk({ changed: true });
});
