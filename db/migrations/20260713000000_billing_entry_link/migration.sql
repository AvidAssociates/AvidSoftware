-- Link auto-created billings back to the placed send-out they came from.
-- Manual billings leave entry_id NULL.
ALTER TABLE billings ADD COLUMN IF NOT EXISTS entry_id TEXT UNIQUE;

-- Tie existing sample rows to their placed pipeline entries.
UPDATE billings b
SET entry_id = pe.id
FROM pipeline_entries pe
WHERE b.entry_id IS NULL
  AND pe.stage = 'placed'
  AND NOT pe.declined
  AND b.candidate IS NOT NULL
  AND b.company IS NOT NULL
  AND pe.candidate = b.candidate
  AND pe.company = b.company;
