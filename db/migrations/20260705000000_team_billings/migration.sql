-- Billings move from a single `recruiter` per fee to a `team` array, so a
-- deal can credit multiple people at once (the "solo vs. team" billings
-- rule). Backfill existing rows from their old recruiter, then drop the
-- NOT NULL constraint since new code no longer writes it.
ALTER TABLE billings ADD COLUMN IF NOT EXISTS team TEXT[];
UPDATE billings SET team = ARRAY[recruiter] WHERE team IS NULL;
ALTER TABLE billings ALTER COLUMN recruiter DROP NOT NULL;

-- Retainers: one editable client/amount per recruiter, separate from fees.
CREATE TABLE IF NOT EXISTS retainers (
  recruiter TEXT PRIMARY KEY,
  client TEXT,
  amount REAL
);

-- Send-outs: first-time vs. repeat business, drives the "First-Time"
-- leaderboard variant.
ALTER TABLE pipeline_entries ADD COLUMN IF NOT EXISTS first_time BOOLEAN NOT NULL DEFAULT true;
