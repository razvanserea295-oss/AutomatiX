-- Audit log for compliance-sensitive mutations.
-- Populated via electron/db/audit.ts — each row captures who changed what
-- (shallow JSON diff) and when. Retention is unbounded by default; a cleanup
-- task can be wired later when volume becomes a concern.

CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,
  username   TEXT,
  action     TEXT NOT NULL,            -- 'create' | 'update' | 'delete'
  entity     TEXT NOT NULL,            -- 'project' | 'piece' | 'user' | ...
  entity_id  INTEGER,
  diff_json  TEXT,                     -- {"field": [before, after], ...}
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity     ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user       ON audit_log(user_id);
