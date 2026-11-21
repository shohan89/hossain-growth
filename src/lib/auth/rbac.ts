import type { SessionPayload } from './session';
import { ForbiddenError, UnauthorizedError } from '../http/errors';

export function requireSession(session: SessionPayload | null): SessionPayload {
  if (!session) throw new UnauthorizedError();
  return session;
}

export function requirePermission(
  session: SessionPayload | null,
  permission: string,
): SessionPayload {
  const current = requireSession(session);
  if (!current.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing required permission: ${permission}`);
  }
  return current;
}

export function hasPermission(session: SessionPayload | null, permission: string): boolean {
  return Boolean(session?.permissions.includes(permission));
}
