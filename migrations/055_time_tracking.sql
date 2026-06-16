-- ============================================================================
-- 055: Time Tracking — workers × pieces with start/stop and cost rollup
-- ============================================================================
--
-- Replaces the legacy workers/time_entries dropped in 026. Now ties time
-- entries directly to authenticated users (the actual workforce).
-- ============================================================================

-- Hourly cost per user. Optional — null means "exclude from cost rollups".
ALTER TABLE users ADD COLUMN hourly_rate REAL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    piece_id INTEGER REFERENCES project_pieces(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_time_entries_user      ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_piece     ON time_entries(piece_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project   ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_started   ON time_entries(started_at);

-- Active sessions view: at most ONE running entry per user (enforced in code).
-- A user with ended_at IS NULL means they're "clocked in" on that piece.
CREATE INDEX IF NOT EXISTS idx_time_entries_active    ON time_entries(user_id, ended_at) WHERE ended_at IS NULL;

-- Per-piece estimated effort, for cost-vs-actual comparison.
ALTER TABLE project_pieces ADD COLUMN estimated_hours REAL DEFAULT NULL;
