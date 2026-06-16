-- ============================================================================
-- 056: Service Tickets — full ticketing system for installed stations
-- ============================================================================
--
-- Tickets are reported by clients (phone/email/portal) and resolved by
-- assigned technicians. SLA driven by severity. Cost rollup feeds back
-- into per-client margin reports.
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number TEXT NOT NULL UNIQUE,
    station_id INTEGER REFERENCES installed_stations(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    -- Severity drives SLA: critical=4h, high=24h, medium=72h, low=7d
    severity TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'open',
    title TEXT NOT NULL,
    description TEXT,
    -- How the client reported it: phone | email | portal | onsite
    reported_via TEXT NOT NULL DEFAULT 'phone',
    reported_by_name TEXT,
    reported_by_contact TEXT,
    assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sla_due_at TEXT,
    first_response_at TEXT,
    resolved_at TEXT,
    closed_at TEXT,
    resolution_notes TEXT,
    cost_labor REAL DEFAULT 0,
    cost_parts REAL DEFAULT 0,
    cost_total REAL DEFAULT 0,
    is_billable INTEGER NOT NULL DEFAULT 1,
    invoice_id INTEGER REFERENCES finance_invoices(id) ON DELETE SET NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_service_tickets_station    ON service_tickets(station_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_client     ON service_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_status     ON service_tickets(status);
CREATE INDEX IF NOT EXISTS idx_service_tickets_assigned   ON service_tickets(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_severity   ON service_tickets(severity);
CREATE INDEX IF NOT EXISTS idx_service_tickets_sla        ON service_tickets(sla_due_at);

CREATE TABLE IF NOT EXISTS service_ticket_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    -- internal | client_reply | status_change
    comment_type TEXT NOT NULL DEFAULT 'internal',
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_service_ticket_comments_ticket ON service_ticket_comments(ticket_id);

CREATE TABLE IF NOT EXISTS service_ticket_parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_service_ticket_parts_ticket ON service_ticket_parts(ticket_id);
