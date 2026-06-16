-- PROMIX SAP+ Installed Stations Schema
-- Module 10: Installed Stations / Service & Maintenance

-- ============================================
-- INSTALLED STATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS installed_stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    client_id INTEGER NOT NULL,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    location TEXT,
    station_type TEXT,
    delivery_date TEXT,
    commissioning_date TEXT,
    warranty_end_date TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, IN_SERVICE, IN_MAINTENANCE, STOPPED, NEEDS_PARTS, BLOCKED, DECOMMISSIONED
    internal_manager_id INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (internal_manager_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_installed_stations_client ON installed_stations(client_id);
CREATE INDEX IF NOT EXISTS idx_installed_stations_status ON installed_stations(status);

-- ============================================
-- STATION CHANGE REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS station_change_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    requested_by_name TEXT,
    request_date TEXT NOT NULL DEFAULT (date('now')),
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    status TEXT NOT NULL DEFAULT 'NEW', -- NEW, IN_ANALYSIS, APPROVED, REJECTED, IN_PROGRESS, COMPLETED
    estimated_cost REAL DEFAULT 0,
    estimated_deadline TEXT,
    assignee_id INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (station_id) REFERENCES installed_stations(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id)
);

-- ============================================
-- STATION SERVICE INTERVENTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS station_service_interventions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    intervention_type TEXT NOT NULL DEFAULT 'SERVICE', -- SERVICE, CORRECTIVE, PREVENTIVE, DIAGNOSTIC, UPGRADE, CHECKUP
    reason TEXT NOT NULL,
    problem_description TEXT,
    open_date TEXT NOT NULL DEFAULT (datetime('now')),
    is_urgent INTEGER NOT NULL DEFAULT 0, -- boolean 0/1
    technician_id INTEGER,
    status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, SCHEDULED, IN_PROGRESS, WAITING_FOR_PARTS, COMPLETED, CANCELLED
    close_date TEXT,
    final_notes TEXT,
    labor_cost REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (station_id) REFERENCES installed_stations(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES users(id)
);

-- ============================================
-- STATION MAINTENANCE PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS station_maintenance_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    maintenance_type TEXT NOT NULL,
    periodicity_days INTEGER NOT NULL,
    last_execution_date TEXT,
    next_execution_date TEXT NOT NULL,
    assignee_id INTEGER,
    status TEXT NOT NULL DEFAULT 'PLANNED', -- PLANNED, DUE_SOON, OVERDUE, IN_PROGRESS, COMPLETED
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (station_id) REFERENCES installed_stations(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id)
);

-- ============================================
-- STATION PARTS REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS station_parts_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    intervention_id INTEGER,
    material_id INTEGER,
    part_name TEXT,
    part_code TEXT,
    quantity REAL NOT NULL DEFAULT 1,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'IDENTIFIED', -- IDENTIFIED, TO_ORDER, ORDERED, IN_TRANSIT, RECEIVED, INSTALLED, UNAVAILABLE
    supplier TEXT,
    estimated_cost REAL DEFAULT 0,
    order_date TEXT,
    received_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (station_id) REFERENCES installed_stations(id) ON DELETE CASCADE,
    FOREIGN KEY (intervention_id) REFERENCES station_service_interventions(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
);

-- ============================================
-- STATION ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS station_activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    user_id INTEGER,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    old_value TEXT, -- json string
    new_value TEXT, -- json string
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (station_id) REFERENCES installed_stations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- SEED DATA 
-- ============================================

-- Insert Stations
INSERT INTO installed_stations (project_id, client_id, code, name, location, station_type, delivery_date, commissioning_date, warranty_end_date, status, internal_manager_id) VALUES
(1, 1, 'ST-001', 'Stație betoane Beta Construct', 'București, Sector 3', 'Stație Betoane 120mc/h', '2023-08-15', '2023-08-20', '2025-08-20', 'ACTIVE', 2),
(7, 8, 'HY-001', 'Instalație hidraulică Hydro', 'Craiova, Platforma Sud', 'Instalație Pompare', '2024-05-15', '2024-05-20', '2026-05-20', 'IN_SERVICE', 2),
(NULL, 3, 'AG-101', 'Echipament modular Agro (Legacy)', 'Timișoara, Ferma Vest', 'Module Depozitare', '2022-10-01', '2022-10-10', '2024-10-10', 'NEEDS_PARTS', 2);

-- Insert Change Requests
INSERT INTO station_change_requests (station_id, requested_by_name, description, priority, status, estimated_cost, assignee_id) VALUES
(1, 'Andrei Marin', 'Adăugare buncăr suplimentar sort sortare 4-8mm', 'HIGH', 'IN_ANALYSIS', 4500, 2);

-- Insert Interventions
INSERT INTO station_service_interventions (station_id, intervention_type, reason, problem_description, is_urgent, technician_id, status) VALUES
(2, 'CORRECTIVE', 'Avarie motor pompă principală', 'Motorul s-a oprit în sarcină, se aude un zgomot metalic. Posibil rulment gripat.', 1, 3, 'OPEN'),
(3, 'SERVICE', 'Înlocuire senzori defecti', 'Senzorii de nivel din silozul 2 nu mai raportează date corecte.', 0, 3, 'WAITING_FOR_PARTS');

-- Insert Maintenance Plans
INSERT INTO station_maintenance_plans (station_id, maintenance_type, periodicity_days, last_execution_date, next_execution_date, status) VALUES
(1, 'Revizie generală mecanism malaxor', 90, '2024-03-01', '2024-05-30', 'PLANNED'),
(1, 'Calibrare cântare ciment și agregate', 365, '2023-08-20', '2024-08-20', 'PLANNED'),
(2, 'Verificare etanșeitate supape', 180, '2024-05-20', '2024-11-16', 'PLANNED');

-- Insert Parts
INSERT INTO station_parts_requests (station_id, intervention_id, part_name, part_code, quantity, status, estimated_cost, supplier) VALUES
(2, 1, 'Motor electric 15kW ABB', 'ABB-15KW-3P', 1, 'ORDERED', 1250, 'ElectroMotor SA'),
(3, 2, 'Senzor capacitiv M30', 'SICK-CQ30', 2, 'IN_TRANSIT', 340, 'SICK Romania');

-- Insert Activity Log
INSERT INTO station_activity_log (station_id, user_id, action_type, description) VALUES
(1, 2, 'CREATED', 'Stația a fost importată din proiect la finalizare.'),
(2, 3, 'SERVICE_OPENED', 'S-a deschis tichet urgent pentru avarie motor pompă.');
