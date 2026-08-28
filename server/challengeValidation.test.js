const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeChallengeEvaluation, validateChallengeExpectedQuestions } = require('./utils');

test('validateChallengeExpectedQuestions accepts only unique 1-to-9 expressions at configured challenge sizes', () => {
  const questions = Array.from({ length: 20 }, (_, index) => `${Math.floor(index / 9) + 1} x ${(index % 9) + 1}`);

  assert.deepEqual(validateChallengeExpectedQuestions(JSON.stringify(questions)), questions);
  assert.equal(validateChallengeExpectedQuestions(JSON.stringify([...questions.slice(0, 19), '1 x 1'])), null);
  assert.equal(validateChallengeExpectedQuestions(JSON.stringify(questions.slice(0, 19))), null);
  assert.equal(validateChallengeExpectedQuestions(JSON.stringify([...questions.slice(0, 19), '10 x 1'])), null);
});

test('normalizeChallengeEvaluation accepts a spoken multiplication expression with the displayed product', () => {
  const evaluation = normalizeChallengeEvaluation({
    results: [{ spoken: '3 x 4', isCorrect: true }],
    feedback: 'Great work!',
  }, ['3 x 4'], 'expression-speech');

  assert.equal(evaluation.totalCorrect, 1);
  assert.deepEqual(evaluation.results[0], { question: '3 x 4', expected: '3 x 4', spoken: '3 x 4', isCorrect: true });
});
