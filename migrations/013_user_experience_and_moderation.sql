-- User workspace, notifications, moderation, and role experience updates

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY,
    theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
    notifications_enabled INTEGER NOT NULL DEFAULT 1,
    tutorial_completed INTEGER NOT NULL DEFAULT 0,
    bio TEXT,
    phone TEXT,
    dashboard_layout TEXT NOT NULL DEFAULT '["overview","alerts","activity"]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_page TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    read_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read
    ON user_notifications(user_id, read, created_at DESC);

CREATE TABLE IF NOT EXISTS moderation_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_user_id INTEGER,
    assigned_to_user_id INTEGER,
    subject_type TEXT NOT NULL,
    subject_id INTEGER,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
    resolution_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_status_created
    ON moderation_reports(status, created_at DESC);

UPDATE roles
SET permissions = '["view_workers", "time_tracking", "manage_workers", "manage_reports"]',
    updated_at = datetime('now')
WHERE name = 'hr';

INSERT OR IGNORE INTO roles (id, name, description, permissions, created_at, updated_at) VALUES
(11, 'registered_user', 'Utilizator înregistrat', '["view_own_projects", "time_tracking", "view_own_data"]', datetime('now'), datetime('now')),
(12, 'moderator', 'Moderator conținut și rapoarte', '["view_all", "manage_alerts", "manage_reports"]', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO users (id, username, email, password_hash, full_name, role_id, active, created_at, updated_at) VALUES
(11, 'ana.user', 'ana.user@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$cxMPdYAy1dre0LTOWviHDg$afmaq7z84MBG/ru6HFmg6c/RuukgcCqpmWyEKw/wITE', 'Ana Registered', 11, 1, datetime('now'), datetime('now')),
(12, 'mara.mod', 'mara.mod@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$cxMPdYAy1dre0LTOWviHDg$afmaq7z84MBG/ru6HFmg6c/RuukgcCqpmWyEKw/wITE', 'Mara Moderator', 12, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO user_preferences (user_id, theme, notifications_enabled, tutorial_completed, bio, phone, dashboard_layout)
SELECT id,
       CASE WHEN id IN (8, 11) THEN 'light' ELSE 'dark' END,
       1,
       CASE WHEN id IN (1, 2, 12) THEN 1 ELSE 0 END,
       CASE
           WHEN role_id = 8 THEN 'Client guest access configured for read-only visibility.'
           WHEN role_id = 12 THEN 'Moderates alerts and operational reports.'
           ELSE 'Workspace profile initialized from the role template.'
       END,
       NULL,
       '["overview","alerts","activity"]'
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences up WHERE up.user_id = users.id
);

INSERT INTO user_notifications (user_id, kind, title, message, link_page, read, created_at)
SELECT 1, 'system', 'Audit workspace enabled', 'Monitoring, audit log access, and personal data export are now available.', 'monitor', 0, datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM user_notifications WHERE user_id = 1 AND title = 'Audit workspace enabled');

INSERT INTO user_notifications (user_id, kind, title, message, link_page, read, created_at)
SELECT 8, 'guide', 'Guest access active', 'You are signed in with read-only guest visibility. Use the tutorial before browsing projects.', 'dashboard', 0, datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM user_notifications WHERE user_id = 8 AND title = 'Guest access active');

INSERT INTO user_notifications (user_id, kind, title, message, link_page, read, created_at)
SELECT 12, 'moderation', 'Moderator queue ready', 'Review flagged reports and resolve them with clear notes.', 'moderation', 0, datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM user_notifications WHERE user_id = 12 AND title = 'Moderator queue ready');

INSERT INTO moderation_reports (reporter_user_id, assigned_to_user_id, subject_type, subject_id, reason, details, status, created_at, updated_at)
SELECT 8, 12, 'project', 3, 'deadline_risk', 'Guest flagged the delayed project summary for moderator review.', 'open', datetime('now'), datetime('now')
WHERE NOT EXISTS (
    SELECT 1 FROM moderation_reports WHERE subject_type = 'project' AND subject_id = 3 AND reason = 'deadline_risk'
);
