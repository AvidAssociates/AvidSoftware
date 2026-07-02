-- Track when each stage was reached and who moved it there, so the stage
-- tracker in the UI can show a per-stage timeline instead of just the
-- current stage.
ALTER TABLE pipeline_entries ADD COLUMN IF NOT EXISTS stage_history JSONB NOT NULL DEFAULT '[]';

-- Backfill existing rows with a single history entry for their current
-- stage so older send-outs still show something in the tracker.
UPDATE pipeline_entries
SET stage_history = jsonb_build_array(
  jsonb_build_object('stage', stage, 'date', date, 'by', added_by)
)
WHERE stage_history = '[]'::jsonb;
