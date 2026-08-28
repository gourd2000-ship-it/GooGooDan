BEGIN;

CREATE TABLE IF NOT EXISTS challenge_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  question_count SMALLINT NOT NULL CHECK (question_count IN (20, 25, 30)),
  challenge_mode TEXT NOT NULL CHECK (challenge_mode IN ('answer-speech', 'answer-tap', 'expression-speech', 'expression-tap')),
  total_correct SMALLINT NOT NULL CHECK (total_correct BETWEEN 0 AND 30),
  total_time_ms INTEGER NOT NULL CHECK (total_time_ms >= 0),
  star_count SMALLINT NOT NULL CHECK (star_count BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS challenge_records_ranking_idx
  ON challenge_records (school_id, question_count, challenge_mode, total_correct DESC, total_time_ms ASC);

COMMIT;
