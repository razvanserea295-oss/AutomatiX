-- 131_leads.sql — pre-sales leads captured by the marketing landing.
-- The public landing posts "Cere acces" / "Cere o demonstrație" forms to
-- /api/lead (see server/leads.ts); each becomes a row here on the HOST instance.
-- Idempotent.

CREATE TABLE IF NOT EXISTS leads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL DEFAULT 'access',   -- access | demo
  name        TEXT NOT NULL DEFAULT '',
  company     TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  message     TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT 'landing',
  status      TEXT NOT NULL DEFAULT 'new',       -- new | contacted | converted | rejected
  ip          TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status  ON leads(status);
