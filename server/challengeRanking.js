const CHALLENGE_QUESTION_COUNTS = new Set([20, 25, 30]);
const CHALLENGE_MODES = new Set([
  'answer-speech',
  'answer-tap',
  'expression-speech',
  'expression-tap',
]);

function parseChallengeRankingRequest(input) {
  const questionCount = Number(input.questionCount);
  const challengeMode = input.challengeMode;
  if (!CHALLENGE_QUESTION_COUNTS.has(questionCount) || !CHALLENGE_MODES.has(challengeMode)) return null;
  return { questionCount, challengeMode };
}

function calculateChallengeStars(totalCorrect, questionCount) {
  const accuracy = totalCorrect / questionCount;
  if (accuracy === 1) return 5;
  if (accuracy >= 0.9) return 4;
  if (accuracy >= 0.8) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}

function validateChallengeRecord(input) {
  const group = parseChallengeRankingRequest(input);
  const totalCorrect = Number(input.totalCorrect);
  const totalTime = Number(input.totalTime);
  if (!group || !Number.isInteger(totalCorrect) || totalCorrect < 0 || totalCorrect > group.questionCount) {
    return { valid: false, reason: 'Invalid challenge score' };
  }
  if (!Number.isInteger(totalTime) || totalTime < 0) {
    return { valid: false, reason: 'Invalid challenge record' };
  }
  const starCount = calculateChallengeStars(totalCorrect, group.questionCount);
  return { valid: true, value: { ...group, totalCorrect, totalTime, starCount } };
}

function compareChallengeRecords(left, right) {
  return right.totalCorrect - left.totalCorrect || left.totalTimeMs - right.totalTimeMs;
}

function selectChallengeBestRecords(records, questionCount, challengeMode) {
  const bestByStudent = new Map();
  for (const record of records) {
    if (!record.studentId || record.questionCount !== questionCount || record.challengeMode !== challengeMode) continue;
    const current = bestByStudent.get(record.studentId);
    if (!current || compareChallengeRecords(record, current) < 0) bestByStudent.set(record.studentId, record);
  }
  return [...bestByStudent.values()].sort(compareChallengeRecords);
}

module.exports = {
  calculateChallengeStars,
  compareChallengeRecords,
  parseChallengeRankingRequest,
  selectChallengeBestRecords,
  validateChallengeRecord,
};
