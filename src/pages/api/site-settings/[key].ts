import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { siteSettings } from '../../../lib/db/schema';
import { siteSettingValueSchema } from '../../../lib/validation/settings';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { NotFoundError } from '../../../lib/http/errors';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';

export const prerender = false;

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.SETTINGS_WRITE);
  const key = ctx.params.key as string;
  const db = drizzle(env.DB, { schema });
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
  if (!row) throw new NotFoundError(`Setting "${key}" not found.`);
  return jsonOk(row);
});

export const PUT: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.SETTINGS_WRITE);
  const key = ctx.params.key as string;
  const { value } = siteSettingValueSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });

  await db
    .insert(siteSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });

  await logActivity(db, {
    userId: session.sub,
    action: 'site_settings.updated',
    entityType: 'site_settings',
    entityId: key,
    ipAddress: getClientIp(ctx.request),
  });

  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
  return jsonOk(row);
});
