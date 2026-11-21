import type { APIRoute } from 'astro';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';
import { requireSession } from '../../../lib/auth/rbac';

export const prerender = false;

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  const session = requireSession(ctx.locals.session);
  return jsonOk({
    id: session.sub,
    email: session.email,
    role: session.roleKey,
    permissions: session.permissions,
  });
});
