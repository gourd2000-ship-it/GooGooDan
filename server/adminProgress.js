const { summarizeProgress } = require('./ranking');

class ValidationError extends Error {}

function parseOptionalFilter(value, name, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === '') return undefined;
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new ValidationError(`${name} is invalid`);
  return parsed;
}

function createAdminProgressService({ repository }) {
  return {
    async getProgress({ schoolId, grade, classNumber }) {
      if (typeof schoolId !== 'string' || !schoolId) throw new ValidationError('schoolId is invalid');
      const filters = {
        schoolId,
        grade: parseOptionalFilter(grade, 'grade', { min: 1, max: 6 }),
        classNumber: parseOptionalFilter(classNumber, 'classNumber'),
      };
      return summarizeProgress(await repository.listRecords(filters));
    },
  };
}

function createPgAdminProgressRepository(pool) {
  return {
    async listRecords({ schoolId, grade, classNumber }) {
      const values = [schoolId];
      let query = 'SELECT s.id AS student_id, s.student_name, s.grade, s.class_number, r.table_number, r.practice_type, r.score, r.total_correct, r.total_time_ms FROM students s LEFT JOIN records r ON r.student_id = s.id AND r.school_id = $1 AND r.table_number BETWEEN 2 AND 9 WHERE s.school_id = $1 AND s.is_active = true';
      if (grade !== undefined) { values.push(grade); query += ` AND s.grade = $${values.length}`; }
      if (classNumber !== undefined) { values.push(classNumber); query += ` AND s.class_number = $${values.length}`; }
      const { rows } = await pool.query(query, values);
      return rows.map((row) => ({ studentId: row.student_id, studentName: row.student_name, grade: row.grade, classNumber: row.class_number, table: row.table_number, practiceType: row.practice_type, score: row.score, totalCorrect: row.total_correct, totalTimeMs: row.total_time_ms }));
    },
  };
}

function createAdminProgressHttpHandler({ service }) {
  return async (req, res) => {
    try { return res.json({ students: await service.getProgress({ schoolId: req.tenant.id, ...req.query }) }); }
    catch (error) { return res.status(error instanceof ValidationError ? 400 : 500).json({ error: error instanceof ValidationError ? error.message : 'Unable to load progress' }); }
  };
}

module.exports = { ValidationError, createAdminProgressHttpHandler, createAdminProgressService, createPgAdminProgressRepository };
