-- Tracking producție per piesă: ierarhie, grup ansamblu, etape DXF/desene/execuție/livrat/montat/testat, note hală

ALTER TABLE project_pieces ADD COLUMN parent_piece_id INTEGER REFERENCES project_pieces(id) ON DELETE SET NULL;
ALTER TABLE project_pieces ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE project_pieces ADD COLUMN assembly_key TEXT NOT NULL DEFAULT '';
ALTER TABLE project_pieces ADD COLUMN production_tracking TEXT NOT NULL DEFAULT '{"dxf":"neinceput","desene":"neinceput","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testat":"neinceput"}';
ALTER TABLE project_pieces ADD COLUMN hall_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_project_pieces_parent ON project_pieces(parent_piece_id);
CREATE INDEX IF NOT EXISTS idx_project_pieces_assembly ON project_pieces(project_id, assembly_key);
