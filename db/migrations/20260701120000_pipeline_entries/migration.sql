CREATE TABLE IF NOT EXISTS pipeline_entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  candidate TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT,
  interview_type TEXT NOT NULL DEFAULT 'Phone',
  round INTEGER NOT NULL DEFAULT 1,
  team TEXT[] NOT NULL DEFAULT '{}',
  stage TEXT NOT NULL DEFAULT 'sent',
  declined BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  added_by TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);
