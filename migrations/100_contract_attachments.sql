-- 100: Per-contract uploaded files (the signed contract itself, any format).
--
-- The Contracte page was reworked: instead of authoring the contract via
-- dynamic sections + signatures inside the app, the user now uploads the
-- real contract document(s) (PDF, scan, DOCX, anything) at creation and the
-- "Descarcă" button serves those files back.
--
-- Stored as base64 (no data-URL prefix) inline in `data` (TEXT), mirroring
-- `lead_attachments` (migration 075). The whole DB is AES-256-GCM encrypted
-- on save, so keep individual files reasonable — the frontend caps each
-- upload. ON DELETE CASCADE so removing a contract cleans up its files.

CREATE TABLE IF NOT EXISTS contract_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    filename TEXT,
    mime TEXT,
    data TEXT NOT NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contract_attachments_contract
    ON contract_attachments(contract_id, created_at DESC);
