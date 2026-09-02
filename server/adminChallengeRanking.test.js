const test = require('node:test');
const assert = require('node:assert/strict');
const { ValidationError, createAdminChallengeRankingService } = require('./adminChallengeRanking');

test('administrator challenge ranking is scoped to its school and ranking group', async () => {
  let received;
  const service = createAdminChallengeRankingService({ repository: {
    async listRecords(filters) {
      received = filters;
      return [
        { studentId: 'student-a', studentName: 'Kim', questionCount: 20, challengeMode: 'answer-tap', totalCorrect: 18, starCount: 4, totalTimeMs: 9000 },
        { studentId: 'student-a', studentName: 'Kim', questionCount: 20, challengeMode: 'answer-tap', totalCorrect: 20, starCount: 5, totalTimeMs: 12000 },
        { studentId: 'student-b', studentName: 'Lee', questionCount: 20, challengeMode: 'answer-tap', totalCorrect: 20, starCount: 5, totalTimeMs: 8000 },
      ];
    },
  } });

  const ranking = await service.getRanking({ schoolId: 'school-a', questionCount: '20', challengeMode: 'answer-tap' });

  assert.deepEqual(received, { schoolId: 'school-a', questionCount: 20, challengeMode: 'answer-tap' });
  assert.deepEqual(ranking, [
    { studentName: 'Lee', totalCorrect: 20, starCount: 5, totalTimeMs: 8000 },
    { studentName: 'Kim', totalCorrect: 20, starCount: 5, totalTimeMs: 12000 },
  ]);
});

test('administrator challenge ranking rejects an invalid group', async () => {
  const service = createAdminChallengeRankingService({ repository: { async listRecords() { return []; } } });
  await assert.rejects(() => service.getRanking({ schoolId: 'school-a', questionCount: '15', challengeMode: 'answer-tap' }), ValidationError);
});
