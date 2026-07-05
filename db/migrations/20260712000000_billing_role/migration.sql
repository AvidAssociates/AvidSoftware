-- Role on billings (same slot as Send-Outs) so placed-deal titles persist
-- on the ledger, not only on the pipeline entry they may have come from.
ALTER TABLE billings ADD COLUMN IF NOT EXISTS role TEXT;

-- Backfill from linked pipeline entries where candidate + company match.
UPDATE billings b
SET role = pe.role
FROM pipeline_entries pe
WHERE b.role IS NULL
  AND b.candidate IS NOT NULL
  AND b.company IS NOT NULL
  AND pe.candidate = b.candidate
  AND pe.company = b.company;
