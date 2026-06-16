-- ============================================================================
-- 057: Customer Portal — read-only public URLs per project
-- ============================================================================
--
-- Each project can have one or more portal tokens that grant a client
-- read-only access to project status, contracts, invoices, and service tickets.
-- ============================================================================

CREATE TABLE IF NOT EXISTS portal_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label TEXT,
    expires_at TEXT,
    last_accessed_at TEXT,
    access_count INTEGER NOT NULL DEFAULT 0,
    revoked INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_portal_tokens_token   ON portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_project ON portal_tokens(project_id);
