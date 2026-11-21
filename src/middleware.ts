import { defineMiddleware } from 'astro/middleware';
import { env } from 'cloudflare:workers';
import { SESSION_COOKIE_NAME, verifySessionToken } from './lib/auth/session';

export const onRequest = defineMiddleware(async (context, next) => {
  const token = context.cookies.get(SESSION_COOKIE_NAME)?.value;
  context.locals.session = token ? await verifySessionToken(token, env.SESSION_SIGNING_KEY) : null;
  return next();
});
