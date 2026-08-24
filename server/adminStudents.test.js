const test = require('node:test');
const assert = require('node:assert/strict');
const { hashAccessCode } = require('./auth');
const { ConflictError, ValidationError, createAdminStudentService } = require('./adminStudents');

async function createRepository() {
  const existingHash = await hashAccessCode('1234');
  let students = [{ id: 'student-a', schoolId: 'school-a', grade: 3, classNumber: 2, studentName: 'Kim', accessCodeHash: existingHash, isActive: true }];
  const lockedClasses = [];
  const repositoryFor = (store) => ({
    async lockClass(value) { lockedClasses.push(value); },
    async listStudents(schoolId, filters = {}) {
      return store.filter((student) => student.schoolId === schoolId
        && (filters.grade === undefined || student.grade === filters.grade)
        && (filters.classNumber === undefined || student.classNumber === filters.classNumber));
    },
    async findActiveStudentsByClass({ schoolId, grade, classNumber }) {
      return store.filter((student) => student.schoolId === schoolId && student.grade === grade && student.classNumber === classNumber && student.isActive);
    },
    async findStudent({ schoolId, studentId }) {
      return store.find((student) => student.schoolId === schoolId && student.id === studentId) || null;
    },
    async createStudent(student) {
      const created = { ...student, id: `student-${store.length + 1}`, isActive: true };
      store.push(created);
      return created;
    },
    async updateStudent({ schoolId, studentId, update }) {
      const student = store.find((candidate) => candidate.schoolId === schoolId && candidate.id === studentId);
      if (!student) return null;
      Object.assign(student, update);
      return student;
    },
  });
  return {
    ...repositoryFor(students),
    async transaction(work) {
      const copy = students.map((student) => ({ ...student }));
      const result = await work(repositoryFor(copy));
      students = copy;
      return result;
    },
    snapshot: () => students.map((student) => ({ ...student })),
    lockedClasses: () => [...lockedClasses],
  };
}

test('student roster is scoped to the authenticated administrator school and hides PIN hashes', async () => {
  const repository = await createRepository();
  const service = createAdminStudentService({ repository, accessCodeGenerator: () => '6789' });
  await service.createStudent({ schoolId: 'school-b', grade: 3, classNumber: 2, studentName: 'Other school' });

  const roster = await service.listStudents({ schoolId: 'school-a', grade: 3, classNumber: 2 });

  assert.deepEqual(roster, [{ id: 'student-a', grade: 3, classNumber: 2, studentName: 'Kim', isActive: true }]);
});

test('administrator creates and updates only allowed student fields without returning a PIN', async () => {
  const repository = await createRepository();
  const service = createAdminStudentService({ repository, accessCodeGenerator: () => '6789' });

  const created = await service.createStudent({ schoolId: 'school-a', grade: 4, classNumber: 1, studentName: 'Lee' });
  const updated = await service.updateStudent({ schoolId: 'school-a', studentId: created.id, grade: 4, classNumber: 3, studentName: 'Lee Updated', resetAccessCode: '9876' });

  assert.deepEqual(created, { id: 'student-2', grade: 4, classNumber: 1, studentName: 'Lee', isActive: true });
  assert.deepEqual(updated, { id: 'student-2', grade: 4, classNumber: 3, studentName: 'Lee Updated', isActive: true });
  assert.equal(Object.hasOwn(updated, 'accessCode'), false);
});

test('administrator rejects duplicate PINs within a class and invalid student fields', async () => {
  const repository = await createRepository();
  const service = createAdminStudentService({ repository });

  await assert.rejects(() => service.createStudent({ schoolId: 'school-a', grade: 3, classNumber: 2, studentName: 'Duplicate', accessCode: '1234' }), ConflictError);
  await assert.rejects(() => service.createStudent({ schoolId: 'school-a', grade: 7, classNumber: 2, studentName: 'Invalid', accessCode: '1111' }), ValidationError);
  assert.deepEqual(repository.lockedClasses(), [{ schoolId: 'school-a', grade: 3, classNumber: 2 }]);
});

test('administrator requires a PIN reset when moving a student to a different class and retries a generated collision', async () => {
  const repository = await createRepository();
  const codes = ['1234', '6789'];
  const service = createAdminStudentService({ repository, accessCodeGenerator: () => codes.shift() });

  await assert.rejects(() => service.updateStudent({ schoolId: 'school-a', studentId: 'student-a', classNumber: 3 }), ValidationError);
  const student = await service.createStudent({ schoolId: 'school-a', grade: 3, classNumber: 2, studentName: 'Retry' });
  assert.equal(student.studentName, 'Retry');
});

test('CSV import validates all rows before committing any new student and generates missing PINs', async () => {
  const repository = await createRepository();
  const generated = ['6789', '7890', '8901'];
  const service = createAdminStudentService({ repository, accessCodeGenerator: () => generated.shift() });

  await assert.rejects(() => service.importStudents({ schoolId: 'school-a', rows: [
    { grade: 4, classNumber: 1, studentName: 'Lee' },
    { grade: 7, classNumber: 1, studentName: 'Invalid' },
  ] }), ValidationError);
  assert.equal(repository.snapshot().length, 1);

  const imported = await service.importStudents({ schoolId: 'school-a', rows: [
    { grade: 4, classNumber: 1, studentName: 'Lee' },
    { grade: 4, classNumber: 1, studentName: 'Park', accessCode: '7890' },
  ] });
  assert.deepEqual(imported.map((student) => student.studentName), ['Lee', 'Park']);
  assert.equal(repository.snapshot().length, 3);
});

test('CSV import retries a generated PIN that collides with an existing student', async () => {
  const repository = await createRepository();
  const codes = ['1234', '6789'];
  const service = createAdminStudentService({ repository, accessCodeGenerator: () => codes.shift() });

  const imported = await service.importStudents({ schoolId: 'school-a', rows: [{ grade: 3, classNumber: 2, studentName: 'Retry CSV' }] });

  assert.equal(imported[0].studentName, 'Retry CSV');
});
