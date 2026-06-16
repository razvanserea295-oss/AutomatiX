-- PROMIX SAP+ Finance / Costing
-- Module 7

CREATE TABLE IF NOT EXISTS project_finance_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL UNIQUE,
    manual_labor_cost REAL,
    manual_material_cost REAL,
    extra_cost REAL NOT NULL DEFAULT 0,
    discount_value REAL NOT NULL DEFAULT 0,
    notes TEXT,
    updated_by INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_project_finance_overrides_project_id ON project_finance_overrides(project_id);

CREATE TABLE IF NOT EXISTS project_revenues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    source TEXT NOT NULL DEFAULT 'estimated',
    date TEXT NOT NULL,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_project_revenues_project_id ON project_revenues(project_id);
CREATE INDEX IF NOT EXISTS idx_project_revenues_date ON project_revenues(date);

INSERT OR IGNORE INTO project_finance_overrides (project_id, manual_labor_cost, manual_material_cost, extra_cost, discount_value, notes, updated_by)
VALUES
(4, 112000, 221500, 35000, 0, 'Depășire costuri furnizor și logistică urgentă', 4),
(9, NULL, NULL, 8500, 0, 'Costuri administrative proiect blocat', 4);

INSERT OR IGNORE INTO project_revenues (id, project_id, amount, source, date, notes, created_by)
VALUES
(1, 7, 340000, 'actual', '2024-05-16', 'Factură finală emisă', 4),
(2, 1, 120000, 'partial', '2024-05-10', 'Tranșă intermediară client', 4),
(3, 3, 85000, 'partial', '2024-05-18', 'Avans structură', 4);
