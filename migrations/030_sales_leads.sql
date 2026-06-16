-- 030: Sales Leads + Marketer role
CREATE TABLE IF NOT EXISTS sales_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    product_interest TEXT,
    estimated_value REAL DEFAULT 0,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'fara_contact',
    notes TEXT,
    last_contact_date TEXT,
    next_followup_date TEXT,
    assigned_to INTEGER,
    converted_project_id INTEGER,
    created_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sales_leads_status ON sales_leads(status);
CREATE INDEX IF NOT EXISTS idx_sales_leads_assigned ON sales_leads(assigned_to);

-- Sales lead notes/comments
CREATE TABLE IF NOT EXISTS sales_lead_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON sales_lead_notes(lead_id);

-- Add marketer role if not exists
INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES
(11, 'marketer', 'Marketer / Contracter', '["manage_projects", "view_clients", "view_finances", "manage_sales"]');
