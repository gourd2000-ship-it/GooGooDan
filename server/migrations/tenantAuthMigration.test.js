const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migration = fs.readFileSync(path.join(__dirname, '002_tenant_auth_foundation.sql'), 'utf8');

test('preserves an incompatible legacy students table before creating the tenant-auth students table', () => {
  const rename = 'ALTER TABLE students RENAME TO legacy_students_pre_tenant_auth';
  const create = 'CREATE TABLE IF NOT EXISTS students';

  assert.ok(migration.includes(rename), 'the migration must rename the legacy students table instead of reusing it');
  assert.ok(migration.indexOf(rename) < migration.indexOf(create), 'the legacy table must be renamed before creating the new students table');
});
