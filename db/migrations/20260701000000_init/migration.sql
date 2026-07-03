CREATE TABLE IF NOT EXISTS recruiters (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sendouts (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  candidate TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT,
  type TEXT,
  recruiter_id INTEGER NOT NULL REFERENCES recruiters(id),
  am_recruiter_id INTEGER REFERENCES recruiters(id),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS billings (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  recruiter_id INTEGER NOT NULL REFERENCES recruiters(id),
  amount REAL NOT NULL,
  category TEXT NOT NULL DEFAULT 'placement',
  personal INTEGER NOT NULL DEFAULT 1,
  candidate TEXT,
  company TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS retainers (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  recruiter_id INTEGER NOT NULL REFERENCES recruiters(id),
  amount REAL NOT NULL,
  company TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO recruiters (name, sort_order)
VALUES ('Brad', 0), ('Joe', 1), ('Reid', 2), ('Matt', 3), ('Justice', 4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO settings (key, value)
VALUES ('annual_goal', '1300000')
ON CONFLICT (key) DO NOTHING;
