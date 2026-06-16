-- PROMIX SAP+ Initial Schema
-- Phase 4: Auth + Users + Roles

-- ============================================
-- ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    last_login TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================
-- AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- INSERT DEFAULT ROLES
-- ============================================
INSERT INTO roles (id, name, description, permissions) VALUES
(1, 'admin', 'Administrator de sistem', '["all", "manage_users", "manage_roles", "view_all", "edit_all", "delete_all"]'),
(2, 'manager', 'Manager operațional', '["manage_projects", "manage_workers", "view_finances", "manage_alerts", "view_all", "edit_all"]'),
(3, 'hala', 'Șef de hală', '["manage_production", "view_workers", "view_materials", "view_projects", "edit_projects"]'),
(4, 'muncitor', 'Muncitor', '["view_own_projects", "time_tracking", "view_own_data"]'),
(5, 'financiar', 'Contabil / Financiar', '["view_finances", "manage_costs", "view_projects", "view_workers"]'),
(6, 'viewer', 'Vizualizator', '["view_all"]');

-- ============================================
-- INSERT DEFAULT USERS (admin password changed to 1234)
-- Password hash is Argon2id of "1234" for admin; other users remain seeded with Promix2024!
-- ============================================
INSERT INTO users (id, username, email, password_hash, full_name, role_id, active) VALUES
(1, 'admin', 'admin@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$EK6meEuFaNQD4sZJmbfAiA$sFxmzCJQaYWHnsvidB3y/AKF46XJ0n1KhcoJ7NJoZnk', 'Alexandru Popescu', 1, 1),
(2, 'mgr.ion', 'ion.stanescu@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$t/+1SCI6YLJRSCufCaYbgw$qHxwAnu1P3SpJ7cPfxtUD8rS5Kx2xIc79OJz2WVew+o', 'Ion Stănescu', 2, 1),
(3, 'sef.hala', 'mihai.dumitru@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$t/+1SCI6YLJRSCufCaYbgw$qHxwAnu1P3SpJ7cPfxtUD8rS5Kx2xIc79OJz2WVew+o', 'Mihai Dumitru', 3, 1),
(4, 'contab', 'elena.ionescu@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$t/+1SCI6YLJRSCufCaYbgw$qHxwAnu1P3SpJ7cPfxtUD8rS5Kx2xIc79OJz2WVew+o', 'Elena Ionescu', 5, 1),
(5, 'muncitor1', 'gheorghe.marin@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$t/+1SCI6YLJRSCufCaYbgw$qHxwAnu1P3SpJ7cPfxtUD8rS5Kx2xIc79OJz2WVew+o', 'Gheorghe Marin', 4, 1),
(6, 'muncitor2', 'vasile.ion@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$t/+1SCI6YLJRSCufCaYbgw$qHxwAnu1P3SpJ7cPfxtUD8rS5Kx2xIc79OJz2WVew+o', 'Vasile Ion', 4, 1),
(7, 'muncitor3', 'adi.pop@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$t/+1SCI6YLJRSCufCaYbgw$qHxwAnu1P3SpJ7cPfxtUD8rS5Kx2xIc79OJz2WVew+o', 'Adrian Popa', 4, 1),
(8, 'viewer1', 'cristina.paraschiv@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$t/+1SCI6YLJRSCufCaYbgw$qHxwAnu1P3SpJ7cPfxtUD8rS5Kx2xIc79OJz2WVew+o', 'Cristina Paraschiv', 6, 1),
(9, 'muncitor4', 'ionel.cosma@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$t/+1SCI6YLJRSCufCaYbgw$qHxwAnu1P3SpJ7cPfxtUD8rS5Kx2xIc79OJz2WVew+o', 'Ionel Cosma', 4, 1),
(10, 'muncitor5', 'dan.cristea@promix.ro', '$argon2id$v=19$m=19456,t=2,p=1$t/+1SCI6YLJRSCufCaYbgw$qHxwAnu1P3SpJ7cPfxtUD8rS5Kx2xIc79OJz2WVew+o', 'Dan Cristea', 4, 0);
