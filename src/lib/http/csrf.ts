const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function isMutatingMethod(method: string): boolean {
  return MUTATING_METHODS.has(method.toUpperCase());
}

/**
 * Compares the request's Origin header against the site's own origin.
 * Defense-in-depth alongside SameSite=Strict cookies: a request forged from
 * another site won't carry a matching Origin even if a browser bug or an
 * older client ever sent the session cookie cross-site.
 *
 * Returns true (allowed) when the Origin header is absent — some same-site
 * requests (plain non-fetch navigations, some older clients) omit it, and
 * SameSite=Strict is already the primary defense; this check only rejects
 * an Origin that's present and *wrong*.
 */
export function isSameOrigin(originHeader: string | null, siteUrl: string): boolean {
  if (!originHeader) return true;
  try {
    return new URL(originHeader).origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}
