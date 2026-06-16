-- ============================================================================
-- 027: Finance Upgrade — Company Settings, Finance Invoices, Expenses
-- ============================================================================

-- Company fiscal settings (singleton)
CREATE TABLE IF NOT EXISTS company_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    company_name TEXT NOT NULL DEFAULT '',
    cui TEXT NOT NULL DEFAULT '',
    reg_com TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    county TEXT NOT NULL DEFAULT '',
    bank_name TEXT NOT NULL DEFAULT '',
    iban TEXT NOT NULL DEFAULT '',
    tva_rate REAL NOT NULL DEFAULT 0.21,
    default_currency TEXT NOT NULL DEFAULT 'RON',
    eur_to_ron_rate REAL NOT NULL DEFAULT 4.97,
    updated_by INTEGER,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO company_settings (id) VALUES (1);

-- Finance invoices (separate from production_docs invoices)
CREATE TABLE IF NOT EXISTS finance_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    project_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'emisa',
    status TEXT NOT NULL DEFAULT 'draft',
    currency TEXT NOT NULL DEFAULT 'RON',
    subtotal REAL NOT NULL DEFAULT 0,
    tva_rate REAL NOT NULL DEFAULT 0.21,
    tva_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    paid_date TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS finance_invoice_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'buc',
    unit_price REAL NOT NULL,
    total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_invoice_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_date TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'transfer',
    reference TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'RON',
    date TEXT NOT NULL,
    invoice_ref TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fin_inv_project ON finance_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_fin_inv_client ON finance_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_fin_inv_status ON finance_invoices(status);
CREATE INDEX IF NOT EXISTS idx_fin_inv_lines ON finance_invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fin_inv_pay ON finance_invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON project_expenses(category);
