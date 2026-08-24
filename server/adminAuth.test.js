const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createGoogleIdTokenVerifier,
  createRequireAdmin,
} = require('./adminAuth');

const tenant = {
  id: 'school-a',
  workspaceDomain: 'school.example',
  initialAdminSubjects: ['bootstrap-admin'],
};

test('createGoogleIdTokenVerifier passes the configured OAuth client ID as the token audience', async () => {
  let received;
  const verifyGoogleIdToken = createGoogleIdTokenVerifier({
    clientId: 'client-id.apps.googleusercontent.com',
    oauth2Client: {
      async verifyIdToken(options) {
        received = options;
        return { getPayload: () => ({ sub: 'admin-subject', hd: 'school.example', email_verified: true }) };
      },
    },
  });

  const identity = await verifyGoogleIdToken('signed-id-token', tenant);

  assert.deepEqual(received, {
    idToken: 'signed-id-token',
    audience: 'client-id.apps.googleusercontent.com',
  });
  assert.equal(identity.subject, 'admin-subject');
});

test('createGoogleIdTokenVerifier rejects tokens from another Workspace domain', async () => {
  const verifyGoogleIdToken = createGoogleIdTokenVerifier({
    clientId: 'client-id.apps.googleusercontent.com',
    oauth2Client: {
      async verifyIdToken() {
        return { getPayload: () => ({ sub: 'admin-subject', hd: 'other.example', email_verified: true }) };
      },
    },
  });

  await assert.rejects(() => verifyGoogleIdToken('signed-id-token', tenant), /Workspace domain/i);
});

test('createRequireAdmin admits only an administrator registered for the resolved school', async () => {
  const requireAdmin = createRequireAdmin({
    verifyGoogleIdToken: async () => ({ subject: 'registered-admin', email: 'teacher@school.example' }),
    findAdmin: async ({ schoolId, subject }) => schoolId === 'school-a' && subject === 'registered-admin'
      ? { id: 'admin-1', schoolId, googleSubject: subject }
      : null,
  });
  const request = { tenant, headers: { authorization: 'Bearer id-token' } };
  let nextCalled = false;

  await requireAdmin(request, {}, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.deepEqual(request.admin, { id: 'admin-1', schoolId: 'school-a', googleSubject: 'registered-admin' });
});

test('createRequireAdmin rejects a valid Google identity that has no administrator role in this school', async () => {
  const requireAdmin = createRequireAdmin({
    verifyGoogleIdToken: async () => ({ subject: 'not-an-admin', email: 'teacher@school.example' }),
    findAdmin: async () => null,
  });
  const request = { tenant, headers: { authorization: 'Bearer id-token' } };
  let response;

  await requireAdmin(request, {
    status(code) {
      response = { code };
      return this;
    },
    json(body) {
      response.body = body;
    },
  }, () => { throw new Error('next must not be called'); });

  assert.deepEqual(response, { code: 403, body: { error: 'Administrator access required' } });
});

test('createRequireAdmin accepts only the configured bootstrap subject before its admin record exists', async () => {
  const requireAdmin = createRequireAdmin({
    verifyGoogleIdToken: async () => ({ subject: 'bootstrap-admin', email: 'principal@school.example' }),
    findAdmin: async () => null,
  });
  const request = { tenant, headers: { authorization: 'Bearer id-token' } };

  await requireAdmin(request, {}, () => {});

  assert.deepEqual(request.admin, {
    id: null,
    schoolId: 'school-a',
    googleSubject: 'bootstrap-admin',
    isBootstrapAdmin: true,
  });
});
