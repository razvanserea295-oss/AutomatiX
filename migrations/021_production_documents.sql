-- Production documents (minimal): Bon consum (ID intern), Aviz (IN/OUT), Factură (IN/OUT)
-- Links to projects/materials/pieces for traceability.

CREATE TABLE IF NOT EXISTS bon_consums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    stage_id INTEGER,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    notes TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES project_stages(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bon_consums_project ON bon_consums(project_id);
CREATE INDEX IF NOT EXISTS idx_bon_consums_created_at ON bon_consums(created_at);

CREATE TABLE IF NOT EXISTS bon_consum_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bon_consum_id INTEGER NOT NULL,
    line_no INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    project_piece_id INTEGER,
    qty REAL NOT NULL CHECK(qty > 0),
    unit_cost_snapshot REAL NOT NULL DEFAULT 0 CHECK(unit_cost_snapshot >= 0),
    material_consumption_id INTEGER,
    notes TEXT,
    FOREIGN KEY (bon_consum_id) REFERENCES bon_consums(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
    FOREIGN KEY (project_piece_id) REFERENCES project_pieces(id) ON DELETE SET NULL,
    FOREIGN KEY (material_consumption_id) REFERENCES material_consumptions(id) ON DELETE SET NULL,
    UNIQUE (bon_consum_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_bon_consum_lines_bon ON bon_consum_lines(bon_consum_id);
CREATE INDEX IF NOT EXISTS idx_bon_consum_lines_material ON bon_consum_lines(material_id);
CREATE INDEX IF NOT EXISTS idx_bon_consum_lines_piece ON bon_consum_lines(project_piece_id);

CREATE TABLE IF NOT EXISTS avize (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
    supplier_id INTEGER,
    number TEXT,
    destination TEXT,
    issued_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by INTEGER NOT NULL,
    notes TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_avize_project ON avize(project_id);
CREATE INDEX IF NOT EXISTS idx_avize_direction ON avize(direction);
CREATE INDEX IF NOT EXISTS idx_avize_issued_at ON avize(issued_at);

CREATE TABLE IF NOT EXISTS aviz_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aviz_id INTEGER NOT NULL,
    line_no INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('material', 'piece')),
    material_id INTEGER,
    project_piece_id INTEGER,
    qty REAL NOT NULL CHECK(qty > 0),
    notes TEXT,
    FOREIGN KEY (aviz_id) REFERENCES avize(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
    FOREIGN KEY (project_piece_id) REFERENCES project_pieces(id) ON DELETE SET NULL,
    UNIQUE (aviz_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_aviz_lines_aviz ON aviz_lines(aviz_id);
CREATE INDEX IF NOT EXISTS idx_aviz_lines_kind ON aviz_lines(kind);

CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    invoice_type TEXT NOT NULL CHECK(invoice_type IN ('in', 'out')),
    amount REAL NOT NULL CHECK(amount >= 0),
    currency TEXT NOT NULL DEFAULT 'RON',
    issued_at TEXT NOT NULL DEFAULT (datetime('now')),
    ref_no TEXT,
    supplier_id INTEGER,
    created_by INTEGER NOT NULL,
    notes TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_at ON invoices(issued_at);

