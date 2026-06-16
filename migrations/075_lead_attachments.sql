-- 075: Per-lead attachments (photos, documents).
--
-- The Sales Hub upgrade gave each lead its own dedicated detail page (was
-- a side modal). Each discussion now needs to carry richer context:
--   • photos from the site visit
--   • spec sheets, sketches, screenshots
--   • any other file the user wants attached
--
-- Stored as base64 data URLs in `data` (TEXT). Photos are compressed
-- client-side to ~250 KB before upload (1024px max edge, JPEG q=0.7) so
-- the table doesn't bloat the SQLite file.
--
-- `kind` stays a free-form text column for forward-compat (we can add
-- 'audio' or 'video' later without a migration).

CREATE TABLE IF NOT EXISTS lead_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'photo',
    filename TEXT,
    data TEXT NOT NULL,
    caption TEXT,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lead_attachments_lead
    ON lead_attachments(lead_id, created_at DESC);
