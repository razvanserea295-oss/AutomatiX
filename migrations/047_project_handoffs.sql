-- Project handoffs — explicit ownership transitions between roles.
--
-- Workflow model:
--   • Each stage transition that crosses a role boundary creates a handoff row.
--   • Strict gates (1→2, 2→3+, 7→8, 8→9): next transition is blocked while a
--     handoff is still 'pending'.
--   • Lax transitions (within production stages 3-7, 10-19): handoff is
--     informational only, not blocking.
--   • Status: 'pending' (waiting accept), 'accepted', 'rejected', 'forced'
--     (manager override).
--   • is_urgent: prioritizes the row at the top of the recipient's inbox
--     and triggers extra notifications. Manager-only flag.
--   • sla_due_at: created_at + 24h. Background job escalates if pending past
--     this time.

CREATE TABLE project_handoffs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  from_stage_id INTEGER,
  to_stage_id INTEGER NOT NULL,
  from_user_id INTEGER NOT NULL,
  to_role TEXT NOT NULL,                -- expected receiving role
  to_user_id INTEGER,                   -- specific assignee, or NULL = anyone in role
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected | forced
  is_urgent INTEGER NOT NULL DEFAULT 0,    -- boolean 0/1, manager-set
  handoff_notes TEXT,                   -- formal "what to know" message
  ai_summary TEXT,                      -- optional AI-generated summary
  rejected_reason TEXT,
  sla_due_at TEXT NOT NULL DEFAULT (datetime('now', '+24 hours')),
  escalated_at TEXT,                    -- when manager was notified about overdue
  accepted_by_user_id INTEGER,
  accepted_at TEXT,
  rejected_at TEXT,
  forced_by_user_id INTEGER,
  forced_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (from_stage_id) REFERENCES project_stages(id),
  FOREIGN KEY (to_stage_id) REFERENCES project_stages(id),
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id),
  FOREIGN KEY (accepted_by_user_id) REFERENCES users(id),
  FOREIGN KEY (forced_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_handoffs_project ON project_handoffs(project_id);
CREATE INDEX idx_handoffs_status ON project_handoffs(status);
CREATE INDEX idx_handoffs_to_role_pending ON project_handoffs(to_role, status);
CREATE INDEX idx_handoffs_sla ON project_handoffs(status, sla_due_at);

-- AI anomalies table (used in Iter 3 conflict detection)
CREATE TABLE ai_anomalies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,                   -- 'deadline_conflict' | 'low_margin' | 'stale_handoff' | 'stage_mismatch' | other
  entity_type TEXT NOT NULL,            -- 'project' | 'handoff' | 'lead' | 'invoice'
  entity_id INTEGER NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',  -- low / medium / high / critical
  title TEXT NOT NULL,
  description TEXT NOT NULL,            -- AI-written explanation
  suggestion TEXT,                      -- AI-suggested action
  acknowledged INTEGER NOT NULL DEFAULT 0,
  acknowledged_by_user_id INTEGER,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (acknowledged_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_ai_anomalies_unack ON ai_anomalies(acknowledged, severity, created_at);
CREATE INDEX idx_ai_anomalies_entity ON ai_anomalies(entity_type, entity_id);

-- Daily briefings (Iter 6 — in-app digest)
CREATE TABLE daily_briefings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  briefing_date TEXT NOT NULL,          -- YYYY-MM-DD
  summary_text TEXT NOT NULL,           -- AI-generated, role-specific
  action_count INTEGER NOT NULL DEFAULT 0,  -- number of items needing attention
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, briefing_date)
);

CREATE INDEX idx_daily_briefings_user ON daily_briefings(user_id, briefing_date);
