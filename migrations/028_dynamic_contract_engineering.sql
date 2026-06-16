-- ============================================================================
-- 028: Dynamic Contract + Engineering Tree + Libraries + Warehouse
-- ============================================================================

-- Contract section templates (reusable)
CREATE TABLE IF NOT EXISTS contract_section_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    default_content TEXT NOT NULL DEFAULT '',
    order_index INTEGER NOT NULL DEFAULT 0,
    required INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO contract_section_templates (name, order_index, required) VALUES
('Obiect contract', 1, 1),
('Produs livrat', 2, 1),
('Conditii de executie', 3, 1),
('Termen de executie', 4, 1),
('Termen PIF', 5, 0),
('Conditii de livrare', 6, 1),
('Conditii de montaj', 7, 0),
('Conditii de plata', 8, 1),
('Observatii tehnico-comerciale', 9, 0),
('Anexe', 10, 0),
('Clauze speciale', 11, 0);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL UNIQUE,
    contract_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    client_id INTEGER NOT NULL,
    site_location TEXT,
    delivered_product TEXT,
    sale_price REAL DEFAULT 0,
    execution_term TEXT,
    pif_term TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    revision INTEGER NOT NULL DEFAULT 1,
    observations TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contracts_project ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- Contract dynamic sections
CREATE TABLE IF NOT EXISTS contract_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    template_id INTEGER,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    order_index INTEGER NOT NULL,
    required INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_contract_sections_contract ON contract_sections(contract_id);

-- Contract revision history
CREATE TABLE IF NOT EXISTS contract_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    revision INTEGER NOT NULL,
    snapshot_json TEXT NOT NULL,
    changed_by INTEGER NOT NULL,
    changed_at TEXT DEFAULT (datetime('now')),
    notes TEXT
);

-- Engineering tree nodes
CREATE TABLE IF NOT EXISTS engineering_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    parent_id INTEGER,
    node_type TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    quantity REAL NOT NULL DEFAULT 1,
    resolution TEXT NOT NULL DEFAULT 'placeholder',
    status TEXT NOT NULL DEFAULT 'draft',
    sort_order INTEGER NOT NULL DEFAULT 0,
    specs TEXT,
    notes TEXT,
    source_library_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_eng_nodes_project ON engineering_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_eng_nodes_parent ON engineering_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_eng_nodes_type ON engineering_nodes(node_type);

-- Standard parts library
CREATE TABLE IF NOT EXISTS standard_parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    supplier_id INTEGER,
    lead_time_days INTEGER,
    unit TEXT NOT NULL DEFAULT 'buc',
    unit_cost REAL DEFAULT 0,
    specs TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_std_parts_code ON standard_parts(code);
CREATE INDEX IF NOT EXISTS idx_std_parts_category ON standard_parts(category);

-- Custom parts library
CREATE TABLE IF NOT EXISTS custom_parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    originating_project_id INTEGER,
    originating_node_id INTEGER,
    promoted_to_standard_id INTEGER,
    specs TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Engineering node documents
CREATE TABLE IF NOT EXISTS engineering_node_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    doc_type TEXT NOT NULL DEFAULT 'drawing'
);

-- Engineering BOM (materials per node)
CREATE TABLE IF NOT EXISTS engineering_bom (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    material_id INTEGER,
    standard_part_id INTEGER,
    custom_part_id INTEGER,
    quantity REAL NOT NULL DEFAULT 1,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_eng_bom_node ON engineering_bom(node_id);

-- Stock reservations
CREATE TABLE IF NOT EXISTS stock_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    quantity_reserved REAL NOT NULL,
    quantity_issued REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'reserved',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reservations_project ON stock_reservations(project_id);
CREATE INDEX IF NOT EXISTS idx_reservations_material ON stock_reservations(material_id);

-- Warehouse locations
CREATE TABLE IF NOT EXISTS warehouse_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    location_type TEXT NOT NULL DEFAULT 'rack'
);

INSERT INTO warehouse_locations (code, name, location_type) VALUES
('HALA-1', 'Hala Principala', 'hall'),
('HALA-2', 'Hala Secundara', 'hall'),
('MAG-1', 'Magazie Principala', 'warehouse'),
('MAG-2', 'Magazie Piese Mici', 'warehouse'),
('EXT-1', 'Exterior Curte', 'yard');

-- Stock movements ledger
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    location_id INTEGER,
    movement_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    reference_type TEXT,
    reference_id INTEGER,
    project_id INTEGER,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stock_mov_material ON stock_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_stock_mov_project ON stock_movements(project_id);

-- Designer checklist
CREATE TABLE IF NOT EXISTS designer_checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    designer_user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    content_json TEXT NOT NULL DEFAULT '[]',
    revision INTEGER NOT NULL DEFAULT 1,
    finalized_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checklist_project ON designer_checklists(project_id);
