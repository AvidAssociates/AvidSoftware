-- The initial migration created tables for the earlier cash-in leaderboard
-- design that this app replaced (recruiters/sendouts/billings/retainers/
-- settings). Drop the obsolete ones (they hold no real data) so the new
-- schema is clean — in particular the old `billings` table has an
-- incompatible column layout that collides with the new one below.
DROP TABLE IF EXISTS sendouts CASCADE;
DROP TABLE IF EXISTS billings CASCADE;
DROP TABLE IF EXISTS retainers CASCADE;
DROP TABLE IF EXISTS recruiters CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- Roster of team members (managed by Brad in the app)
CREATE TABLE IF NOT EXISTS roster (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO roster (name, sort_order)
VALUES ('Brad', 0), ('Joe', 1), ('Reid', 2), ('Matt', 3), ('Justice', 4)
ON CONFLICT (name) DO NOTHING;

-- Billings ledger
CREATE TABLE IF NOT EXISTS billings (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  recruiter TEXT NOT NULL,
  amount REAL NOT NULL,
  company TEXT,
  candidate TEXT,
  notes TEXT,
  added_by TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

-- Seed sample data (only when the tables are empty) so the TV board and
-- billing views look populated for testing. Safe to delete from the app.
DO $$
DECLARE
  d0 TEXT := to_char(date_trunc('month', now()) + interval '2 days', 'YYYY-MM-DD');
  d1 TEXT := to_char(date_trunc('month', now()) + interval '5 days', 'YYYY-MM-DD');
  d2 TEXT := to_char(date_trunc('month', now()) + interval '8 days', 'YYYY-MM-DD');
  d3 TEXT := to_char(date_trunc('month', now()) + interval '12 days', 'YYYY-MM-DD');
  d4 TEXT := to_char(date_trunc('month', now()) + interval '15 days', 'YYYY-MM-DD');
  d5 TEXT := to_char(date_trunc('month', now()) + interval '18 days', 'YYYY-MM-DD');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pipeline_entries) THEN
    INSERT INTO pipeline_entries (id, date, candidate, company, role, interview_type, round, team, stage, declined, notes, added_by) VALUES
      ('smpl-so-1', d0, 'Dana Whitfield', 'Meridian Logistics', 'Operations Manager', 'Video', 2, ARRAY['Brad','Joe'], 'placed', false, 'Sample data', 'Brad'),
      ('smpl-so-2', d1, 'Marcus Lee', 'Aptiv Health', 'Account Executive', 'Face-to-Face', 3, ARRAY['Justice'], 'offer', false, 'Sample data', 'Justice'),
      ('smpl-so-3', d1, 'Priya Nadar', 'Coastal Freight', 'Sales Director', 'Phone', 1, ARRAY['Reid','Matt'], 'interview', false, 'Sample data', 'Reid'),
      ('smpl-so-4', d2, 'Tom Alvarez', 'Northwind Group', 'Recruiter', 'Video', 2, ARRAY['Joe'], 'sent', false, 'Sample data', 'Joe'),
      ('smpl-so-5', d3, 'Erin Cho', 'Vantage Partners', 'Controller', 'Face-to-Face', 4, ARRAY['Matt'], 'placed', false, 'Sample data', 'Matt'),
      ('smpl-so-6', d3, 'Blake Turner', 'Summit Industrial', 'Plant Supervisor', 'Phone', 1, ARRAY['Brad'], 'sent', false, 'Sample data', 'Brad'),
      ('smpl-so-7', d4, 'Sofia Reyes', 'Clearpath Tech', 'Solutions Engineer', 'Video', 2, ARRAY['Justice','Brad'], 'interview', false, 'Sample data', 'Justice'),
      ('smpl-so-8', d5, 'Nathan Ford', 'Ridgeline Capital', 'Analyst', 'Phone', 1, ARRAY['Reid'], 'declined', true, 'Sample data', 'Reid');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM billings) THEN
    INSERT INTO billings (id, date, recruiter, amount, company, candidate, notes, added_by) VALUES
      ('smpl-b-1', d0, 'Brad', 28000, 'Meridian Logistics', 'Dana Whitfield', 'Sample data', 'Brad'),
      ('smpl-b-2', d1, 'Matt', 34500, 'Vantage Partners', 'Erin Cho', 'Sample data', 'Matt'),
      ('smpl-b-3', d2, 'Justice', 22000, 'Aptiv Health', 'Marcus Lee', 'Sample data', 'Justice'),
      ('smpl-b-4', d3, 'Brad', 19500, 'Summit Industrial', 'Blake Turner', 'Sample data', 'Brad'),
      ('smpl-b-5', d4, 'Joe', 26750, 'Northwind Group', 'Tom Alvarez', 'Sample data', 'Joe'),
      ('smpl-b-6', d5, 'Reid', 31000, 'Coastal Freight', 'Priya Nadar', 'Sample data', 'Reid');
  END IF;
END $$;
