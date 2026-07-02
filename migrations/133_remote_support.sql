-- 133: Remote support (RustDesk integration) — endpoints, quick codes, sessions

CREATE TABLE IF NOT EXISTS remote_endpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rustdesk_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'windows',
  notes TEXT,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  station_id INTEGER,
  password_hint TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_seen_at TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_remote_endpoints_client ON remote_endpoints(client_id);
CREATE INDEX IF NOT EXISTS idx_remote_endpoints_rdid ON remote_endpoints(rustdesk_id);

CREATE TABLE IF NOT EXISTS remote_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_type TEXT NOT NULL DEFAULT 'ad_hoc',
  endpoint_id INTEGER REFERENCES remote_endpoints(id) ON DELETE SET NULL,
  started_by INTEGER NOT NULL,
  customer_ref TEXT,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  service_ticket_id INTEGER,
  rustdesk_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  started_at TEXT,
  ended_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_remote_sessions_started_by ON remote_sessions(started_by);
CREATE INDEX IF NOT EXISTS idx_remote_sessions_status ON remote_sessions(status);
CREATE INDEX IF NOT EXISTS idx_remote_sessions_created ON remote_sessions(created_at);

CREATE TABLE IF NOT EXISTS remote_quick_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  session_id INTEGER NOT NULL REFERENCES remote_sessions(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_remote_quick_codes_session ON remote_quick_codes(session_id);
