import { defineMiddleware } from 'astro/middleware';
import { env } from 'cloudflare:workers';
import { SESSION_COOKIE_NAME, verifySessionToken } from './lib/auth/session';
import { getCachedTokenVersion } from './lib/auth/token-version';
import { isMutatingMethod, isSameOrigin } from './lib/http/csrf';
import { jsonError } from './lib/http/response';
import { CsrfError } from './lib/http/errors';

const ADMIN_PAGE_PREFIX = '/admin';
const ADMIN_LOGIN_PATH = '/admin/login';

export const onRequest = defineMiddleware(async (context, next) => {
  const token = context.cookies.get(SESSION_COOKIE_NAME)?.value;
  let session = token ? await verifySessionToken(token, env.SESSION_SIGNING_KEY) : null;

  if (session) {
    // Fail closed: a missing or mismatched cached tokenVersion means the
    // session has been invalidated server-side (password changed/reset,
    // or a future "log out everywhere") — never trust the JWT's own copy
    // of tokenVersion once it could be stale.
    const cachedVersion = await getCachedTokenVersion(env.SESSIONS, session.sub);
    if (cachedVersion === null || cachedVersion !== session.tokenVersion) {
      session = null;
      context.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
    }
  }

  context.locals.session = session;

  // CSRF defense-in-depth: SameSite=Strict is the primary defense; this
  // rejects a present-but-wrong Origin on cookie-authenticated mutations.
  // Public, unauthenticated endpoints (login, lead creation) don't carry a
  // prior session to forge, so they're exempt — Turnstile + rate limiting
  // + account lockout cover those instead.
  if (
    session &&
    context.request.method !== 'GET' &&
    isMutatingMethod(context.request.method) &&
    context.url.pathname.startsWith('/api/') &&
    !isSameOrigin(context.request.headers.get('origin'), env.SITE_URL)
  ) {
    return jsonError(new CsrfError());
  }

  // Server-side route protection for the admin UI — never rely on
  // client-side redirects alone.
  if (
    context.url.pathname.startsWith(ADMIN_PAGE_PREFIX) &&
    context.url.pathname !== ADMIN_LOGIN_PATH &&
    !session
  ) {
    const next = encodeURIComponent(context.url.pathname + context.url.search);
    return context.redirect(`${ADMIN_LOGIN_PATH}?next=${next}`, 302);
  }

  return next();
});
