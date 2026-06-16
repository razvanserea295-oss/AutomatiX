-- 068: Repair migration.
--
-- Reason: in the live DB, three tables defined by earlier migrations went
-- missing while their `_migrations` rows stayed (likely a partial DROP/RENAME
-- that never re-CREATEd, or a manual cleanup that didn't roll the migration
-- entry back). Re-running those migrations is impossible — they're recorded as
-- applied. So we apply CREATE TABLE IF NOT EXISTS here for the ones that are
-- gone, with the **final** schema each migration produced.
--
-- Also clean up three FK-orphan rows surfaced by `PRAGMA foreign_key_check`.

-- ─────────────────────────────────────────────────────────────────────────────
-- documents (originally migration 004; final shape from 049_documents_optional_project)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    uploaded_by INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES document_categories(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_documents_project_id       ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_category_id      ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by      ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at      ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_project_uploaded ON documents(project_id, uploaded_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- personal_tasks + mentions (from migration 064)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personal_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'normal',
    due_date TEXT,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    source_type TEXT,
    source_id INTEGER,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_personal_tasks_user   ON personal_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_status ON personal_tasks(status);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_due    ON personal_tasks(due_date);

CREATE TABLE IF NOT EXISTS mentions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mentioned_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    snippet TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mentions_user ON mentions(mentioned_user_id, is_read);

-- ─────────────────────────────────────────────────────────────────────────────
-- FK orphan cleanup
-- ─────────────────────────────────────────────────────────────────────────────

-- project_stages was empty, leaving every project's stage_id orphaned. The
-- column is NOT NULL so we can't null it; instead, restore the canonical 9
-- stage seed (same values as migration 011_demo_seed_reset). INSERT OR IGNORE
-- keeps any rows that DO exist intact.
INSERT OR IGNORE INTO project_stages (id, name, order_index, description) VALUES
  (1, 'Ofertare / Contractare',     10, 'Negocieri, oferte, semnătură contract'),
  (2, 'Proiectare (CAD)',           20, 'Elaborare desene tehnice și schițe'),
  (3, 'Debitare & Pregătire',       30, 'Tăiere profile și tablă'),
  (4, 'Sudură',                     40, 'Asamblare și sudură componente'),
  (5, 'Premontaj / Asamblare Hală', 50, 'Montaj la rece în fabrică'),
  (6, 'Vopsitorie',                 60, 'Sablare, grunduire, vopsire'),
  (7, 'Testare & QC',               70, 'Teste finale electrice și mecanice'),
  (8, 'Livrare & PIF',              80, 'Transport, montaj la client, punere în funcțiune'),
  (9, 'Finalizat',                  90, 'Predat și facturat');

-- station_activity_log entries whose station was hard-deleted from
-- installed_stations. The log loses meaning once the station is gone; drop
-- the dangling rows.
DELETE FROM station_activity_log
 WHERE station_id NOT IN (SELECT id FROM installed_stations);
