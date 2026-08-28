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

module.exports = { compareChallengeRecords, selectChallengeBestRecords };
