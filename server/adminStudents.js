const { hashAccessCode, validateAccessCode, verifyAccessCode } = require('./auth');

class ValidationError extends Error {}
class ConflictError extends Error {}

function toPositiveInteger(value, name, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new ValidationError(`${name} is invalid`);
  return parsed;
}

function normalizeName(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 50) throw new ValidationError('studentName is invalid');
  return value.trim();
}

function publicStudent(student) {
  return { id: student.id, grade: student.grade, classNumber: student.classNumber, studentName: student.studentName, isActive: student.isActive };
}

function normalizeStudentInput(input, accessCodeGenerator) {
  if (!input || typeof input !== 'object') throw new ValidationError('student is invalid');
  const accessCode = input.accessCode === undefined || input.accessCode === '' ? accessCodeGenerator() : input.accessCode;
  if (!validateAccessCode(accessCode)) throw new ValidationError('accessCode is invalid');
  return {
    grade: toPositiveInteger(input.grade, 'grade', { min: 1, max: 6 }),
    classNumber: toPositiveInteger(input.classNumber, 'classNumber'),
    studentName: normalizeName(input.studentName),
    accessCode,
  };
}

async function assertAccessCodeAvailable(repository, { schoolId, grade, classNumber, accessCode, excludeStudentId }) {
  const candidates = await repository.findActiveStudentsByClass({ schoolId, grade, classNumber });
  for (const candidate of candidates) {
    if (candidate.id !== excludeStudentId && await verifyAccessCode(accessCode, candidate.accessCodeHash)) {
      throw new ConflictError('accessCode is already in use for this class');
    }
  }
}

function createAdminStudentService({ repository, accessCodeGenerator = () => String(Math.floor(Math.random() * 10_000)).padStart(4, '0') }) {
  if (!repository || typeof repository.transaction !== 'function') throw new Error('repository.transaction is required');

  async function createOne(activeRepository, { schoolId, input }) {
    const generatedAccessCode = input.accessCode === undefined || input.accessCode === '';
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const student = normalizeStudentInput(input, accessCodeGenerator);
      await activeRepository.lockClass({ schoolId, grade: student.grade, classNumber: student.classNumber });
      try {
        await assertAccessCodeAvailable(activeRepository, { schoolId, ...student });
      } catch (error) {
        if (generatedAccessCode && error instanceof ConflictError && attempt < 9) continue;
        throw error;
      }
      const created = await activeRepository.createStudent({
        schoolId, grade: student.grade, classNumber: student.classNumber, studentName: student.studentName,
        accessCodeHash: await hashAccessCode(student.accessCode),
      });
      return publicStudent(created);
    }
    throw new ConflictError('Unable to generate a unique access code');
  }

  return {
    async listStudents({ schoolId, grade, classNumber }) {
      if (typeof schoolId !== 'string' || !schoolId) throw new ValidationError('schoolId is invalid');
      const filters = {};
      if (grade !== undefined && grade !== '') filters.grade = toPositiveInteger(grade, 'grade', { min: 1, max: 6 });
      if (classNumber !== undefined && classNumber !== '') filters.classNumber = toPositiveInteger(classNumber, 'classNumber');
      return (await repository.listStudents(schoolId, filters)).map(publicStudent);
    },

    async createStudent({ schoolId, ...input }) {
      if (typeof schoolId !== 'string' || !schoolId) throw new ValidationError('schoolId is invalid');
      return repository.transaction((transaction) => createOne(transaction, { schoolId, input }));
    },

    async updateStudent({ schoolId, studentId, grade, classNumber, studentName, resetAccessCode }) {
      if (typeof schoolId !== 'string' || !schoolId || typeof studentId !== 'string' || !studentId) throw new ValidationError('student is invalid');
      return repository.transaction(async (transaction) => {
        const current = await transaction.findStudent({ schoolId, studentId });
        if (!current) throw new ValidationError('student not found');
        const update = {};
        if (grade !== undefined) update.grade = toPositiveInteger(grade, 'grade', { min: 1, max: 6 });
        if (classNumber !== undefined) update.classNumber = toPositiveInteger(classNumber, 'classNumber');
        if (studentName !== undefined) update.studentName = normalizeName(studentName);
        const nextGrade = update.grade ?? current.grade;
        const nextClassNumber = update.classNumber ?? current.classNumber;
        if (resetAccessCode === undefined && (nextGrade !== current.grade || nextClassNumber !== current.classNumber)) {
          throw new ValidationError('resetAccessCode is required when moving classes');
        }
        if (resetAccessCode !== undefined) {
          if (!validateAccessCode(resetAccessCode)) throw new ValidationError('resetAccessCode is invalid');
          await transaction.lockClass({ schoolId, grade: nextGrade, classNumber: nextClassNumber });
          await assertAccessCodeAvailable(transaction, { schoolId, grade: nextGrade, classNumber: nextClassNumber, accessCode: resetAccessCode, excludeStudentId: studentId });
          update.accessCodeHash = await hashAccessCode(resetAccessCode);
        }
        if (!Object.keys(update).length) throw new ValidationError('no allowed update fields');
        return publicStudent(await transaction.updateStudent({ schoolId, studentId, update }));
      });
    },

    async importStudents({ schoolId, rows }) {
      if (typeof schoolId !== 'string' || !schoolId || !Array.isArray(rows) || !rows.length) throw new ValidationError('rows are invalid');
      const normalizedRows = rows.map((row) => {
        const generatedAccessCode = row && typeof row === 'object' && (row.accessCode === undefined || row.accessCode === '');
        return { ...normalizeStudentInput(row, () => '0000'), generatedAccessCode };
      });
      const seen = new Set();
      for (const row of normalizedRows) {
        if (row.generatedAccessCode) continue;
        const key = `${row.grade}:${row.classNumber}:${row.accessCode}`;
        if (seen.has(key)) throw new ConflictError('duplicate accessCode in CSV');
        seen.add(key);
      }
      return repository.transaction(async (transaction) => {
        const created = [];
        for (const { generatedAccessCode, ...row } of normalizedRows) {
          created.push(await createOne(transaction, { schoolId, input: generatedAccessCode ? { ...row, accessCode: '' } : row }));
        }
        return created;
      });
    },
  };
}

function createPgAdminStudentRepository(pool) {
  const forQuery = (queryable) => ({
    async lockClass({ schoolId, grade, classNumber }) {
      await queryable.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`student-pin:${schoolId}:${grade}:${classNumber}`]);
    },
    async listStudents(schoolId, filters = {}) {
      const values = [schoolId];
      let query = 'SELECT id, school_id, grade, class_number, student_name, is_active FROM students WHERE school_id = $1';
      if (filters.grade !== undefined) { values.push(filters.grade); query += ` AND grade = $${values.length}`; }
      if (filters.classNumber !== undefined) { values.push(filters.classNumber); query += ` AND class_number = $${values.length}`; }
      query += ' ORDER BY grade, class_number, student_name';
      const { rows } = await queryable.query(query, values);
      return rows.map((row) => ({ id: row.id, schoolId: row.school_id, grade: row.grade, classNumber: row.class_number, studentName: row.student_name, isActive: row.is_active }));
    },
    async findActiveStudentsByClass({ schoolId, grade, classNumber }) {
      const { rows } = await queryable.query('SELECT id, school_id, grade, class_number, student_name, access_code_hash, is_active FROM students WHERE school_id = $1 AND grade = $2 AND class_number = $3 AND is_active = true', [schoolId, grade, classNumber]);
      return rows.map((row) => ({ id: row.id, schoolId: row.school_id, grade: row.grade, classNumber: row.class_number, studentName: row.student_name, accessCodeHash: row.access_code_hash, isActive: row.is_active }));
    },
    async findStudent({ schoolId, studentId }) {
      const { rows } = await queryable.query('SELECT id, school_id, grade, class_number, student_name, access_code_hash, is_active FROM students WHERE school_id = $1 AND id = $2', [schoolId, studentId]);
      const row = rows[0];
      return row && { id: row.id, schoolId: row.school_id, grade: row.grade, classNumber: row.class_number, studentName: row.student_name, accessCodeHash: row.access_code_hash, isActive: row.is_active };
    },
    async createStudent(student) {
      const { rows } = await queryable.query('INSERT INTO students (school_id, grade, class_number, student_name, access_code_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id, school_id, grade, class_number, student_name, is_active', [student.schoolId, student.grade, student.classNumber, student.studentName, student.accessCodeHash]);
      const row = rows[0];
      return { id: row.id, schoolId: row.school_id, grade: row.grade, classNumber: row.class_number, studentName: row.student_name, isActive: row.is_active };
    },
    async updateStudent({ schoolId, studentId, update }) {
      const fields = [];
      const values = [schoolId, studentId];
      for (const [column, value] of [['grade', update.grade], ['class_number', update.classNumber], ['student_name', update.studentName], ['access_code_hash', update.accessCodeHash]]) {
        if (value !== undefined) { values.push(value); fields.push(`${column} = $${values.length}`); }
      }
      const { rows } = await queryable.query(`UPDATE students SET ${fields.join(', ')} WHERE school_id = $1 AND id = $2 RETURNING id, school_id, grade, class_number, student_name, is_active`, values);
      const row = rows[0];
      return row && { id: row.id, schoolId: row.school_id, grade: row.grade, classNumber: row.class_number, studentName: row.student_name, isActive: row.is_active };
    },
  });
  return {
    ...forQuery(pool),
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work(forQuery(client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

function createAdminStudentHttpHandlers({ service }) {
  const handle = (handler) => async (req, res) => {
    try { await handler(req, res); } catch (error) {
      const status = error instanceof ConflictError ? 409 : error instanceof ValidationError ? 400 : 500;
      res.status(status).json({ error: status === 500 ? 'Unable to manage students' : error.message });
    }
  };
  return {
    list: handle(async (req, res) => res.json({ students: await service.listStudents({ schoolId: req.tenant.id, ...req.query }) })),
    create: handle(async (req, res) => res.status(201).json({ student: await service.createStudent({ schoolId: req.tenant.id, ...req.body }) })),
    update: handle(async (req, res) => res.json({ student: await service.updateStudent({ schoolId: req.tenant.id, studentId: req.params.studentId, ...req.body }) })),
    import: handle(async (req, res) => res.status(201).json({ students: await service.importStudents({ schoolId: req.tenant.id, rows: req.body?.rows }) })),
  };
}

module.exports = { ConflictError, ValidationError, createAdminStudentHttpHandlers, createAdminStudentService, createPgAdminStudentRepository };
