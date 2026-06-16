-- 069: Repair migration — late wave of missing tables.
--
-- Reason: 25 tables defined in earlier migrations went missing from the live
-- DB while their `_migrations` rows stayed (manual cleanup or partial DROP
-- that didn't roll the migration entry back). Re-running those migrations is
-- impossible — they're recorded as applied. So we apply CREATE TABLE
-- IF NOT EXISTS here for the ones that are gone, with the **final** schema
-- each migration produced.
--
-- Pure schema. No INSERT, no UPDATE, no seed. Idempotent: applying this on a
-- DB that already has these tables is a no-op (every CREATE/INDEX uses
-- IF NOT EXISTS).
--
-- Excluded:
--   • `workers` — dropped by 026_remove_workers_hr.sql and no live code in
--     electron/services or server/* queries it. Not recreated.
--
-- Note on FK targets:
--   • `project_workers` and `piece_assignments` reference `workers(id)`.
--     We still recreate them (they're in the missing-tables list). The FK
--     is harmless at DDL time (FK checks are OFF during migrations) and at
--     runtime no code inserts into them, so the dangling reference never
--     fires. If/when these tables are actually used, the workers table
--     would need to be reintroduced first.

-- ─────────────────────────────────────────────────────────────────────────────
-- 002_projects_schema: project_workers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    worker_id INTEGER NOT NULL,
    allocated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id)
);

CREATE INDEX IF NOT EXISTS idx_project_workers_project_id ON project_workers(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_workers_unique ON project_workers(project_id, worker_id);
-- 024_dba_fix_indexes_status_columns added a single-column index on worker_id:
CREATE INDEX IF NOT EXISTS idx_project_workers_worker_id ON project_workers(worker_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 016_project_pieces: piece_assignments
-- Final schema includes updated_at (added by 024) — folded into the CREATE
-- so the ALTER is unnecessary (idempotency: ALTER ADD COLUMN is not
-- IF NOT EXISTS-safe in SQLite, but a CREATE IF NOT EXISTS that bakes in
-- the final shape is).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS piece_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    piece_id INTEGER NOT NULL,
    worker_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    hours_worked REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY (piece_id) REFERENCES project_pieces(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_piece_assignments_piece ON piece_assignments(piece_id);
CREATE INDEX IF NOT EXISTS idx_piece_assignments_worker ON piece_assignments(worker_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 047_project_handoffs: daily_briefings
-- (project_handoffs and ai_anomalies already exist — only daily_briefings is
-- in the missing list)
-- Final schema folds in details_json (added by 051) — see piece_assignments
-- comment above for the idempotency reasoning.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_briefings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  briefing_date TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  action_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  details_json TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, briefing_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_briefings_user ON daily_briefings(user_id, briefing_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 054_quotations: quotations + quotation_lines + quotation_events
-- ─────────────────────────────────────────────────────────────────────────────
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
    status TEXT NOT NULL DEFAULT 'draft',
    valid_until TEXT,
    sent_at TEXT,
    viewed_at TEXT,
    decided_at TEXT,
    rejection_reason TEXT,
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

CREATE TABLE IF NOT EXISTS quotation_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    actor_user_id INTEGER REFERENCES users(id),
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quotation_events_quotation ON quotation_events(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_events_type      ON quotation_events(event_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 055_time_tracking: time_entries (post-026 reincarnation, user-based)
-- 055 doesn't DROP/CREATE — it just CREATEs (after 026 dropped the legacy
-- one). Use 055's schema as the source of truth.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    piece_id INTEGER REFERENCES project_pieces(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_time_entries_user      ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_piece     ON time_entries(piece_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project   ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_started   ON time_entries(started_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_active    ON time_entries(user_id, ended_at) WHERE ended_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 056_service_tickets: service_tickets + service_ticket_comments + service_ticket_parts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number TEXT NOT NULL UNIQUE,
    station_id INTEGER REFERENCES installed_stations(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'open',
    title TEXT NOT NULL,
    description TEXT,
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 057_portal_tokens: portal_tokens
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label TEXT,
    expires_at TEXT,
    last_accessed_at TEXT,
    access_count INTEGER NOT NULL DEFAULT 0,
    revoked INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_portal_tokens_token   ON portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_project ON portal_tokens(project_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 058_three_way_matching: supplier_invoices + supplier_invoice_lines + matching_thresholds
-- (the ALTERs on purchase_order_lines are for an existing table — skip them
-- here; the 058 INSERT seed is data manipulation — also skipped per rules)
-- ─────────────────────────────────────────────────────────────────────────────
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
    status TEXT NOT NULL DEFAULT 'pending',
    match_status TEXT,
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

CREATE TABLE IF NOT EXISTS matching_thresholds (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    qty_tolerance_pct REAL NOT NULL DEFAULT 2,
    price_tolerance_pct REAL NOT NULL DEFAULT 5,
    auto_approve_under_amount REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 059_rfq: rfqs + rfq_items + rfq_invitations + rfq_responses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rfqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_number TEXT NOT NULL UNIQUE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    deadline TEXT,
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
    public_token TEXT NOT NULL UNIQUE,
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 060_notification_preferences: notification_preferences
-- (the seed INSERT is data manipulation — skipped per rules)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    email_enabled INTEGER NOT NULL DEFAULT 0,
    in_app_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 062_signatures: signatures
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signatures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    role_label TEXT NOT NULL,
    signer_name TEXT NOT NULL,
    image_base64 TEXT NOT NULL,
    signed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    signed_at TEXT NOT NULL DEFAULT (datetime('now')),
    ip_address TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_signatures_target ON signatures(target_type, target_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 063_report_presets: report_presets
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    config TEXT NOT NULL,
    is_shared INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_report_presets_user ON report_presets(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 065_goods_receipt_checklist: goods_receipts + goods_receipt_lines
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goods_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_number TEXT NOT NULL UNIQUE,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    received_date TEXT NOT NULL DEFAULT (datetime('now')),
    received_by INTEGER NOT NULL REFERENCES users(id),
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
    qty_match INTEGER NOT NULL DEFAULT 0,
    label_ok INTEGER NOT NULL DEFAULT 0,
    lot_number TEXT,
    expiry_date TEXT,
    has_issue INTEGER NOT NULL DEFAULT 0,
    issue_description TEXT,
    photo_base64 TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_receipt ON goods_receipt_lines(receipt_id);
