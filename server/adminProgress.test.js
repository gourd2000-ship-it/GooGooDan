const test = require('node:test');
const assert = require('node:assert/strict');
const { ValidationError, createAdminProgressService } = require('./adminProgress');

test('administrator progress is filtered by school, grade, and class before it is summarized', async () => {
  let received;
  const service = createAdminProgressService({ repository: {
    async listRecords(filters) {
      received = filters;
      return [
        { studentId: 'student-a', studentName: 'Kim', grade: 3, classNumber: 2, table: 2, practiceType: 'speech', score: 100, totalCorrect: 10, totalTimeMs: 1000 },
        { studentId: 'student-a', studentName: 'Kim', grade: 3, classNumber: 2, table: 2, practiceType: 'tap', score: 80, totalCorrect: 8, totalTimeMs: 1200 },
        { studentId: 'student-b', studentName: 'No record', grade: 3, classNumber: 2, table: null, practiceType: null, score: null, totalCorrect: null, totalTimeMs: null },
      ];
    },
  } });

  const students = await service.getProgress({ schoolId: 'school-a', grade: '3', classNumber: '2' });

  assert.deepEqual(received, { schoolId: 'school-a', grade: 3, classNumber: 2 });
  assert.equal(students[0].tables[2].speech.isPerfect, true);
  assert.equal(students[0].tables[2].tap.score, 80);
  assert.deepEqual(students[1], { studentId: 'student-b', studentName: 'No record', grade: 3, classNumber: 2, tables: {} });
});

test('administrator progress rejects invalid filter values', async () => {
  const service = createAdminProgressService({ repository: { async listRecords() { return []; } } });
  await assert.rejects(() => service.getProgress({ schoolId: 'school-a', grade: '7' }), ValidationError);
});
