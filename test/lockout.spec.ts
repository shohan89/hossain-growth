import { describe, expect, it } from 'vitest';
import { MAX_FAILED_ATTEMPTS, shouldLockAccount } from '../src/lib/auth/lockout';

describe('shouldLockAccount', () => {
  it('does not lock below the threshold', () => {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      expect(shouldLockAccount(i)).toBe(false);
    }
  });

  it('locks at and above the threshold', () => {
    expect(shouldLockAccount(MAX_FAILED_ATTEMPTS)).toBe(true);
    expect(shouldLockAccount(MAX_FAILED_ATTEMPTS + 10)).toBe(true);
  });

  it('never locks on zero failures', () => {
    expect(shouldLockAccount(0)).toBe(false);
  });
});
