-- 124: shared key/value storage, addressed by (scope, owner_id, key).
-- value holds JSON text ('null' when explicitly set to null).
CREATE TABLE IF NOT EXISTS shared_storage (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  scope       TEXT NOT NULL DEFAULT 'user',
  owner_id    INTEGER NOT NULL DEFAULT 0,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL DEFAULT 'null',
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by  INTEGER,
  UNIQUE(scope, owner_id, key)
);
CREATE INDEX IF NOT EXISTS idx_shared_storage_lookup ON shared_storage(scope, owner_id);
