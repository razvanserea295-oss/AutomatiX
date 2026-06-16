-- 102: Per-briefing uploaded files (any format) + an optional per-file note.
--
-- The briefing intake center (ProjectBriefingsPage) gains an upload section so
-- the author/recipient can attach reference documents (PDF, DWG/DXF, scans,
-- spreadsheets, images — anything) with a short note describing each file.
--
-- Stored as base64 (no data-URL prefix) inline in `data` (TEXT), mirroring
-- contract_attachments (100) / lead_attachments (075). The whole DB is
-- AES-256-GCM encrypted on save, so the frontend caps each upload (~35 MB) and
-- the service caps the stored base64. `annotation` holds the per-file note.
-- ON DELETE CASCADE so deleting a briefing cleans up its files.

CREATE TABLE IF NOT EXISTS briefing_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    briefing_id INTEGER NOT NULL REFERENCES project_briefings(id) ON DELETE CASCADE,
    filename TEXT,
    mime TEXT,
    data TEXT NOT NULL,
    annotation TEXT,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_briefing_attachments_briefing
    ON briefing_attachments(briefing_id, created_at DESC);
