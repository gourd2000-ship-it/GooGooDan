const { parseChallengeRankingRequest, selectChallengeBestRecords } = require('./challengeRanking');

class ValidationError extends Error {}

function parseFilters({ schoolId, questionCount, challengeMode }) {
  if (typeof schoolId !== 'string' || !schoolId.trim()) throw new ValidationError('School is required');
  const group = parseChallengeRankingRequest({ questionCount, challengeMode });
  if (!group) throw new ValidationError('Invalid challenge ranking group');
  return { schoolId, ...group };
}

function createAdminChallengeRankingService({ repository }) {
  return {
    async getRanking(filters) {
      const parsedFilters = parseFilters(filters);
      const records = await repository.listRecords(parsedFilters);
      return selectChallengeBestRecords(records, parsedFilters.questionCount, parsedFilters.challengeMode).slice(0, 10).map((record) => ({
        studentName: record.studentName,
        totalCorrect: record.totalCorrect,
        starCount: record.starCount,
        totalTimeMs: record.totalTimeMs,
      }));
    },
  };
}

function createPgAdminChallengeRankingRepository(pool) {
  return {
    async listRecords({ schoolId, questionCount, challengeMode }) {
      const { rows } = await pool.query(
        `SELECT DISTINCT ON (c.student_id)
          c.student_id, s.student_name, c.question_count, c.challenge_mode, c.total_correct, c.star_count, c.total_time_ms
        FROM challenge_records c
        JOIN students s ON s.id = c.student_id
        WHERE c.school_id = $1 AND c.question_count = $2 AND c.challenge_mode = $3
        ORDER BY c.student_id, c.total_correct DESC, c.total_time_ms ASC`,
        [schoolId, questionCount, challengeMode],
      );
      return rows.map((row) => ({
        studentId: row.student_id,
        studentName: row.student_name,
        questionCount: row.question_count,
        challengeMode: row.challenge_mode,
        totalCorrect: row.total_correct,
        starCount: row.star_count,
        totalTimeMs: row.total_time_ms,
      }));
    },
  };
}

function createAdminChallengeRankingHttpHandler({ service }) {
  return async (req, res) => {
    try {
      const ranking = await service.getRanking({ schoolId: req.tenant.id, ...req.query });
      return res.json({ ranking });
    } catch (error) {
      if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
      console.error('Administrator challenge ranking lookup failed:', error);
      return res.status(500).json({ error: 'Challenge ranking could not be loaded' });
    }
  };
}

module.exports = {
  ValidationError,
  createAdminChallengeRankingHttpHandler,
  createAdminChallengeRankingService,
  createPgAdminChallengeRankingRepository,
};
