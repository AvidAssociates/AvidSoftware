-- Retained searches: client engagements with a kanban pipeline.
CREATE TABLE IF NOT EXISTS retained_searches (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  client TEXT NOT NULL,
  role TEXT,
  team TEXT[] NOT NULL DEFAULT '{}',
  stage TEXT NOT NULL DEFAULT 'signed',
  stage_history JSONB NOT NULL DEFAULT '[]',
  retainer_amount NUMERIC,
  notes TEXT,
  added_by TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

-- Candidates within a retained search — separate pipeline from the search itself.
CREATE TABLE IF NOT EXISTS search_candidates (
  id TEXT PRIMARY KEY,
  search_id TEXT NOT NULL REFERENCES retained_searches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'presented',
  stage_history JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  added_by TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS search_candidates_search_id_idx ON search_candidates(search_id);
