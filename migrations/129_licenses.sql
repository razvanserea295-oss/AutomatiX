-- 129_licenses.sql — offline-signed license records, per tenant + company.
--
-- A license is an Ed25519-signed token (see server/licenseCore.ts) bound to a
-- company. Validity = signature valid AND license_id not revoked. No expiry, no
-- device limit, no tiers (product decision). Each tenant runs its own promix.db,
-- so a firm's license row lives in that firm's DB; the CRL is mirrored into
-- every DB's license_revocations. Idempotent.

CREATE TABLE IF NOT EXISTS licenses (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  license_id     TEXT    NOT NULL UNIQUE,   -- UUID inside the signed payload
  tenant_slug    TEXT    NOT NULL DEFAULT '', -- '' = host tenant (bare origin)
  company_name   TEXT    NOT NULL DEFAULT '',
  email          TEXT    NOT NULL DEFAULT '',
  cui            TEXT    NOT NULL DEFAULT '',
  issued_at      TEXT,                       -- ISO-8601 from the payload
  token          TEXT    NOT NULL,           -- the full AX1.<payload>.<sig> string
  status         TEXT    NOT NULL DEFAULT 'active',  -- active | revoked
  revoked_at     TEXT,
  revoked_reason TEXT,
  imported_by    TEXT,                       -- username that activated it
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_licenses_tenant ON licenses(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);

-- Revocation list mirror. Populated by importing a SIGNED CRL from the generator
-- (revoke.mjs → out/revocations.json) or by a manual admin revoke. A license is
-- usable only if its license_id is absent here.
CREATE TABLE IF NOT EXISTS license_revocations (
  license_id  TEXT PRIMARY KEY,
  revoked_at  TEXT,
  reason      TEXT,
  source      TEXT NOT NULL DEFAULT 'crl',   -- crl | admin
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
