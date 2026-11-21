import { describe, expect, it } from 'vitest';
import { offsetFor, parseListQuery } from '../src/lib/http/pagination';
import { ValidationError } from '../src/lib/http/errors';

describe('parseListQuery', () => {
  it('applies defaults when no query params are given', () => {
    const result = parseListQuery(new URL('https://example.test/api/things'), ['name']);
    expect(result).toEqual({
      page: 1,
      pageSize: 20,
      sortDir: 'desc',
      sortBy: undefined,
      search: undefined,
    });
  });

  it('parses page, pageSize, sortBy, sortDir, and search', () => {
    const url = new URL(
      'https://example.test/api/things?page=3&pageSize=10&sortBy=name&sortDir=asc&search=hello',
    );
    const result = parseListQuery(url, ['name']);
    expect(result).toEqual({
      page: 3,
      pageSize: 10,
      sortDir: 'asc',
      sortBy: 'name',
      search: 'hello',
    });
  });

  it('rejects a sortBy column that is not allow-listed', () => {
    const url = new URL('https://example.test/api/things?sortBy=password_hash');
    expect(() => parseListQuery(url, ['name'])).toThrow(ValidationError);
  });

  it('rejects pageSize above the max', () => {
    const url = new URL('https://example.test/api/things?pageSize=1000');
    expect(() => parseListQuery(url, ['name'])).toThrow(ValidationError);
  });
});

describe('offsetFor', () => {
  it('computes offset from page and pageSize', () => {
    expect(offsetFor({ page: 1, pageSize: 20, sortDir: 'desc' })).toBe(0);
    expect(offsetFor({ page: 3, pageSize: 10, sortDir: 'desc' })).toBe(20);
  });
});
