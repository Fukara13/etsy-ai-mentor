-- Sessions: one per "browsing session"
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  note TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Captures: one per captured page (HTML + PNG)
CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  url TEXT NOT NULL,
  html_path TEXT NOT NULL,
  png_path TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- AI outputs: SEO audit, etc. (JSON payload)
CREATE TABLE IF NOT EXISTS ai_outputs (
  id TEXT PRIMARY KEY,
  capture_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (capture_id) REFERENCES captures(id)
);

-- Settings: key-value (e.g. openai_api_key)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_captures_session ON captures(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_capture ON ai_outputs(capture_id);
