import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from '../src/lib/auth/session';

const SECRET = 'test-signing-secret-at-least-32-bytes-long';

const payload: SessionPayload = {
  sub: 'user_1',
  email: 'test@example.test',
  roleKey: 'admin',
  permissions: ['leads.read'],
  tokenVersion: 0,
};

describe('createSessionToken / verifySessionToken', () => {
  it('round-trips a valid token', async () => {
    const { token } = await createSessionToken(payload, SECRET);
    const verified = await verifySessionToken(token, SECRET);
    expect(verified).toEqual(payload);
  });

  it('rejects a token signed with a different secret', async () => {
    const { token } = await createSessionToken(payload, SECRET);
    const verified = await verifySessionToken(token, 'a-completely-different-secret-value');
    expect(verified).toBeNull();
  });

  it('rejects a tampered token', async () => {
    const { token } = await createSessionToken(payload, SECRET);
    const tampered = token.slice(0, -4) + 'abcd';
    const verified = await verifySessionToken(tampered, SECRET);
    expect(verified).toBeNull();
  });

  it('rejects an expired token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now - 120)
      .setExpirationTime(now - 60) // expired one minute ago
      .sign(new TextEncoder().encode(SECRET));

    const verified = await verifySessionToken(expired, SECRET);
    expect(verified).toBeNull();
  });

  it('rejects a malformed payload (missing fields)', async () => {
    const malformed = await new SignJWT({ sub: 'user_1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET));

    const verified = await verifySessionToken(malformed, SECRET);
    expect(verified).toBeNull();
  });
});
