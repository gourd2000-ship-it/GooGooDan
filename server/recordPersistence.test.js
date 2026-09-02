const test = require('node:test');
const assert = require('node:assert/strict');
const { saveSpeechRecord } = require('./recordPersistence');

const input = {
  studentName: '박준서',
  studentId: 'student-1',
  schoolId: 'school-1',
  table: 5,
  mode: 'random',
  totalTimeMs: 8_000,
  totalCorrect: 10,
};

test('saveSpeechRecord stores a 5-times-table speech result with the calculated score', async () => {
  const calls = [];
  const pool = { query: async (sql, params) => calls.push({ sql, params }) };

  const result = await saveSpeechRecord(pool, input);

  assert.deepEqual(result, { score: 200 });
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO records/);
  assert.deepEqual(calls[0].params, ['박준서', 5, 'random', 200, 8_000, 'speech', null, 'school-1', 'student-1', 10]);
});

test('saveSpeechRecord propagates a database failure instead of reporting a successful result', async () => {
  const pool = { query: async () => { throw new Error('database unavailable'); } };

  await assert.rejects(() => saveSpeechRecord(pool, input), /database unavailable/);
});
