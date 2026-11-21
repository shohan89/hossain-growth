const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 15 * 60;

/** Pure threshold check — kept separate from the KV I/O below for easy unit testing. */
export function shouldLockAccount(failedAttemptCount: number): boolean {
  return failedAttemptCount >= MAX_FAILED_ATTEMPTS;
}

function failKey(email: string): string {
  return `login_fail:${email.toLowerCase()}`;
}

export async function isAccountLocked(kv: KVNamespace, email: string): Promise<boolean> {
  const count = Number((await kv.get(failKey(email))) ?? '0');
  return shouldLockAccount(count);
}

/** Returns the new failed-attempt count. */
export async function recordFailedLogin(kv: KVNamespace, email: string): Promise<number> {
  const key = failKey(email);
  const current = Number((await kv.get(key)) ?? '0');
  const next = current + 1;
  await kv.put(key, String(next), { expirationTtl: LOCKOUT_WINDOW_SECONDS });
  return next;
}

export async function clearFailedLogins(kv: KVNamespace, email: string): Promise<void> {
  await kv.delete(failKey(email));
}

export { MAX_FAILED_ATTEMPTS, LOCKOUT_WINDOW_SECONDS };
