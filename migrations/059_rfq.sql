-- ============================================================================
-- 059: RFQ Broadcast — Request for Quotation to multiple suppliers
-- ============================================================================
--
-- Workflow:
--   1. Internal user creates RFQ with materials + qty + supplier shortlist
--   2. System generates one unique public link per supplier
--   3. Supplier opens link, fills prices and lead times
--   4. Internal user compares responses side-by-side
--   5. Internal user awards to one or more suppliers (optionally creates POs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rfqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_number TEXT NOT NULL UNIQUE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    deadline TEXT,
    -- draft | sent | awarded | cancelled | closed
    status TEXT NOT NULL DEFAULT 'draft',
    awarded_supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rfqs_status   ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_project  ON rfqs(project_id);

CREATE TABLE IF NOT EXISTS rfq_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_id INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'buc',
    notes TEXT,
    line_no INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq ON rfq_items(rfq_id);

CREATE TABLE IF NOT EXISTS rfq_invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_id INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    -- Public token used in /rfq/<token> link
    public_token TEXT NOT NULL UNIQUE,
    -- pending | sent | viewed | submitted | declined
    status TEXT NOT NULL DEFAULT 'pending',
    sent_at TEXT,
    viewed_at TEXT,
    submitted_at TEXT,
    decline_reason TEXT,
    response_lead_time_days INTEGER,
    response_currency TEXT,
    response_validity_days INTEGER,
    response_notes TEXT,
    response_total REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rfq_invitations_rfq      ON rfq_invitations(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_invitations_token    ON rfq_invitations(public_token);
CREATE INDEX IF NOT EXISTS idx_rfq_invitations_supplier ON rfq_invitations(supplier_id);

CREATE TABLE IF NOT EXISTS rfq_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invitation_id INTEGER NOT NULL REFERENCES rfq_invitations(id) ON DELETE CASCADE,
    rfq_item_id INTEGER NOT NULL REFERENCES rfq_items(id) ON DELETE CASCADE,
    unit_price REAL NOT NULL DEFAULT 0,
    available_quantity REAL,
    notes TEXT,
    UNIQUE (invitation_id, rfq_item_id)
);

CREATE INDEX IF NOT EXISTS idx_rfq_responses_invitation ON rfq_responses(invitation_id);
