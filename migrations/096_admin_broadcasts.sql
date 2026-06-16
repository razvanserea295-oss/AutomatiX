-- 096: One-shot admin broadcast popups.
--
-- Admin creates a broadcast (title + body + severity). The next time each
-- user opens the app, they see a single popup; clicking OK records a
-- dismissal so it never shows again FOR THAT USER. Other users still see
-- it on their next login until they dismiss it themselves.
--
-- This is intentionally separate from `user_notifications` (which is the
-- bell-icon inbox, optionally targeted) — broadcasts are blocking modals
-- shown at app boot, intended for things like "Update 1.3 — Rol Manager
-- adăugat. Citește schimbările." The two systems don't compete.

CREATE TABLE IF NOT EXISTS admin_broadcasts (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT NOT NULL,
    body                TEXT NOT NULL,
    -- Visual treatment + icon. We keep this as free text so future levels
    -- (e.g. "critical") don't need a schema change.
    severity            TEXT NOT NULL DEFAULT 'info',
    created_by_user_id  INTEGER NOT NULL,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    -- Optional auto-expire. NULL = no expiry. Useful for "Mâine între 18:00
    -- și 20:00 facem mentenanță" — past that point the popup self-retires.
    expires_at          TEXT,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_created_at
    ON admin_broadcasts(created_at DESC);

CREATE TABLE IF NOT EXISTS admin_broadcast_dismissals (
    broadcast_id    INTEGER NOT NULL,
    user_id         INTEGER NOT NULL,
    dismissed_at    TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (broadcast_id, user_id),
    FOREIGN KEY (broadcast_id) REFERENCES admin_broadcasts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)      REFERENCES users(id)            ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_broadcast_dismissals_user
    ON admin_broadcast_dismissals(user_id);
