import { redirects } from './db/schema';
import type { AppDb } from './db/client';

export const REDIRECTS_CACHE_KEY = 'redirects:map';
const CACHE_KEY = REDIRECTS_CACHE_KEY;
const CACHE_TTL_SECONDS = 300;

interface RedirectEntry {
  toPath: string;
  statusCode: number;
}

/**
 * Admin-managed redirects are checked on every public page request, so a
 * D1 query per request would be a real performance cost for a feature
 * that changes rarely. The full redirect map is cached in KV (the
 * otherwise-unused `CACHE` binding) for a few minutes; a newly created or
 * edited redirect can take up to that long to take effect — a deliberate
 * trade-off against hitting D1 on every single page view.
 */
export async function getCachedRedirect(
  db: AppDb,
  cache: KVNamespace,
  fromPath: string,
): Promise<RedirectEntry | null> {
  let map = await cache.get<Record<string, RedirectEntry>>(CACHE_KEY, 'json');

  if (!map) {
    const rows = await db.select().from(redirects);
    map = Object.fromEntries(
      rows.map((row) => [row.fromPath, { toPath: row.toPath, statusCode: row.statusCode }]),
    );
    await cache.put(CACHE_KEY, JSON.stringify(map), { expirationTtl: CACHE_TTL_SECONDS });
  }

  return map[fromPath] ?? null;
}
