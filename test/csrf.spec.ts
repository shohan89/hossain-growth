import { describe, expect, it } from 'vitest';
import { isMutatingMethod, isSameOrigin } from '../src/lib/http/csrf';

describe('isMutatingMethod', () => {
  it('flags state-changing methods', () => {
    expect(isMutatingMethod('POST')).toBe(true);
    expect(isMutatingMethod('put')).toBe(true);
    expect(isMutatingMethod('PATCH')).toBe(true);
    expect(isMutatingMethod('DELETE')).toBe(true);
  });

  it('does not flag safe methods', () => {
    expect(isMutatingMethod('GET')).toBe(false);
    expect(isMutatingMethod('HEAD')).toBe(false);
    expect(isMutatingMethod('OPTIONS')).toBe(false);
  });
});

describe('isSameOrigin', () => {
  const siteUrl = 'https://hossaingrowth.com';

  it('allows a matching origin', () => {
    expect(isSameOrigin('https://hossaingrowth.com', siteUrl)).toBe(true);
  });

  it('rejects a different origin (CSRF attempt)', () => {
    expect(isSameOrigin('https://evil.example', siteUrl)).toBe(false);
  });

  it('rejects a different scheme on the same host', () => {
    expect(isSameOrigin('http://hossaingrowth.com', siteUrl)).toBe(false);
  });

  it('allows a missing Origin header (SameSite is the primary defense)', () => {
    expect(isSameOrigin(null, siteUrl)).toBe(true);
  });

  it('rejects a malformed Origin header', () => {
    expect(isSameOrigin('not-a-url', siteUrl)).toBe(false);
  });
});
