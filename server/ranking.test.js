const test = require('node:test');
const assert = require('node:assert/strict');
const { selectBestRecords, summarizeProgress } = require('./ranking');

test('selectBestRecords keeps one record per student by score then shortest time', () => {
  const records = [
    { studentId: 'a', score: 80, totalTimeMs: 1200 },
    { studentId: 'a', score: 80, totalTimeMs: 900 },
    { studentId: 'b', score: 90, totalTimeMs: 2000 },
    { studentId: null, score: 999, totalTimeMs: 1 },
  ];
  assert.deepEqual(selectBestRecords(records), [
    { studentId: 'b', score: 90, totalTimeMs: 2000 },
    { studentId: 'a', score: 80, totalTimeMs: 900 },
  ]);
});

test('summarizeProgress returns speech and tap best scores plus perfect-answer status by table', () => {
  const progress = summarizeProgress([
    { studentId: 'a', studentName: 'Kim', grade: 3, classNumber: 2, table: 2, practiceType: 'speech', score: 80, totalCorrect: 8, totalTimeMs: 900 },
    { studentId: 'a', studentName: 'Kim', grade: 3, classNumber: 2, table: 2, practiceType: 'tap', score: 100, totalCorrect: 10, totalTimeMs: 1000 },
  ]);
  assert.deepEqual(progress, [{
    studentId: 'a', studentName: 'Kim', grade: 3, classNumber: 2,
    tables: { 2: { speech: { score: 80, isPerfect: false }, tap: { score: 100, isPerfect: true } } },
  }]);
});
