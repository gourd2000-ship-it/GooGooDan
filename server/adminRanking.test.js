const test = require('node:test');
const assert = require('node:assert/strict');
const { ValidationError, createAdminRankingService } = require('./adminRanking');

test('administrator ranking is limited to its school and keeps each student\'s best eligible record', async () => {
  let received;
  const service = createAdminRankingService({ repository: {
    async listRecords(filters) {
      received = filters;
      return [
        { studentId: 'student-a', studentName: 'Kim', table: 2, score: 80, totalTimeMs: 6000 },
        { studentId: 'student-a', studentName: 'Kim', table: 2, score: 100, totalTimeMs: 8000 },
        { studentId: 'student-b', studentName: 'Lee', table: 2, score: 100, totalTimeMs: 5000 },
        { studentId: 'student-c', studentName: 'Too fast', table: 2, score: 100, totalTimeMs: 3000 },
      ];
    },
  } });

  const ranking = await service.getRanking({ schoolId: 'school-a', practiceType: 'speech', table: '2' });

  assert.deepEqual(received, { schoolId: 'school-a', practiceType: 'speech', table: 2 });
  assert.deepEqual(ranking, [
    { studentName: 'Lee', table: 2, score: 100, totalTimeMs: 5000 },
    { studentName: 'Kim', table: 2, score: 100, totalTimeMs: 8000 },
  ]);
});

test('administrator ranking rejects invalid practice and table filters', async () => {
  const service = createAdminRankingService({ repository: { async listRecords() { return []; } } });

  await assert.rejects(() => service.getRanking({ schoolId: 'school-a', practiceType: 'typing' }), ValidationError);
  await assert.rejects(() => service.getRanking({ schoolId: 'school-a', table: '10' }), ValidationError);
});
