const { MIN_HALL_OF_FAME_TIME_MS, isHallOfFameEligible, selectBestRecords } = require('./ranking');
const { validatePracticeType } = require('./utils');

class ValidationError extends Error {}

function parseFilters({ schoolId, practiceType, table }) {
  if (typeof schoolId !== 'string' || !schoolId.trim()) throw new ValidationError('School is required');

  const parsedPracticeType = validatePracticeType(practiceType);
  if (!parsedPracticeType) throw new ValidationError('Invalid practice type');

  const parsedTable = table === undefined || table === null || table === '' || table === 'all' ? null : Number(table);
  if (parsedTable !== null && (!Number.isInteger(parsedTable) || parsedTable < 2 || parsedTable > 9)) {
    throw new ValidationError('Invalid table');
  }
  return { schoolId, practiceType: parsedPracticeType, table: parsedTable };
}

function toRankingEntry(record) {
  return {
    studentName: record.studentName,
    table: record.table,
    score: record.score,
    totalTimeMs: record.totalTimeMs,
  };
}

function createAdminRankingService({ repository }) {
  return {
    async getRanking(filters) {
      const parsedFilters = parseFilters(filters);
      const records = await repository.listRecords(parsedFilters);
      return selectBestRecords(records.filter((record) => isHallOfFameEligible(record.totalTimeMs))).slice(0, 10).map(toRankingEntry);
    },
  };
}

function createPgAdminRankingRepository(pool) {
  return {
    async listRecords({ schoolId, practiceType, table }) {
      let query = `SELECT DISTINCT ON (r.student_id)
        r.student_id, s.student_name, r.table_number, r.score, r.total_time_ms
        FROM records r
        JOIN students s ON s.id = r.student_id
        WHERE r.school_id = $1
          AND r.student_id IS NOT NULL
          AND r.practice_type = $2
          AND r.total_time_ms > ${MIN_HALL_OF_FAME_TIME_MS}`;
      const params = [schoolId, practiceType];
      if (table !== null) {
        query += ' AND r.table_number = $3';
        params.push(table);
      }
      query += ' ORDER BY r.student_id, r.score DESC, r.total_time_ms ASC';
      const { rows } = await pool.query(query, params);
      return rows.map((row) => ({
        studentId: row.student_id,
        studentName: row.student_name,
        table: row.table_number,
        score: row.score,
        totalTimeMs: row.total_time_ms,
      }));
    },
  };
}

function createAdminRankingHttpHandler({ service }) {
  return async (req, res) => {
    try {
      const ranking = await service.getRanking({ schoolId: req.tenant.id, ...req.query });
      return res.json({ ranking });
    } catch (error) {
      if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
      console.error('Administrator ranking lookup failed:', error);
      return res.status(500).json({ error: 'Ranking could not be loaded' });
    }
  };
}

module.exports = {
  ValidationError,
  createAdminRankingHttpHandler,
  createAdminRankingService,
  createPgAdminRankingRepository,
};
