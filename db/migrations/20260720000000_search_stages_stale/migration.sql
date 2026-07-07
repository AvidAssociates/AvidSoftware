-- Search pipeline: Sourcing → Interviewing → Placed → Stale (auto after 30d idle).
UPDATE retained_searches SET stage = 'sourcing' WHERE stage = 'signed';
UPDATE retained_searches SET stage = 'placed' WHERE stage = 'filled';

ALTER TABLE retained_searches ALTER COLUMN stage SET DEFAULT 'sourcing';
