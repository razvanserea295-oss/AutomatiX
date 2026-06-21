-- Shared Files: nested folders for the shared storage pool (table from migration 112).
CREATE TABLE IF NOT EXISTS shared_folders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  parent_id   INTEGER,                       -- NULL = root level
  created_by  INTEGER NOT NULL REFERENCES users(id),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shared_folders_parent ON shared_folders(parent_id);

-- Each file now belongs to a folder (folder_id NULL = root level).
ALTER TABLE shared_storage_pool ADD COLUMN folder_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_shared_storage_folder ON shared_storage_pool(folder_id);
