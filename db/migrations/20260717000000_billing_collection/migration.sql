-- Billing collection pipeline: Invoiced -> Collected with activity log dates.
ALTER TABLE billings ADD COLUMN IF NOT EXISTS collection_stage TEXT NOT NULL DEFAULT 'invoiced';
ALTER TABLE billings ADD COLUMN IF NOT EXISTS collection_history JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE billings ADD COLUMN IF NOT EXISTS collection_log JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE billings
SET
  collection_history = jsonb_build_array(jsonb_build_object('stage', 'invoiced', 'date', date::text)),
  collection_log = jsonb_build_array(
    jsonb_build_object('id', id || '-inv', 'type', 'Invoiced', 'date', date::text)
  )
WHERE collection_log = '[]'::jsonb;
