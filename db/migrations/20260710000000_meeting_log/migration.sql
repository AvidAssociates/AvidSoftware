-- Meeting log: Phone R1 -> Phone R2 -> Face-to-Face R1, etc. logged as a
-- dated trail inside the Interview stage, instead of writing a brand-new
-- send-out entry each time the meeting type/round moves forward (the old
-- paper-sheet habit). The fixed 4-stage tracker (Sent/Interview/Offer/
-- Placed) is unaffected -- this only adds detail inside the Interview step.
ALTER TABLE pipeline_entries ADD COLUMN IF NOT EXISTS meeting_log JSONB NOT NULL DEFAULT '[]';

-- Backfill: any entry that has already reached Interview (or beyond) gets
-- one log entry reflecting its current type/round, dated to when it first
-- reached Interview (falling back to its send date). Entries still at
-- Sent have no meetings yet, so they're left with an empty log.
UPDATE pipeline_entries
SET meeting_log = jsonb_build_array(
  jsonb_build_object(
    'type', interview_type,
    'round', round,
    'date', COALESCE(
      (SELECT elem->>'date' FROM jsonb_array_elements(stage_history) elem WHERE elem->>'stage' = 'interview' LIMIT 1),
      date
    )
  )
)
WHERE meeting_log = '[]'::jsonb
  AND stage IN ('interview', 'offer', 'placed');
