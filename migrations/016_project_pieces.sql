-- Migration 013: Project Pieces & Custom Stages

-- PROJECT CUSTOM STAGES
-- Etape specifice per proiect, care pot fi reordonate și modificate liber.
CREATE TABLE IF NOT EXISTS project_custom_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planificat', -- planificat, in_desfasurare, finalizat
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_project_custom_stages_project ON project_custom_stages(project_id);

-- PROJECT PIECES (PIESE / SUBANSAMBLE)
CREATE TABLE IF NOT EXISTS project_pieces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    stage_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- mixer, siloz, transportor, buncar, automatizare, structura
    specs TEXT, -- JSON string cu specificații tehnice (ex: capacitate, motor, dimensiuni)
    quantity REAL NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'planificat', -- planificat, in_productie, fabricat, livrat, montat, testat
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES project_custom_stages(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_project_pieces_project ON project_pieces(project_id);
CREATE INDEX IF NOT EXISTS idx_project_pieces_stage ON project_pieces(stage_id);

-- PIECE ASSIGNMENTS (ALOCARE ANGAJAȚI PE PIESE)
CREATE TABLE IF NOT EXISTS piece_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    piece_id INTEGER NOT NULL,
    worker_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    hours_worked REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (piece_id) REFERENCES project_pieces(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_piece_assignments_piece ON piece_assignments(piece_id);
CREATE INDEX IF NOT EXISTS idx_piece_assignments_worker ON piece_assignments(worker_id);

-- Inserare Date Demo (Seed) pentru Proiectul 1 (Stație Betoane PROMIX M60) existent
INSERT INTO project_custom_stages (project_id, name, order_index, description, status) VALUES
(1, 'Proiectare', 1, 'Proiectare CAD și specificații tehnice', 'finalizat'),
(1, 'Productie Structură', 2, 'Debitare, sudură structură principală', 'in_desfasurare'),
(1, 'Productie Subansamble', 3, 'Malaxor, buncăre, silozuri', 'planificat'),
(1, 'Asamblare & Testare', 4, 'Asamblare electrică, teste de funcționare', 'planificat');

INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, status) VALUES
(1, (SELECT id FROM project_custom_stages WHERE project_id = 1 AND name = 'Productie Subansamble'), 
 'Malaxor Dublu Ax M60', 'mixer', '{"capacity_m3": 1.0, "motor_power_kw": 30, "brand": "SICOMA", "lining": "Ni-Hard"}', 1, 'planificat'),

(1, (SELECT id FROM project_custom_stages WHERE project_id = 1 AND name = 'Productie Structură'), 
 'Buncăr Agregate 4x15mc', 'buncar', '{"compartments": 4, "total_capacity_m3": 60, "discharge": "pneumatic"}', 1, 'in_productie'),

(1, (SELECT id FROM project_custom_stages WHERE project_id = 1 AND name = 'Productie Subansamble'), 
 'Siloz Ciment 60t', 'siloz', '{"capacity_tons": 60, "diameter_mm": 2500, "material": "Oțel S235", "accessories": ["Filtru praf", "Supapă siguranță", "Indicator nivel"]}', 2, 'planificat'),

(1, (SELECT id FROM project_custom_stages WHERE project_id = 1 AND name = 'Productie Structură'), 
 'Șasiu principal M60', 'structura', '{"material": "S355", "weight_kg": 4500, "finish": "Galvanizat"}', 1, 'fabricat');

INSERT INTO piece_assignments (piece_id, worker_id, role, hours_worked) VALUES
((SELECT id FROM project_pieces WHERE name = 'Buncăr Agregate 4x15mc' AND project_id = 1), 1, 'Sudor principal', 16),
((SELECT id FROM project_pieces WHERE name = 'Șasiu principal M60' AND project_id = 1), 3, 'Montator structură', 24);
