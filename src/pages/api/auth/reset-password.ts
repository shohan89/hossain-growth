import type { APIRoute } from 'astro';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { adminUsers, passwordResetTokens } from '../../../lib/db/schema';
import { resetPasswordSchema } from '../../../lib/validation/auth';
import { hashResetToken } from '../../../lib/auth/reset-token';
import { hashPassword } from '../../../lib/auth/password';
import { setCachedTokenVersion } from '../../../lib/auth/token-version';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { ApiError } from '../../../lib/http/errors';
import { enforceRateLimit, getClientIp } from '../../../lib/rate-limit';
import { logActivity } from '../../../lib/audit';

export const prerender = false;

export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const ip = getClientIp(ctx.request);
  await enforceRateLimit(env.SESSIONS, ip, {
    action: 'password-reset-confirm',
    limit: 10,
    windowSeconds: 60,
  });

  const body = resetPasswordSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });
  const tokenHash = await hashResetToken(body.token);

  const invalidToken = () =>
    new ApiError(400, 'INVALID_RESET_TOKEN', 'This reset link is invalid or has expired.');

  const [resetRow] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!resetRow) throw invalidToken();

  const passwordHash = await hashPassword(body.newPassword);

  const [updatedUser] = await db
    .update(adminUsers)
    .set({ passwordHash, tokenVersion: sql`${adminUsers.tokenVersion} + 1` })
    .where(eq(adminUsers.id, resetRow.userId))
    .returning();

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, resetRow.id));

  await setCachedTokenVersion(env.SESSIONS, updatedUser.id, updatedUser.tokenVersion);

  await logActivity(db, {
    userId: updatedUser.id,
    action: 'auth.password_reset_completed',
    entityType: 'admin_user',
    entityId: updatedUser.id,
    ipAddress: ip,
  });

  return jsonOk({ reset: true, message: 'Password has been reset. Please log in.' });
});
