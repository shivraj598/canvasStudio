import { describe, expect, it } from 'vitest';
import { readBearerToken } from './plugin.js';

describe('readBearerToken', () => {
  it('extracts the token from a bearer header', () => {
    expect(readBearerToken('Bearer abc123')).toBe('abc123');
    expect(readBearerToken('bearer   abc123 ')).toBe('abc123');
  });

  it('ignores missing or malformed headers', () => {
    expect(readBearerToken(undefined)).toBeNull();
    expect(readBearerToken('')).toBeNull();
    expect(readBearerToken('Basic dXNlcjpwYXNz')).toBeNull();
    expect(readBearerToken('Bearer')).toBeNull();
    expect(readBearerToken('Bearer a b')).toBeNull();
  });
});
