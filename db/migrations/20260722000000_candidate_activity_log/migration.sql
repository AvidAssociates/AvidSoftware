-- Interview meetings + Offer/Placed markers for search candidates.
ALTER TABLE search_candidates ADD COLUMN IF NOT EXISTS activity_log JSONB NOT NULL DEFAULT '[]';
