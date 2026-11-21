import { describe, expect, it } from 'vitest';
import { hasPermission, requirePermission, requireSession } from '../src/lib/auth/rbac';
import { ForbiddenError, UnauthorizedError } from '../src/lib/http/errors';
import type { SessionPayload } from '../src/lib/auth/session';

const session: SessionPayload = {
  sub: 'user_1',
  email: 'test@example.test',
  roleKey: 'editor',
  permissions: ['leads.read', 'leads.write'],
};

describe('requireSession', () => {
  it('returns the session when present', () => {
    expect(requireSession(session)).toBe(session);
  });

  it('throws UnauthorizedError when null', () => {
    expect(() => requireSession(null)).toThrow(UnauthorizedError);
  });
});

describe('requirePermission', () => {
  it('returns the session when permission is present', () => {
    expect(requirePermission(session, 'leads.read')).toBe(session);
  });

  it('throws ForbiddenError when permission is missing', () => {
    expect(() => requirePermission(session, 'leads.delete')).toThrow(ForbiddenError);
  });

  it('throws UnauthorizedError when there is no session at all', () => {
    expect(() => requirePermission(null, 'leads.read')).toThrow(UnauthorizedError);
  });
});

describe('hasPermission', () => {
  it('is true for a granted permission', () => {
    expect(hasPermission(session, 'leads.write')).toBe(true);
  });

  it('is false for a missing permission', () => {
    expect(hasPermission(session, 'leads.delete')).toBe(false);
  });

  it('is false when session is null', () => {
    expect(hasPermission(null, 'leads.read')).toBe(false);
  });
});
