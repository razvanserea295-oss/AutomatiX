-- Inspired by promix-main V9 (warehouse_procurement): suppliers + PO lines linked to materials/projects.
-- Simplified: no multi-warehouse stock_items; receiving increases materials.stock (existing).

CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    internal_ref TEXT,
    ordered_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by INTEGER NOT NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_project ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL,
    line_no INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    qty_ordered REAL NOT NULL CHECK (qty_ordered > 0),
    qty_received REAL NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
    UNIQUE (purchase_order_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_po_lines_po ON purchase_order_lines(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_lines_material ON purchase_order_lines(material_id);
