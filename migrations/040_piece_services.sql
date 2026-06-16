-- Migration 040: Service & Maintenance records per project piece

CREATE TABLE IF NOT EXISTS piece_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    project_piece_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    defect TEXT,
    service_description TEXT,
    technician_id INTEGER,
    service_date TEXT NOT NULL DEFAULT (date('now')),
    labor_cost REAL NOT NULL DEFAULT 0,
    parts_cost REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'in_lucru', -- in_lucru | finalizat | anulat
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (project_piece_id) REFERENCES project_pieces(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_piece_services_project ON piece_services(project_id);
CREATE INDEX IF NOT EXISTS idx_piece_services_piece   ON piece_services(project_piece_id);
CREATE INDEX IF NOT EXISTS idx_piece_services_status  ON piece_services(status);
