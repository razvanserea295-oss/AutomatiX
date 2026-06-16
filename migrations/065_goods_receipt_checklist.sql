-- 065: Goods reception checklist — per receipt event with verifications
CREATE TABLE IF NOT EXISTS goods_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_number TEXT NOT NULL UNIQUE,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    received_date TEXT NOT NULL DEFAULT (datetime('now')),
    received_by INTEGER NOT NULL REFERENCES users(id),
    -- Status: draft | accepted | partial | rejected
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_goods_receipts_po       ON goods_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_supplier ON goods_receipts(supplier_id);

CREATE TABLE IF NOT EXISTS goods_receipt_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    po_line_id INTEGER REFERENCES purchase_order_lines(id) ON DELETE SET NULL,
    material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    qty_expected REAL NOT NULL DEFAULT 0,
    qty_received REAL NOT NULL DEFAULT 0,
    -- Checklist flags
    qty_match INTEGER NOT NULL DEFAULT 0,         -- "verified quantity matches expected"
    label_ok INTEGER NOT NULL DEFAULT 0,          -- "label / packaging intact"
    lot_number TEXT,
    expiry_date TEXT,
    has_issue INTEGER NOT NULL DEFAULT 0,
    issue_description TEXT,
    photo_base64 TEXT,                            -- inline photo of the issue (optional)
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_receipt ON goods_receipt_lines(receipt_id);
