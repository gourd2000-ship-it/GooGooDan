const test = require('node:test');
const assert = require('node:assert/strict');

const { createStudentAuthHttpHandlers, createStudentAuthService, hashAccessCode } = require('./auth');

const tenant = { id: 'school-a' };

async function createService(now = new Date('2026-08-24T00:00:00Z')) {
  const codeHash = await hashAccessCode('1234');
  const sessions = new Map();
  const repository = {
    async findActiveStudentsByClass({ schoolId, grade, classNumber }) {
      if (schoolId !== 'school-a' || grade !== 3 || classNumber !== 2) return [];
      return [{ id: 'student-a', schoolId, grade, classNumber, studentName: 'Kim', accessCodeHash: codeHash }];
    },
    async createSession(session) { sessions.set(session.tokenHash, session); },
    async findSession(tokenHash) { return sessions.get(tokenHash) || null; },
    async revokeSession(tokenHash) { const session = sessions.get(tokenHash); if (session) session.revokedAt = now; },
    async updateAccessCodeHash({ studentId, accessCodeHash }) { this.updated = { studentId, accessCodeHash }; },
  };
  return { service: createStudentAuthService({ repository, now: () => now, tokenGenerator: () => 'opaque-token', sessionTtlMs: 60_000 }), repository };
}

test('student login authenticates only a matching school, grade, class, and four-digit PIN', async () => {
  const { service } = await createService();

  const login = await service.login({ tenant, grade: 3, classNumber: 2, accessCode: '1234' });

  assert.equal(login.token, 'opaque-token');
  assert.deepEqual(login.student, { id: 'student-a', schoolId: 'school-a', grade: 3, classNumber: 2, studentName: 'Kim' });
  await assert.rejects(() => service.login({ tenant, grade: 3, classNumber: 2, accessCode: '0000' }), /Invalid student credentials/);
});

test('student session restore rejects revoked and expired opaque tokens', async () => {
  const { service } = await createService();
  await service.login({ tenant, grade: 3, classNumber: 2, accessCode: '1234' });

  assert.equal((await service.restore({ tenant, token: 'opaque-token' })).id, 'student-a');
  await service.logout({ token: 'opaque-token' });
  await assert.rejects(() => service.restore({ tenant, token: 'opaque-token' }), /Invalid or expired session/);
});

test('student access-code change verifies the current PIN and only persists a hash', async () => {
  const { service, repository } = await createService();
  await service.login({ tenant, grade: 3, classNumber: 2, accessCode: '1234' });

  await service.changeAccessCode({ tenant, token: 'opaque-token', currentAccessCode: '1234', newAccessCode: '4321' });

  assert.equal(repository.updated.studentId, 'student-a');
  assert.notEqual(repository.updated.accessCodeHash, '4321');
  await assert.rejects(() => service.changeAccessCode({ tenant, token: 'opaque-token', currentAccessCode: '1111', newAccessCode: '2222' }), /Invalid access code/);
});

test('student login handler sets an HttpOnly session cookie and never returns the PIN or token', async () => {
  const service = {
    async login() { return { token: 'secret-token', student: { id: 'student-a', schoolId: 'school-a', grade: 3, classNumber: 2, studentName: 'Kim' }, expiresAt: new Date() }; },
  };
  const { login } = createStudentAuthHttpHandlers({ service, cookieOptions: { httpOnly: true } });
  const response = { cookie(name, value, options) { this.cookieValue = { name, value, options }; }, status() { return this; }, json(body) { this.body = body; } };

  await login({ tenant, body: { grade: 3, classNumber: 2, accessCode: '1234' } }, response);

  assert.deepEqual(response.cookieValue, { name: 'student_session', value: 'secret-token', options: { httpOnly: true } });
  assert.deepEqual(response.body, { student: { id: 'student-a', schoolId: 'school-a', grade: 3, classNumber: 2, studentName: 'Kim' } });
});

test('student session handler reads the cookie and rejects a missing or invalid session', async () => {
  const service = { async restore({ token }) { if (token !== 'good-token') throw new Error('Invalid or expired session'); return { id: 'student-a' }; } };
  const { session } = createStudentAuthHttpHandlers({ service, cookieOptions: {} });
  const response = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };

  await session({ tenant, headers: { cookie: 'student_session=good-token' } }, response);
  assert.deepEqual(response.body, { student: { id: 'student-a' } });
  await session({ tenant, headers: {} }, response);
  assert.equal(response.statusCode, 401);
});
