BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hostname TEXT NOT NULL UNIQUE CHECK (hostname = lower(hostname)),
  workspace_domain TEXT NOT NULL CHECK (workspace_domain = lower(workspace_domain)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  google_subject TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, google_subject)
);

-- Preserve the pre-tenant student roster.  The legacy schema has no school_id
-- or hashed access-code column, so CREATE TABLE IF NOT EXISTS would otherwise
-- silently retain an incompatible table and make the later index creation fail.
DO $$
BEGIN
  IF to_regclass('public.students') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'school_id'
     ) THEN
    IF to_regclass('public.legacy_students_pre_tenant_auth') IS NOT NULL THEN
      RAISE EXCEPTION 'legacy_students_pre_tenant_auth already exists; stop to preserve both student rosters';
    END IF;
    ALTER TABLE students RENAME TO legacy_students_pre_tenant_auth;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  grade SMALLINT NOT NULL CHECK (grade BETWEEN 1 AND 6),
  class_number SMALLINT NOT NULL CHECK (class_number > 0),
  student_name TEXT NOT NULL,
  access_code_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS active_student_access_code_per_class_idx
  ON students (school_id, grade, class_number, access_code_hash)
  WHERE is_active;

CREATE TABLE IF NOT EXISTS student_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE records ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
ALTER TABLE records ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;
ALTER TABLE records ADD COLUMN IF NOT EXISTS total_correct SMALLINT CHECK (total_correct BETWEEN 0 AND 10);

CREATE INDEX IF NOT EXISTS records_student_ownership_idx
  ON records (school_id, student_id, practice_type, table_number, score DESC, total_time_ms ASC);

COMMIT;
