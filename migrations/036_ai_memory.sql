-- 036: AI memory — persistent observations, preferences, learnings

CREATE TABLE IF NOT EXISTS ai_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    memory_type TEXT NOT NULL DEFAULT 'observation',
    content TEXT NOT NULL,
    context TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_memory_user ON ai_memory(user_id, memory_type, created_at);
