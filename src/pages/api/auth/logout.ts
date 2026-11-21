import type { APIRoute } from 'astro';
import { SESSION_COOKIE_NAME } from '../../../lib/auth/session';
import { jsonOk, withErrorHandling } from '../../../lib/http/response';

export const prerender = false;

export const POST: APIRoute = withErrorHandling(async (ctx) => {
  ctx.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
  return jsonOk({ loggedOut: true });
});
