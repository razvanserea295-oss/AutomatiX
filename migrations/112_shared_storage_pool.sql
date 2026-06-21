-- Shared Storage Pool - global file storage for all users
CREATE TABLE IF NOT EXISTS shared_storage_pool (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT,
  data TEXT,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shared_storage_created ON shared_storage_pool(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_storage_uploader ON shared_storage_pool(uploaded_by);