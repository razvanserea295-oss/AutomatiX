-- PROMIX SAP+ Production / Hala Workflow Schema
-- Module 3: Production / Hala Workflow

-- ============================================
-- PRODUCTION STAGE TRANSITIONS LOG
-- ============================================
CREATE TABLE IF NOT EXISTS stage_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    from_stage_id INTEGER,
    to_stage_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (from_stage_id) REFERENCES project_stages(id),
    FOREIGN KEY (to_stage_id) REFERENCES project_stages(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_stage_transitions_project_id ON stage_transitions(project_id);

-- ============================================
-- PRODUCTION BOARD VIEW (for kanban)
-- ============================================
-- Virtual table or view for production board
-- Projects grouped by stage for kanban display
