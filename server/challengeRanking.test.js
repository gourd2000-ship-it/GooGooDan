const test = require('node:test');
const assert = require('node:assert/strict');
const { selectChallengeBestRecords } = require('./challengeRanking');

test('selectChallengeBestRecords keeps only the best record for the requested question count and mode', () => {
  const records = [
    { studentId: 'a', questionCount: 20, challengeMode: 'answer-tap', totalCorrect: 19, totalTimeMs: 5_000 },
    { studentId: 'a', questionCount: 20, challengeMode: 'answer-tap', totalCorrect: 19, totalTimeMs: 4_000 },
    { studentId: 'b', questionCount: 20, challengeMode: 'answer-tap', totalCorrect: 20, totalTimeMs: 8_000 },
    { studentId: 'c', questionCount: 25, challengeMode: 'answer-tap', totalCorrect: 25, totalTimeMs: 1_000 },
    { studentId: 'd', questionCount: 20, challengeMode: 'expression-tap', totalCorrect: 20, totalTimeMs: 1_000 },
  ];

  assert.deepEqual(selectChallengeBestRecords(records, 20, 'answer-tap'), [
    { studentId: 'b', questionCount: 20, challengeMode: 'answer-tap', totalCorrect: 20, totalTimeMs: 8_000 },
    { studentId: 'a', questionCount: 20, challengeMode: 'answer-tap', totalCorrect: 19, totalTimeMs: 4_000 },
  ]);
});
