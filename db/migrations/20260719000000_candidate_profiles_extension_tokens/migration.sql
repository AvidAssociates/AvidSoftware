-- LinkedIn profile metadata captured by the Chrome extension.
ALTER TABLE search_candidates ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE search_candidates ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Long-lived bearer tokens for the Chrome extension (separate from browser session cookies).
CREATE TABLE IF NOT EXISTS extension_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS extension_tokens_user_id_idx ON extension_tokens(user_id);
