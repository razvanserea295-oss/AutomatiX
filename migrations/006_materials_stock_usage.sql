-- PROMIX SAP+ Materials + Stock + Usage
-- Module 6

CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    unit_cost REAL NOT NULL CHECK(unit_cost >= 0),
    stock REAL NOT NULL DEFAULT 0 CHECK(stock >= 0),
    min_stock REAL NOT NULL DEFAULT 0 CHECK(min_stock >= 0),
    category TEXT NOT NULL,
    supplier TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_materials_code ON materials(code);
CREATE INDEX IF NOT EXISTS idx_materials_stock ON materials(stock);

CREATE TABLE IF NOT EXISTS material_consumptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    stage_id INTEGER,
    quantity REAL NOT NULL CHECK(quantity > 0),
    unit_cost REAL NOT NULL CHECK(unit_cost >= 0),
    loss_rate REAL NOT NULL DEFAULT 0 CHECK(loss_rate >= 0 AND loss_rate <= 1),
    date TEXT NOT NULL,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES project_stages(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_material_consumptions_project_id ON material_consumptions(project_id);
CREATE INDEX IF NOT EXISTS idx_material_consumptions_material_id ON material_consumptions(material_id);
CREATE INDEX IF NOT EXISTS idx_material_consumptions_date ON material_consumptions(date);

INSERT OR IGNORE INTO materials (id, code, name, unit, unit_cost, stock, min_stock, category, supplier) VALUES
(1, 'OL-PHE-001', 'Profil HEA 200', 'ml', 85, 120, 50, 'Structură metalică', 'MetalDistrib'),
(2, 'OL-PHE-002', 'Profil HEA 240', 'ml', 110, 80, 40, 'Structură metalică', 'MetalDistrib'),
(3, 'OL-IPE-001', 'Profil IPE 200', 'ml', 75, 150, 60, 'Structură metalică', 'MetalDistrib'),
(4, 'TAB-GAL-001', 'Tablă galvanizată 2mm', 'mp', 65, 450, 200, 'Tablă', 'SteelPro'),
(5, 'SURUB-M12', 'Șurub M12x40', 'buc', 2.5, 5000, 2000, 'Fixare', 'FixFast'),
(6, 'CABLU-001', 'Cablu electric 3x2.5mm', 'ml', 8.5, 500, 200, 'Electric', 'ElectroDist'),
(7, 'MOTO-001', 'Motor electric 5.5kW', 'buc', 1850, 8, 3, 'Motoare', 'TechMotor'),
(8, 'VOP-GRI-001', 'Vopsea gri industrial 25L', 'buc', 280, 30, 15, 'Vopsele', 'PaintPro'),
(9, 'SAND-001', 'Panou sandwich 100mm', 'mp', 95, 800, 300, 'Construcție hală', 'WallTech'),
(10, 'SENZ-001', 'Senzor nivel', 'buc', 320, 25, 10, 'Senzori', 'SensorTech');

INSERT OR IGNORE INTO material_consumptions
(id, project_id, material_id, stage_id, quantity, unit_cost, loss_rate, date, notes, created_by) VALUES
(1, 1, 1, 5, 45, 85, 0.05, '2024-05-20', 'Grinzi principale siloz', 3),
(2, 1, 5, 5, 150, 2.5, 0.02, '2024-05-20', 'Fixări structură', 3),
(3, 3, 1, 4, 85, 85, 0.08, '2024-05-20', 'Grinzi hală', 3),
(4, 3, 2, 4, 60, 110, 0.08, '2024-05-20', 'Stâlpi principali', 3),
(5, 8, 9, 7, 400, 95, 0.10, '2024-05-22', 'Panouri perimetral', 3),
(6, 6, 4, 6, 180, 65, 0.12, '2024-05-20', 'Plăci suport', 3),
(7, 8, 6, 7, 150, 8.5, 0.05, '2024-05-22', 'Instalație electrică', 3),
(8, 10, 7, 5, 2, 1850, 0.00, '2024-05-20', 'Motoare montaj', 3);
