const test = require('node:test');
const assert = require('node:assert/strict');

const { createCorsOptions, createSessionCookieOptions } = require('./httpSecurity');

test('createSessionCookieOptions uses HttpOnly and Secure cross-site cookies in production', () => {
  assert.deepEqual(createSessionCookieOptions({ NODE_ENV: 'production' }, 60_000), {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 60_000,
  });
});

test('createSessionCookieOptions keeps local development usable without weakening production settings', () => {
  assert.deepEqual(createSessionCookieOptions({ NODE_ENV: 'development' }, 60_000), {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60_000,
  });
});

test('createCorsOptions allows credentials only for configured client origins', () => {
  const options = createCorsOptions(['https://app.school.example']);
  let allowed;
  options.origin('https://app.school.example', (error, value) => { allowed = { error, value }; });
  assert.deepEqual(allowed, { error: null, value: true });
  assert.equal(options.credentials, true);

  options.origin('https://attacker.example', (error, value) => { allowed = { error, value }; });
  assert.deepEqual(allowed, { error: null, value: false });
});
