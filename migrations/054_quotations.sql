-- ============================================================================
-- 054: Quotations / Sales Offers (full flow)
-- ============================================================================
--
-- Adds proper offer/quotation support with line items, validity dates,
-- email-send tracking (open/accept/reject), and conversion to contract.
--
-- Builds on top of sales_leads (a lead may have many quotations); a
-- quotation may be converted to a contract on the contracts table.
-- ============================================================================

CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_number TEXT NOT NULL UNIQUE,
    lead_id INTEGER REFERENCES sales_leads(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    contact_email TEXT,
    title TEXT NOT NULL,
    description TEXT,
    currency TEXT NOT NULL DEFAULT 'RON',
    tva_rate REAL NOT NULL DEFAULT 0.21,
    discount_percent REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL DEFAULT 0,
    tva_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    -- Status: draft | sent | viewed | accepted | rejected | expired | converted
    status TEXT NOT NULL DEFAULT 'draft',
    valid_until TEXT,
    sent_at TEXT,
    viewed_at TEXT,
    decided_at TEXT,
    rejection_reason TEXT,
    -- Public token for tracking (used in email pixel + portal links)
    tracking_token TEXT NOT NULL UNIQUE,
    converted_contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quotations_status      ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_lead        ON quotations(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client      ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_token       ON quotations(tracking_token);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at  ON quotations(created_at);

CREATE TABLE IF NOT EXISTS quotation_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'buc',
    unit_price REAL NOT NULL DEFAULT 0,
    discount_percent REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quotation_lines_quotation ON quotation_lines(quotation_id);

-- Tracking events (email open, link click, status change). Useful for the
-- "tracking" feature: who opened when, who clicked the accept link, etc.
CREATE TABLE IF NOT EXISTS quotation_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    -- Type: sent | viewed | accepted | rejected | converted | reminded
    event_type TEXT NOT NULL,
    actor_user_id INTEGER REFERENCES users(id),
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quotation_events_quotation ON quotation_events(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_events_type      ON quotation_events(event_type);
