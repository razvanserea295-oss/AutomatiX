-- 128_print_jobs.sql — audit trail for the remote printing feature.
-- One row per "print this file on this printer" request, plus its outcome.
-- Written by electron/services/printService.ts. Idempotent.

CREATE TABLE IF NOT EXISTS print_jobs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  printer_name TEXT    NOT NULL,
  filename     TEXT    NOT NULL,
  mime         TEXT    NOT NULL,
  size_bytes   INTEGER NOT NULL DEFAULT 0,
  copies       INTEGER NOT NULL DEFAULT 1,
  status       TEXT    NOT NULL DEFAULT 'queued',  -- queued | done | error
  error        TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_user    ON print_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created ON print_jobs(created_at);
