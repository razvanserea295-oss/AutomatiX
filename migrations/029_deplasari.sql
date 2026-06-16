-- 029: Deplasari — tracking personal in deplasare
CREATE TABLE IF NOT EXISTS deplasari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_name TEXT NOT NULL,
    destination TEXT NOT NULL,
    reason TEXT,
    project_id INTEGER,
    departure_date TEXT NOT NULL,
    return_date TEXT,
    status TEXT NOT NULL DEFAULT 'in_deplasare',
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_deplasari_status ON deplasari(status);
