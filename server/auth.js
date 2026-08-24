const { createHash, randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(scryptCallback);
const ACCESS_CODE_PATTERN = /^\d{4}$/;

function validateAccessCode(accessCode) {
  return typeof accessCode === 'string' && ACCESS_CODE_PATTERN.test(accessCode);
}

async function hashAccessCode(accessCode) {
  if (!validateAccessCode(accessCode)) throw new Error('Access code must contain exactly four digits');
  const salt = randomBytes(16).toString('hex');
  const digest = await scrypt(accessCode, salt, 64);
  return `${salt}:${Buffer.from(digest).toString('hex')}`;
}

async function verifyAccessCode(accessCode, storedHash) {
  if (!validateAccessCode(accessCode) || typeof storedHash !== 'string') return false;
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex || !/^[0-9a-f]+$/i.test(expectedHex)) return false;
  const actual = Buffer.from(await scrypt(accessCode, salt, 64));
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function publicStudent(student) {
  return {
    id: student.id,
    schoolId: student.schoolId,
    grade: student.grade,
    classNumber: student.classNumber,
    studentName: student.studentName,
  };
}

function validateClassInput(grade, classNumber) {
  return Number.isInteger(grade) && grade >= 1 && grade <= 6
    && Number.isInteger(classNumber) && classNumber > 0;
}

function getCookieValue(cookieHeader, name) {
  if (typeof cookieHeader !== 'string') return null;
  const prefix = `${name}=`;
  const entry = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(prefix.length));
  } catch {
    return null;
  }
}

function createStudentAuthHttpHandlers({ service, cookieOptions }) {
  const sessionTokenFor = (req) => getCookieValue(req.headers.cookie, 'student_session');
  const unauthorized = (res) => res.status(401).json({ error: 'Student authentication required' });

  return {
    async login(req, res) {
      try {
        const login = await service.login({ tenant: req.tenant, ...req.body });
        res.cookie('student_session', login.token, cookieOptions);
        return res.status(200).json({ student: login.student });
      } catch {
        return res.status(401).json({ error: 'Invalid student credentials' });
      }
    },
    async session(req, res) {
      const token = sessionTokenFor(req);
      if (!token) return unauthorized(res);
      try {
        return res.json({ student: await service.restore({ tenant: req.tenant, token }) });
      } catch {
        return unauthorized(res);
      }
    },
    async logout(req, res) {
      await service.logout({ token: sessionTokenFor(req) });
      res.clearCookie('student_session', cookieOptions);
      return res.status(204).end();
    },
    async changeAccessCode(req, res) {
      const token = sessionTokenFor(req);
      if (!token) return unauthorized(res);
      try {
        await service.changeAccessCode({ tenant: req.tenant, token, ...req.body });
        return res.status(204).end();
      } catch {
        return res.status(400).json({ error: 'Unable to change access code' });
      }
    },
    async requireStudent(req, res, next) {
      const token = sessionTokenFor(req);
      if (!token) return unauthorized(res);
      try {
        req.student = await service.restore({ tenant: req.tenant, token });
        return next();
      } catch {
        return unauthorized(res);
      }
    },
  };
}

function createPgStudentAuthRepository(pool) {
  return {
    async findActiveStudentsByClass({ schoolId, grade, classNumber }) {
      const { rows } = await pool.query(
        'SELECT id, school_id, grade, class_number, student_name, access_code_hash FROM students WHERE school_id = $1 AND grade = $2 AND class_number = $3 AND is_active = true',
        [schoolId, grade, classNumber],
      );
      return rows.map((row) => ({ id: row.id, schoolId: row.school_id, grade: row.grade, classNumber: row.class_number, studentName: row.student_name, accessCodeHash: row.access_code_hash }));
    },
    async createSession({ tokenHash, studentId, expiresAt }) {
      await pool.query('INSERT INTO student_sessions (student_id, token_hash, expires_at) VALUES ($1, $2, $3)', [studentId, tokenHash, expiresAt]);
    },
    async findSession(tokenHash) {
      const { rows } = await pool.query(
        'SELECT ss.token_hash, ss.expires_at, ss.revoked_at, s.id, s.school_id, s.grade, s.class_number, s.student_name FROM student_sessions ss JOIN students s ON s.id = ss.student_id WHERE ss.token_hash = $1 AND s.is_active = true',
        [tokenHash],
      );
      const row = rows[0];
      return row ? { tokenHash: row.token_hash, expiresAt: row.expires_at, revokedAt: row.revoked_at, schoolId: row.school_id, student: { id: row.id, schoolId: row.school_id, grade: row.grade, classNumber: row.class_number, studentName: row.student_name } } : null;
    },
    async revokeSession(tokenHash) {
      await pool.query('UPDATE student_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [tokenHash]);
    },
    async updateAccessCodeHash({ studentId, accessCodeHash }) {
      await pool.query('UPDATE students SET access_code_hash = $2 WHERE id = $1 AND is_active = true', [studentId, accessCodeHash]);
    },
  };
}

function createStudentAuthService({ repository, now = () => new Date(), tokenGenerator = () => randomBytes(32).toString('base64url'), sessionTtlMs = 14 * 24 * 60 * 60 * 1000 }) {
  async function restore({ tenant, token }) {
    if (!tenant || typeof token !== 'string' || !token) throw new Error('Invalid or expired session');
    const session = await repository.findSession(hashSessionToken(token));
    if (!session || session.schoolId !== tenant.id || session.revokedAt || new Date(session.expiresAt) <= now()) {
      throw new Error('Invalid or expired session');
    }
    return publicStudent(session.student);
  }

  return {
    async login({ tenant, grade, classNumber, accessCode }) {
      if (!tenant || !validateClassInput(grade, classNumber) || !validateAccessCode(accessCode)) {
        throw new Error('Invalid student credentials');
      }
      const students = await repository.findActiveStudentsByClass({ schoolId: tenant.id, grade, classNumber });
      let student = null;
      for (const candidate of students) {
        if (await verifyAccessCode(accessCode, candidate.accessCodeHash)) {
          student = candidate;
          break;
        }
      }
      if (!student) throw new Error('Invalid student credentials');

      const token = tokenGenerator();
      const expiresAt = new Date(now().getTime() + sessionTtlMs);
      await repository.createSession({
        tokenHash: hashSessionToken(token),
        studentId: student.id,
        schoolId: student.schoolId,
        student: publicStudent(student),
        expiresAt,
        revokedAt: null,
      });
      return { token, student: publicStudent(student), expiresAt };
    },

    restore,

    async logout({ token }) {
      if (typeof token !== 'string' || !token) return;
      await repository.revokeSession(hashSessionToken(token));
    },

    async changeAccessCode({ tenant, token, currentAccessCode, newAccessCode }) {
      const student = await restore({ tenant, token });
      const candidates = await repository.findActiveStudentsByClass({
        schoolId: student.schoolId,
        grade: student.grade,
        classNumber: student.classNumber,
      });
      const currentStudent = candidates.find((candidate) => candidate.id === student.id);
      if (!currentStudent || !await verifyAccessCode(currentAccessCode, currentStudent.accessCodeHash)) {
        throw new Error('Invalid access code');
      }
      if (!validateAccessCode(newAccessCode) || newAccessCode === currentAccessCode) throw new Error('Invalid new access code');
      await repository.updateAccessCodeHash({ studentId: student.id, accessCodeHash: await hashAccessCode(newAccessCode) });
    },
  };
}

module.exports = { createPgStudentAuthRepository, createStudentAuthHttpHandlers, createStudentAuthService, getCookieValue, hashAccessCode, hashSessionToken, validateAccessCode, verifyAccessCode };
