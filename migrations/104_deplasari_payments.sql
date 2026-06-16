-- 104: Deplasări — payments ledger + auto-export bookkeeping + diurnă headcount.
--
-- Item #2: the cost fields define a trip's planned budget; payments made to the
-- travellers are logged here and subtracted from that budget (remaining = total
-- cost − Σ payments). When a trip is finalized it is auto-posted ONCE to
-- Financiar/Cheltuieli (project_expenses) — `exported_expense_id` records the
-- created expense so a revert→re-finalize can't double-post.
--
-- `diurna_people` persists the headcount used for the per-person diurnă
-- (diurnă = rate × days × people) so the total can be audited/re-derived.

CREATE TABLE IF NOT EXISTS deplasari_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deplasare_id INTEGER NOT NULL REFERENCES deplasari(id) ON DELETE CASCADE,
    amount REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'RON',
    paid_at TEXT NOT NULL DEFAULT (datetime('now')),
    paid_to TEXT,
    note TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_deplasari_payments_dep
    ON deplasari_payments(deplasare_id, paid_at DESC);

ALTER TABLE deplasari ADD COLUMN exported_expense_id INTEGER;
ALTER TABLE deplasari ADD COLUMN diurna_people INTEGER DEFAULT 1;
