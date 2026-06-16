-- Flux operațional proiect (JSON checklist), execuție piesă, consum pe reper, necesar material

ALTER TABLE projects ADD COLUMN operational_flow_json TEXT;

ALTER TABLE project_pieces ADD COLUMN fulfillment_type TEXT NOT NULL DEFAULT 'nedecis';
ALTER TABLE project_pieces ADD COLUMN fulfillment_status TEXT NOT NULL DEFAULT 'draft';

ALTER TABLE material_consumptions ADD COLUMN project_piece_id INTEGER REFERENCES project_pieces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_material_consumptions_piece ON material_consumptions(project_piece_id);

CREATE TABLE IF NOT EXISTS piece_material_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_piece_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    quantity_plan REAL NOT NULL CHECK(quantity_plan > 0),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_piece_id) REFERENCES project_pieces(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_piece_mat_req_piece ON piece_material_requirements(project_piece_id);
