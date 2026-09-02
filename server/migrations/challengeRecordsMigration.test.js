const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('challenge ranking migration creates the records table and its ranking index', () => {
  const migration = fs.readFileSync(path.join(__dirname, '003_challenge_records.sql'), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS challenge_records/);
  assert.match(migration, /school_id UUID NOT NULL REFERENCES schools/);
  assert.match(migration, /student_id UUID NOT NULL REFERENCES students/);
  assert.match(migration, /question_count SMALLINT NOT NULL CHECK \(question_count IN \(20, 25, 30\)\)/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS challenge_records_ranking_idx/);
});
