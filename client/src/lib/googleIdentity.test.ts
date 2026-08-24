import { describe, expect, it } from 'vitest';
import { getGoogleSubject } from './googleIdentity';

describe('getGoogleSubject', () => {
  it('reads only the subject from a Google ID token payload', () => {
    const token = 'header.eyJzdWIiOiIxMjM0NTY3ODkwMTIzNDU2Nzg5MDEiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIn0.signature';

    expect(getGoogleSubject(token)).toBe('123456789012345678901');
  });

  it('returns null for a malformed token or a token without a subject', () => {
    expect(getGoogleSubject('not-a-jwt')).toBeNull();
    expect(getGoogleSubject('header.eyJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIn0.signature')).toBeNull();
  });
});
