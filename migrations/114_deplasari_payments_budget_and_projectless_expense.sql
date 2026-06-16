-- 114: Deplasări payments — budget line per payment + project-less expense export.
--
-- (1) Each payment to a traveller can be attributed to a BUDGET LINE
--     (transport / cazare / diurna / alte / general), chosen when recording it.
--     Stored on the payment so the decont shows which budget the advance drew on.
-- (2) Finalizing a trip with NO project still posts its costs to
--     Financiar/Cheltuieli: project_expenses.project_id becomes NULLABLE, so a
--     trip-without-project can still create a "cheltuială fără proiect" (it shows
--     in the global/period Financiar views, which filter by date, not project).

-- (1) budget line on each payment (NULL = unspecified / general)
ALTER TABLE deplasari_payments ADD COLUMN category TEXT;

-- (2) recreate project_expenses with a NULLABLE project_id. SQLite cannot drop a
--     NOT NULL constraint via ALTER, so we rename → recreate → copy → drop.
--     project_expenses has no FK/trigger dependencies (see migration 027).
ALTER TABLE project_expenses RENAME TO project_expenses__pre114;

CREATE TABLE project_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,                 -- nullable now (was NOT NULL)
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'RON',
    date TEXT NOT NULL,
    invoice_ref TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO project_expenses
    (id, project_id, category, description, amount, currency, date, invoice_ref, notes, created_by, created_at)
  SELECT id, project_id, category, description, amount, currency, date, invoice_ref, notes, created_by, created_at
  FROM project_expenses__pre114;

DROP TABLE project_expenses__pre114;

CREATE INDEX IF NOT EXISTS idx_expenses_project ON project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON project_expenses(category);
