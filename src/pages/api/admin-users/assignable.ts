import type { APIRoute } from 'astro';
import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { adminUsers } from '../../../lib/db/schema';
import { requireSession } from '../../../lib/auth/rbac';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';

export const prerender = false;

/**
 * Minimal admin-user lookup (id/name/email only) for any authenticated
 * admin — used to populate assignee/author pickers in the dashboard.
 * Deliberately NOT gated behind `users.manage`: roles that can assign
 * leads or author content (e.g. editor) still need to see who else is
 * assignable, without being able to manage accounts.
 */
export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requireSession(ctx.locals.session);
  const db = drizzle(env.DB, { schema });

  const rows = await db
    .select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email })
    .from(adminUsers)
    .where(eq(adminUsers.isActive, true))
    .orderBy(asc(adminUsers.name));

  return jsonOk(rows);
});
