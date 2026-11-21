import { RateLimitedError } from './http/errors';

export interface RateLimitOptions {
  /** Unique name for the limited action, e.g. "login" or "lead-create". */
  action: string;
  /** Max requests allowed within the window. */
  limit: number;
  /** Window size in seconds. */
  windowSeconds: number;
}

export function getClientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? 'unknown';
}

/**
 * Fixed-window rate limiter backed by KV. Not perfectly precise at window
 * boundaries, but cheap and adequate for slowing down abuse on sensitive
 * endpoints (login, public lead submission).
 */
export async function enforceRateLimit(
  kv: KVNamespace,
  identifier: string,
  options: RateLimitOptions,
): Promise<void> {
  const window = Math.floor(Date.now() / 1000 / options.windowSeconds);
  const key = `ratelimit:${options.action}:${identifier}:${window}`;

  const current = Number((await kv.get(key)) ?? '0');
  if (current >= options.limit) {
    throw new RateLimitedError();
  }

  await kv.put(key, String(current + 1), { expirationTtl: options.windowSeconds + 5 });
}
