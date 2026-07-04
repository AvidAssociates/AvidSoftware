-- Give each logged meeting a stable id so a single one can be deleted
-- (e.g. logged by mistake) without disturbing the rest of the log.
UPDATE pipeline_entries
SET meeting_log = (
  SELECT jsonb_agg(elem || jsonb_build_object('id', gen_random_uuid()::text))
  FROM jsonb_array_elements(meeting_log) elem
)
WHERE jsonb_array_length(meeting_log) > 0
  AND NOT (meeting_log -> 0 ? 'id');
