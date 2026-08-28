const test = require('node:test');
const assert = require('node:assert/strict');
const { parseChallengeRankingRequest, selectChallengeBestRecords, validateChallengeRecord } = require('./challengeRanking');

test('parseChallengeRankingRequest accepts only an independently ranked challenge group', () => {
  assert.deepEqual(
    parseChallengeRankingRequest({ questionCount: '25', challengeMode: 'expression-speech' }),
    { questionCount: 25, challengeMode: 'expression-speech' },
  );
  assert.equal(parseChallengeRankingRequest({ questionCount: '10', challengeMode: 'expression-speech' }), null);
  assert.equal(parseChallengeRankingRequest({ questionCount: '25', challengeMode: 'tap' }), null);
});

test('validateChallengeRecord rejects scores and times outside a selected challenge group', () => {
  assert.deepEqual(
    validateChallengeRecord({ questionCount: 20, challengeMode: 'answer-tap', totalCorrect: 18, totalTime: 12_300, starCount: 1 }),
    { valid: true, value: { questionCount: 20, challengeMode: 'answer-tap', totalCorrect: 18, totalTime: 12_300, starCount: 4 } },
  );
  assert.equal(validateChallengeRecord({ questionCount: 20, challengeMode: 'answer-tap', totalCorrect: 21, totalTime: 12_300, starCount: 4 }).valid, false);
  assert.equal(validateChallengeRecord({ questionCount: 20, challengeMode: 'answer-tap', totalCorrect: 18, totalTime: -1, starCount: 4 }).valid, false);
});

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
