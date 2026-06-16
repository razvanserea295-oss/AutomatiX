-- Allow documents to be uploaded without an associated project.
-- Originally documents.project_id was NOT NULL with FK ON DELETE CASCADE.
-- We need to: drop the NOT NULL constraint and switch the FK to SET NULL.
-- SQLite cannot ALTER constraints in place — rebuild the table.

CREATE TABLE documents_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    uploaded_by INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES document_categories(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

INSERT INTO documents_new (id, project_id, category_id, name, file_type, file_size, file_path, original_name, version, uploaded_by, uploaded_at, updated_at)
  SELECT id, project_id, category_id, name, file_type, file_size, file_path, original_name, version, uploaded_by, uploaded_at, updated_at FROM documents;

DROP TABLE documents;
ALTER TABLE documents_new RENAME TO documents;

CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_category_id ON documents(category_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX idx_documents_project_uploaded ON documents(project_id, uploaded_at DESC);
