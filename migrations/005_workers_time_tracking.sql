-- PROMIX SAP+ Workers + Time Tracking
-- Module 5

CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    department TEXT NOT NULL,
    hourly_rate REAL NOT NULL CHECK(hourly_rate >= 0),
    active INTEGER NOT NULL DEFAULT 1,
    hire_date TEXT,
    contact TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workers_name ON workers(name);
CREATE INDEX IF NOT EXISTS idx_workers_active ON workers(active);

CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    stage_id INTEGER,
    date TEXT NOT NULL,
    hours REAL NOT NULL CHECK(hours > 0 AND hours <= 16),
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES project_stages(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_time_entries_worker_id ON time_entries(worker_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);

INSERT OR IGNORE INTO workers (id, name, specialization, department, hourly_rate, active, hire_date, contact) VALUES
(1, 'Gheorghe Marin', 'Sudor', 'Producție', 45, 1, '2018-03-15', '0721 123 456'),
(2, 'Vasile Ion', 'Operator debitare CNC', 'Producție', 40, 1, '2019-06-01', '0721 234 567'),
(3, 'Adrian Popa', 'Montator', 'Producție', 38, 1, '2020-02-10', '0721 345 678'),
(4, 'Ionel Cosma', 'Electrician', 'Producție', 42, 1, '2019-09-20', '0721 456 789'),
(5, 'Dan Cristea', 'Tehnician întreținere', 'Producție', 40, 1, '2020-07-15', '0721 567 890'),
(6, 'Marian Stoica', 'Operator utilaje', 'Producție', 35, 1, '2021-01-10', '0721 678 901'),
(7, 'Florin Rusu', 'Șofer / Manipulant', 'Logistică', 32, 1, '2020-11-05', '0721 789 012'),
(8, 'Alexandru Cojocaru', 'Sudor', 'Producție', 45, 1, '2018-08-20', '0721 890 123'),
(9, 'Constantin Bogdan', 'Operator utilaje', 'Producție', 35, 1, '2021-04-01', '0721 901 234'),
(10, 'Radu Dumitrescu', 'Mecanic', 'Producție', 38, 1, '2020-03-25', '0721 012 345');

INSERT OR IGNORE INTO time_entries (id, worker_id, project_id, stage_id, date, hours, notes, created_by) VALUES
(1, 1, 1, 5, '2024-05-20', 8, 'Asamblare siloz principal', 3),
(2, 1, 1, 5, '2024-05-21', 8, 'Asamblare structură secundară', 3),
(3, 1, 1, 5, '2024-05-22', 6, 'Asamblare + transport', 3),
(4, 2, 3, 4, '2024-05-20', 8, 'Debitare grinzi principale', 3),
(5, 2, 3, 4, '2024-05-21', 8, 'Debitare elemente secundare', 3),
(6, 2, 6, 6, '2024-05-22', 8, 'Debitare plăci pardoseală', 3),
(7, 3, 1, 5, '2024-05-20', 8, 'Montaj suporturi silozuri', 3),
(8, 3, 1, 5, '2024-05-21', 8, 'Montaj scări și platforme', 3),
(9, 3, 8, 7, '2024-05-22', 8, 'Verificare finală montaj', 3),
(10, 4, 3, 4, '2024-05-20', 4, 'Pregătire cabluri electrice', 3);
