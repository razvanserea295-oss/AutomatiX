-- PROMIX SAP+ Etapa 5 Projects hardening

CREATE TABLE IF NOT EXISTS project_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER,
    action TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_project_activity_project_id ON project_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_created_at ON project_activity(created_at);

UPDATE projects SET status = 'ofertă' WHERE status = 'draft';
UPDATE projects SET status = 'în producție' WHERE status IN ('active', 'delayed');
UPDATE projects SET status = 'finalizat' WHERE status = 'completed';
UPDATE projects SET status = 'blocat' WHERE status = 'blocked';

INSERT INTO project_activity (project_id, user_id, action, details)
SELECT p.id, p.manager_id, 'project_created', 'Activitate seed proiect'
FROM projects p
WHERE NOT EXISTS (
    SELECT 1 FROM project_activity pa WHERE pa.project_id = p.id AND pa.action = 'project_created'
);
