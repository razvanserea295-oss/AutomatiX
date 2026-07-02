-- 132_issued_licenses.sql — record of license keys ISSUED from inside the app
-- (Settings → Licențe), restricted to the configured issuers (Razvan, Vlad).
-- Distinct from `licenses` (which tracks keys ACTIVATED on a tenant). One row
-- per generated key, so issuers can review and re-copy what they handed out.
-- Idempotent.

CREATE TABLE IF NOT EXISTS issued_licenses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  license_id   TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  cui          TEXT NOT NULL DEFAULT '',
  issued_at    TEXT,
  token        TEXT NOT NULL,
  issued_by    TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_issued_licenses_created ON issued_licenses(created_at);
