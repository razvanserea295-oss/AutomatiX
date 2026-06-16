-- 093: demo_seed_log — registry of every "deletable demo" row.
--
-- The existing demo migrations (086, 087) use idempotent INSERTs guarded
-- by `WHERE NOT EXISTS` on a name pattern. That works for visible names
-- (projects, pieces) but breaks down for rows where there's no
-- user-facing name to grep (notifications, piece_order_tracking,
-- briefing_clarifications). It also makes "remove all demo data" a
-- per-table chore.
--
-- This table is a single source of truth: every time the demo seeder
-- inserts a row, it appends (batch, table_name, row_id) here. Cleanup
-- walks the log and DELETEs each row in the order that respects FKs.
--
-- `batch` lets us version the demo set — Step-6 data lives in batch
-- 'step6'. A future "Step-7 demo" can use 'step7' and be cleaned
-- independently.
--
-- We don't add FKs on (table_name, row_id) — they'd be impossible to
-- express across many tables and we don't need referential integrity:
-- if a target row is already gone (manual delete), the cleanup just
-- no-ops that DELETE and proceeds.

CREATE TABLE IF NOT EXISTS demo_seed_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    batch       TEXT NOT NULL,
    table_name  TEXT NOT NULL,
    row_id      INTEGER NOT NULL,
    note        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (batch, table_name, row_id)
);

CREATE INDEX IF NOT EXISTS idx_demo_seed_log_batch ON demo_seed_log (batch);
CREATE INDEX IF NOT EXISTS idx_demo_seed_log_table ON demo_seed_log (table_name);
