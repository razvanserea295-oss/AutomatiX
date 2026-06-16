-- 064: Personal tasks + @mention support
CREATE TABLE IF NOT EXISTS personal_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    -- Status: open | in_progress | done | cancelled
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'normal', -- low | normal | high
    due_date TEXT,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    -- Optional source — links to a comment/handoff/ticket that created this task
    source_type TEXT,
    source_id INTEGER,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_personal_tasks_user ON personal_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_status ON personal_tasks(status);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_due ON personal_tasks(due_date);

-- Track @mentions independently so we can list "where am I mentioned"
CREATE TABLE IF NOT EXISTS mentions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mentioned_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Polymorphic source: comment, chat_message, ticket, etc.
    source_type TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    snippet TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mentions_user ON mentions(mentioned_user_id, is_read);
