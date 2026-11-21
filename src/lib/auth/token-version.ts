import { SESSION_TTL_SECONDS } from './session';

function key(userId: string): string {
  return `tokenver:${userId}`;
}

/** Call at login and on every tokenVersion bump (password change/reset). */
export async function setCachedTokenVersion(
  kv: KVNamespace,
  userId: string,
  version: number,
): Promise<void> {
  await kv.put(key(userId), String(version), { expirationTtl: SESSION_TTL_SECONDS });
}

/** Returns null if not cached — middleware treats that as "invalidate" (fail closed, see src/middleware.ts). */
export async function getCachedTokenVersion(
  kv: KVNamespace,
  userId: string,
): Promise<number | null> {
  const value = await kv.get(key(userId));
  return value === null ? null : Number(value);
}
