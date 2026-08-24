/**
 * This value is displayed only to help a first administrator bootstrap access.
 * The server remains responsible for validating the signed Google ID token.
 */
export function getGoogleSubject(idToken: string): string | null {
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const json = new TextDecoder().decode(Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)));
    const value: unknown = JSON.parse(json);
    return value && typeof value === 'object' && typeof (value as { sub?: unknown }).sub === 'string'
      ? (value as { sub: string }).sub.trim() || null
      : null;
  } catch {
    return null;
  }
}
