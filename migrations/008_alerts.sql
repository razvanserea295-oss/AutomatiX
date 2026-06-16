-- PROMIX SAP+ Alerts
-- Module 9

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    acknowledged_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    acknowledged_at TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (acknowledged_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_alerts_project_id ON alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);

INSERT OR IGNORE INTO alerts (id, project_id, type, severity, title, message, acknowledged, acknowledged_by, created_at, acknowledged_at) VALUES
(1, 4, 'deadline', 'critical', 'Termen critic - Linie Lapte', 'Proiectul întârzie cu 45 zile. Etapa: debitare.', 0, NULL, '2024-05-23 08:00:00', NULL),
(2, 9, 'blocked', 'high', 'Proiect blocat - Pasarelă Oradea', 'Lipsesc avize primărie. Proiectarea nu poate continua.', 0, NULL, '2024-05-22 10:00:00', NULL),
(3, 1, 'cost_warning', 'medium', 'Apropiere buget - Stație Betoane', 'Costuri estimate la 85% din buget.', 0, NULL, '2024-05-21 12:00:00', NULL),
(4, 8, 'deadline', 'medium', 'Termen apropiat - Hală Eco Build', '65 zile până la deadline.', 0, NULL, '2024-05-20 09:00:00', NULL),
(5, 7, 'completed', 'low', 'Proiect finalizat - Hydro Energy', 'Proiect finalizat și facturat.', 1, 2, '2024-05-16 10:00:00', '2024-05-16 12:00:00');
