-- 063: Saved report presets per user
CREATE TABLE IF NOT EXISTS report_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- Source: projects | invoices | tickets | quotations | pieces | materials
    source TEXT NOT NULL,
    -- JSON: { columns: string[], filters: {field, op, value}[], group_by?: string, sort?: {field, dir} }
    config TEXT NOT NULL,
    is_shared INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_report_presets_user ON report_presets(user_id);
