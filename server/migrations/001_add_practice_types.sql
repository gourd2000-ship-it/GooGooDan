BEGIN;

ALTER TABLE records ADD COLUMN IF NOT EXISTS practice_type TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS tap_game_mode TEXT;

UPDATE records
SET practice_type = 'speech', tap_game_mode = NULL
WHERE practice_type IS NULL;

ALTER TABLE records ALTER COLUMN practice_type SET DEFAULT 'speech';
ALTER TABLE records ALTER COLUMN practice_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'records_practice_type_check') THEN
    ALTER TABLE records
      ADD CONSTRAINT records_practice_type_check
      CHECK (practice_type IN ('speech', 'tap'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'records_tap_game_mode_check') THEN
    ALTER TABLE records
      ADD CONSTRAINT records_tap_game_mode_check
      CHECK (
        (practice_type = 'speech' AND tap_game_mode IS NULL)
        OR (practice_type = 'tap' AND tap_game_mode IN ('answer', 'expression', 'mixed'))
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS records_practice_type_ranking_idx
  ON records (practice_type, table_number, score DESC, total_time_ms ASC);

COMMIT;
