-- Accounting / legal support workflow for finance workspace

CREATE TABLE IF NOT EXISTS compliance_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    area TEXT NOT NULL CHECK(area IN ('accounting', 'legal', 'compliance')),
    project_id INTEGER,
    owner_user_id INTEGER,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'done', 'blocked')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
    due_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_compliance_tasks_due_date ON compliance_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_status ON compliance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_area ON compliance_tasks(area);

INSERT INTO compliance_tasks (title, area, project_id, owner_user_id, status, priority, due_date, notes)
SELECT
    'Verificare factură finală și închidere creanță',
    'accounting',
    (
        SELECT p.id
        FROM projects p
        WHERE p.status = 'completed'
        ORDER BY p.deadline DESC, p.id DESC
        LIMIT 1
    ),
    (
        SELECT u.id
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE u.active = 1 AND r.name = 'financiar'
        ORDER BY u.id
        LIMIT 1
    ),
    'open',
    'high',
    date('now', '+3 days'),
    'Confirmă factura finală și statusul încasării pentru proiectul finalizat.'
WHERE NOT EXISTS (SELECT 1 FROM compliance_tasks WHERE title = 'Verificare factură finală și închidere creanță');

INSERT INTO compliance_tasks (title, area, project_id, owner_user_id, status, priority, due_date, notes)
SELECT
    'Revizuire contract și anexe pentru proiect întârziat',
    'legal',
    (
        SELECT p.id
        FROM projects p
        WHERE p.status IN ('delayed', 'blocked')
        ORDER BY p.deadline ASC, p.id ASC
        LIMIT 1
    ),
    (
        SELECT u.id
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE u.active = 1 AND r.name = 'financiar'
        ORDER BY u.id
        LIMIT 1
    ),
    'in_progress',
    'critical',
    date('now', '+1 day'),
    'Confirmă clauzele de penalizare, notificările și acoperirea contractuală.'
WHERE NOT EXISTS (SELECT 1 FROM compliance_tasks WHERE title = 'Revizuire contract și anexe pentru proiect întârziat');

INSERT INTO compliance_tasks (title, area, project_id, owner_user_id, status, priority, due_date, notes)
SELECT
    'Control avize / documente de suport pentru livrare',
    'compliance',
    (
        SELECT p.id
        FROM projects p
        WHERE p.status = 'active'
        ORDER BY p.deadline ASC, p.id ASC
        LIMIT 1
    ),
    (
        SELECT u.id
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE u.active = 1 AND r.name = 'financiar'
        ORDER BY u.id
        LIMIT 1
    ),
    'open',
    'medium',
    date('now', '+5 days'),
    'Verifică existența avizelor și documentelor cerute înainte de PIF.'
WHERE NOT EXISTS (SELECT 1 FROM compliance_tasks WHERE title = 'Control avize / documente de suport pentru livrare');
