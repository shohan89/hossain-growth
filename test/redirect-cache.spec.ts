import { describe, expect, it, vi } from 'vitest';
import { getCachedRedirect } from '../src/lib/redirect-cache';

function fakeKv(initial: Record<string, unknown> = {}) {
  const store = new Map<string, string>(
    Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]),
  );
  return {
    get: vi.fn(async (key: string) => {
      const raw = store.get(key);
      return raw ? JSON.parse(raw) : null;
    }),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    store,
  };
}

function fakeDb(rows: { fromPath: string; toPath: string; statusCode: number }[]) {
  const from = vi.fn().mockResolvedValue(rows);
  const select = vi.fn().mockReturnValue({ from });
  return { db: { select } as never, select, from };
}

describe('getCachedRedirect', () => {
  it('builds the map from D1 on a cache miss and caches it', async () => {
    const kv = fakeKv();
    const { db, select } = fakeDb([{ fromPath: '/old', toPath: '/new', statusCode: 301 }]);

    const result = await getCachedRedirect(db, kv as never, '/old');

    expect(result).toEqual({ toPath: '/new', statusCode: 301 });
    expect(select).toHaveBeenCalledTimes(1);
    expect(kv.put).toHaveBeenCalledTimes(1);
  });

  it('serves from the KV cache without touching D1 on a cache hit', async () => {
    const kv = fakeKv({ 'redirects:map': { '/old': { toPath: '/new', statusCode: 301 } } });
    const { db, select } = fakeDb([]);

    const result = await getCachedRedirect(db, kv as never, '/old');

    expect(result).toEqual({ toPath: '/new', statusCode: 301 });
    expect(select).not.toHaveBeenCalled();
  });

  it('returns null for a path with no matching redirect', async () => {
    const kv = fakeKv({ 'redirects:map': {} });
    const { db } = fakeDb([]);

    const result = await getCachedRedirect(db, kv as never, '/not-configured');

    expect(result).toBeNull();
  });
});
