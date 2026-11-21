import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { adminUsers, passwordResetTokens } from '../../../lib/db/schema';
import { requestPasswordResetSchema } from '../../../lib/validation/auth';
import {
  generateResetToken,
  hashResetToken,
  RESET_TOKEN_TTL_SECONDS,
} from '../../../lib/auth/reset-token';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { ApiError } from '../../../lib/http/errors';
import { enforceRateLimit, getClientIp } from '../../../lib/rate-limit';
import { verifyTurnstileToken } from '../../../lib/turnstile';
import { logActivity } from '../../../lib/audit';

export const prerender = false;

// Deliberately the same message whether or not the email exists — never
// reveal account existence through response differences.
const GENERIC_RESPONSE = {
  requested: true,
  message: 'If that email is associated with an account, a reset link has been sent.',
};

export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const ip = getClientIp(ctx.request);
  await enforceRateLimit(env.SESSIONS, ip, {
    action: 'password-reset-request',
    limit: 5,
    windowSeconds: 60,
  });

  const body = requestPasswordResetSchema.parse(await ctx.request.json());
  const email = body.email.toLowerCase();

  const turnstileOk = await verifyTurnstileToken(body.turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
  if (!turnstileOk) {
    throw new ApiError(400, 'TURNSTILE_FAILED', 'Bot verification failed. Please try again.');
  }

  const db = drizzle(env.DB, { schema });
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);

  if (!user || !user.isActive) {
    // No token issued, no error — identical response either way.
    return jsonOk(GENERIC_RESPONSE);
  }

  const token = generateResetToken();
  const tokenHash = await hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000);

  await db.insert(passwordResetTokens).values({
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  await logActivity(db, {
    userId: user.id,
    action: 'auth.password_reset_requested',
    entityType: 'admin_user',
    entityId: user.id,
    ipAddress: ip,
  });

  // TODO(email-integration): this project has no email provider wired up
  // yet (see docs/DEVELOPMENT_ROADMAP.md). Until then, the token is only
  // ever surfaced in `development` so the reset flow can be tested locally
  // — it is NEVER included in the response in staging/production.
  if (env.ENVIRONMENT === 'development') {
    return jsonOk({ ...GENERIC_RESPONSE, devOnlyResetToken: token });
  }

  return jsonOk(GENERIC_RESPONSE);
});
