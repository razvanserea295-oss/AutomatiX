-- ============================================================================
-- 060: Per-event notification preferences (email + in-app)
-- ============================================================================
--
-- Each user can opt in/out per notification type and per channel (email
-- vs in-app). Currently supported event types:
--
--   handoff_assigned, handoff_overdue, sla_breach,
--   mention, project_changed, comment_reply,
--   invoice_due_soon, daily_briefing
--
-- Default: email ON for handoff_assigned, sla_breach, mention.
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    email_enabled INTEGER NOT NULL DEFAULT 0,
    in_app_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- Seed sensible defaults for every existing user.
INSERT OR IGNORE INTO notification_preferences (user_id, event_type, email_enabled, in_app_enabled)
SELECT u.id, evt.event_type, evt.default_email, evt.default_in_app
FROM users u
CROSS JOIN (
    SELECT 'handoff_assigned' AS event_type, 1 AS default_email, 1 AS default_in_app UNION ALL
    SELECT 'handoff_overdue',                1,                  1 UNION ALL
    SELECT 'sla_breach',                     1,                  1 UNION ALL
    SELECT 'mention',                        1,                  1 UNION ALL
    SELECT 'project_changed',                0,                  1 UNION ALL
    SELECT 'comment_reply',                  0,                  1 UNION ALL
    SELECT 'invoice_due_soon',               1,                  1 UNION ALL
    SELECT 'daily_briefing',                 0,                  1
) AS evt;
