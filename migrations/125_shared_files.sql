-- 125: shared_files metadata (bytes on disk under data/shared-files/).
CREATE TABLE IF NOT EXISTS shared_files (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  scope       TEXT NOT NULL DEFAULT 'company',
  owner_id    INTEGER NOT NULL DEFAULT 0,
  filename    TEXT NOT NULL,
  mime        TEXT,
  size        INTEGER NOT NULL DEFAULT 0,
  stored_name TEXT NOT NULL,
  uploaded_by INTEGER,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shared_files_lookup ON shared_files(scope, owner_id);
