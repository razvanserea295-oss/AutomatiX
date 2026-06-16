-- Generic key/value application settings store.
--
-- Additive & non-destructive: a simple key/value table used (for now) by the
-- scheduled auto-backup feature to persist its config (schedule hour, enabled
-- flag, GFS retention counts, cloud placeholder, last-run timestamp). Kept
-- generic so other small toggles can reuse it instead of widening the
-- company_settings singleton for every new flag.

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
