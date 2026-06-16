-- 089: Supplier codes catalog + per-piece supplier_code tag.
--
-- New engineering workflow (per user spec, May 2026):
--   - The proiectant adds a prefix code (e.g. CMO_pompa.SLDPRT) to the
--     filename of any part that must be ordered from an external supplier.
--   - The system extracts the code, tags the piece, and surfaces it on a
--     dedicated "Parts ordering" page so procurement can see what's needed
--     and engineering can see what's blocked waiting on delivery.
--
-- This migration creates the small catalog of codes (admin-managed, fully
-- configurable per Q3=b) and adds the `supplier_code` column on
-- `project_pieces` to denormalize the tag for fast filtering.
--
-- Seeded codes are the three the user mentioned in conversations; admins
-- can add more (EL=Electric, HID=Hidraulic, STD=Standard, CUS=Custom,
-- etc.) from the "Coduri" modal in the parts tree toolbar.

CREATE TABLE supplier_codes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT    NOT NULL UNIQUE COLLATE NOCASE,  -- short prefix, e.g. 'CMO'
    label       TEXT    NOT NULL,                         -- short display label
    description TEXT,                                     -- longer explanation
    color       TEXT,                                     -- hex (optional badge color)
    sort_order  INTEGER NOT NULL DEFAULT 0,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_supplier_codes_active ON supplier_codes(active, sort_order);

INSERT INTO supplier_codes (code, label, description, color, sort_order) VALUES
('CMO', 'Componentă Mecanică Outsourced',
       'Piese mecanice ce se cumpără de la furnizori externi (pompe, malaxoare, etc.).',
       '#f97316', 10),
('EL',  'Electric / Automatizare',
       'Componente electrice și de automatizare (motoare, PLC-uri, senzori).',
       '#3b82f6', 20),
('HID', 'Hidraulic',
       'Componente hidraulice (cilindri, supape, distribuitoare).',
       '#06b6d4', 30);

-- Denormalized tag on the piece itself. NULL = piece is fabricated in-house,
-- not a supplier order. When the engineer renames or imports a file with a
-- recognised prefix (`CMO_xxx`), the extractor sets this column.
ALTER TABLE project_pieces ADD COLUMN supplier_code TEXT;
CREATE INDEX idx_project_pieces_supplier_code ON project_pieces(supplier_code) WHERE supplier_code IS NOT NULL;
