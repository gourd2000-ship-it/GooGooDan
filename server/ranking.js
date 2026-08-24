function compareRecords(left, right) {
  return right.score - left.score || left.totalTimeMs - right.totalTimeMs;
}

function selectBestRecords(records) {
  const bestByStudent = new Map();
  for (const record of records) {
    if (!record.studentId) continue;
    const current = bestByStudent.get(record.studentId);
    if (!current || compareRecords(record, current) < 0) bestByStudent.set(record.studentId, record);
  }
  return [...bestByStudent.values()].sort(compareRecords);
}

function summarizeProgress(records) {
  const students = new Map();
  for (const record of records) {
    if (!record.studentId || !record.table || !['speech', 'tap'].includes(record.practiceType)) continue;
    let student = students.get(record.studentId);
    if (!student) {
      student = { studentId: record.studentId, studentName: record.studentName, grade: record.grade, classNumber: record.classNumber, tables: {} };
      students.set(record.studentId, student);
    }
    const table = student.tables[record.table] ||= {};
    const current = table[record.practiceType];
    if (!current || compareRecords(record, current._record) < 0) {
      table[record.practiceType] = { score: record.score, isPerfect: record.totalCorrect === 10, _record: record };
    }
  }
  return [...students.values()].map((student) => ({
    ...student,
    tables: Object.fromEntries(Object.entries(student.tables).map(([table, types]) => [table, Object.fromEntries(Object.entries(types).map(([type, value]) => [type, { score: value.score, isPerfect: value.isPerfect }]))])),
  })).sort((a, b) => a.grade - b.grade || a.classNumber - b.classNumber || a.studentName.localeCompare(b.studentName));
}

module.exports = { selectBestRecords, summarizeProgress };
