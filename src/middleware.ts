import { defineMiddleware } from 'astro/middleware';
import { env } from 'cloudflare:workers';
import { SESSION_COOKIE_NAME, verifySessionToken } from './lib/auth/session';
import { getCachedTokenVersion } from './lib/auth/token-version';
import { isMutatingMethod, isSameOrigin } from './lib/http/csrf';
import { jsonError } from './lib/http/response';
import { CsrfError } from './lib/http/errors';
import { getDb } from './lib/db/client';
import { getCachedRedirect } from './lib/redirect-cache';

const ADMIN_PAGE_PREFIX = '/admin';
const ADMIN_LOGIN_PATH = '/admin/login';

export const onRequest = defineMiddleware(async (context, next) => {
  // Admin-managed redirects (Navigation module's "Redirects" tab) —
  // checked first and only for public GET page requests, so a
  // retired/moved URL redirects before anything else runs. Never applies
  // to /admin or /api. The map is KV-cached (see getCachedRedirect) so
  // this doesn't mean a D1 query on every request.
  if (
    context.request.method === 'GET' &&
    !context.url.pathname.startsWith(ADMIN_PAGE_PREFIX) &&
    !context.url.pathname.startsWith('/api/')
  ) {
    const db = getDb(env.DB);
    const redirect = await getCachedRedirect(db, env.CACHE, context.url.pathname);
    if (redirect) {
      return context.redirect(redirect.toPath, redirect.statusCode as 301 | 302 | 307 | 308);
    }
  }

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

  const response = await next();

  // Light edge/browser caching for public pages only — admin pages are
  // session-specific and already noindexed, so they're excluded. Content
  // is CMS-driven and can change at any time, so this intentionally
  // stays short: a brief `max-age` plus `stale-while-revalidate` lets
  // Cloudflare's edge serve a cached copy for a few seconds while
  // revalidating in the background, which meaningfully helps repeat page
  // views without risking long-lived stale content after an edit.
  if (
    context.request.method === 'GET' &&
    response.status === 200 &&
    !context.url.pathname.startsWith(ADMIN_PAGE_PREFIX) &&
    !context.url.pathname.startsWith('/api/') &&
    (response.headers.get('content-type')?.includes('text/html') ?? false)
  ) {
    try {
      response.headers.set(
        'cache-control',
        'public, max-age=0, s-maxage=30, stale-while-revalidate=300',
      );
    } catch {
      // Some response objects have immutable headers — caching is a
      // nice-to-have, never worth failing the request over.
    }
  }

  return response;
});
