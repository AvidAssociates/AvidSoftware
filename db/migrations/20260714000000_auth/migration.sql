-- App login users + server-side sessions (HTTP-only cookie).
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

-- Seed the first user: email `test`, password `test` (scrypt hash).
INSERT INTO users (id, email, password_hash, display_name) VALUES
  (
    'usr-test',
    'test',
    'dfca90b40b9d0124d990625caf110274:591ced2e7e3d3ffa27fab42104dbc7589e0becfc947175c7ad7f344b243bb1f07d2d685a4853dd176eb64ccdec3cf9cb1416260fddcfc2a24110dec9001b7f47',
    'Test'
  )
ON CONFLICT (email) DO NOTHING;
