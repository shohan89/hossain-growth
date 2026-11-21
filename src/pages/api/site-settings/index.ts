import type { APIRoute } from 'astro';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { siteSettings } from '../../../lib/db/schema';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';

export const prerender = false;

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.SETTINGS_WRITE);
  const db = drizzle(env.DB, { schema });
  const rows = await db.select().from(siteSettings);
  return jsonOk(rows);
});
