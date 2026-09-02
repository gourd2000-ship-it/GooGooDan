const { calculateScore } = require('./utils');

async function saveSpeechRecord(pool, {
  studentName,
  studentId,
  schoolId,
  table,
  mode,
  totalTimeMs,
  totalCorrect,
}) {
  const score = calculateScore(totalCorrect, mode);
  await pool.query(
    'INSERT INTO records (student_name, table_number, mode, score, total_time_ms, practice_type, tap_game_mode, school_id, student_id, total_correct) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [studentName, table, mode, score, totalTimeMs, 'speech', null, schoolId, studentId, totalCorrect],
  );
  return { score };
}

module.exports = { saveSpeechRecord };
