-- ============================================================================
-- 058: 3-way matching — PO ↔ Receipt ↔ Supplier Invoice
-- ============================================================================
--
-- Adds unit_price/currency to PO lines (for cost rollup) and creates
-- supplier_invoices + supplier_invoice_lines so we can three-way match
-- ordered vs received vs invoiced.
-- ============================================================================

ALTER TABLE purchase_order_lines ADD COLUMN unit_price REAL DEFAULT 0;
ALTER TABLE purchase_order_lines ADD COLUMN currency TEXT DEFAULT 'RON';

CREATE TABLE IF NOT EXISTS supplier_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
    issue_date TEXT NOT NULL,
    due_date TEXT,
    currency TEXT NOT NULL DEFAULT 'RON',
    subtotal REAL NOT NULL DEFAULT 0,
    tva_rate REAL NOT NULL DEFAULT 0.21,
    tva_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    -- Status: pending | matched | discrepancy | approved | paid | rejected
    status TEXT NOT NULL DEFAULT 'pending',
    match_status TEXT,                  -- ok | qty_mismatch | price_mismatch | over_invoice | under_invoice
    discrepancy_notes TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (supplier_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_po       ON supplier_invoices(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status   ON supplier_invoices(status);

CREATE TABLE IF NOT EXISTS supplier_invoice_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_invoice_id INTEGER NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
    po_line_id INTEGER REFERENCES purchase_order_lines(id) ON DELETE SET NULL,
    material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    qty_invoiced REAL NOT NULL DEFAULT 0,
    unit_price REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    line_no INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoice_lines_inv ON supplier_invoice_lines(supplier_invoice_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_lines_po  ON supplier_invoice_lines(po_line_id);

-- Approval thresholds: discrepancies above these block automatic approval.
CREATE TABLE IF NOT EXISTS matching_thresholds (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    qty_tolerance_pct REAL NOT NULL DEFAULT 2,    -- +/- 2% qty tolerance
    price_tolerance_pct REAL NOT NULL DEFAULT 5,  -- +/- 5% price tolerance
    auto_approve_under_amount REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO matching_thresholds (id) VALUES (1);
