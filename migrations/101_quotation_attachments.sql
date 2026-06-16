-- 101: Per-offer (quotation) uploaded files — any format.
--
-- Same mechanism as contract_attachments (migration 100) / lead_attachments
-- (075): the user can attach the actual offer document(s), a client's signed
-- acceptance, supporting specs, etc. Stored as base64 (no data-URL prefix)
-- inline in `data` (TEXT). `created_by_user_id` records WHO uploaded each file
-- (shown in the UI). ON DELETE CASCADE cleans up when an offer is deleted.

CREATE TABLE IF NOT EXISTS quotation_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    filename TEXT,
    mime TEXT,
    data TEXT NOT NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quotation_attachments_quotation
    ON quotation_attachments(quotation_id, created_at DESC);
