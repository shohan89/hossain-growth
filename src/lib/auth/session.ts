import { SignJWT, jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'hg_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export interface SessionPayload {
  sub: string; // admin_users.id
  email: string;
  roleKey: string;
  permissions: string[];
  tokenVersion: number;
}

function getSigningKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: SessionPayload,
  secret: string,
): Promise<{ token: string; maxAge: number }> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSigningKey(secret));
  return { token, maxAge: SESSION_TTL_SECONDS };
}

/**
 * Verifies signature and expiration only. Does NOT check tokenVersion
 * against the live KV cache — that's the middleware's job, since it needs
 * a KV read this pure function shouldn't own (keeps this testable without
 * any binding).
 */
export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(secret));
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.roleKey !== 'string' ||
      typeof payload.tokenVersion !== 'number' ||
      !Array.isArray(payload.permissions)
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      roleKey: payload.roleKey,
      permissions: payload.permissions as string[],
      tokenVersion: payload.tokenVersion,
    };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS };
