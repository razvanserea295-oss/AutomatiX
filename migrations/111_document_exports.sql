-- 111: Document-export tracking — one row per PDF generated & archived to disk.
--
-- Additive. The unified `export_document_pdf` command writes a copy of every
-- generated PDF under data/exports/YYYY/MM/{type}_{id}_{timestamp}.pdf and
-- records it here so the team has an audit trail of what official document was
-- emitted, by whom, and where the archived copy lives. Generation never fails
-- if archiving fails — the row simply isn't written (best-effort audit).

CREATE TABLE IF NOT EXISTS document_exports (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_type     TEXT NOT NULL,                 -- invoice | offer | quotation | contract | fisa
  doc_id       INTEGER NOT NULL,              -- id of the source record
  doc_number   TEXT,                          -- human-readable number/code at export time
  filename     TEXT NOT NULL,                 -- download filename
  file_path    TEXT NOT NULL,                 -- absolute path of the archived copy
  status       TEXT,                          -- source document status at export time
  exported_by  INTEGER,                       -- users.id
  exported_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_document_exports_doc ON document_exports(doc_type, doc_id);
CREATE INDEX IF NOT EXISTS idx_document_exports_at ON document_exports(exported_at);
