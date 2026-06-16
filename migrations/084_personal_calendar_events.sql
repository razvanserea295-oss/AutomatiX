-- 084: Personal calendar events.
--
-- The calendar aggregates dated entities from across the system (project
-- deadlines, deplasari, maintenance, compliance, invoices, quotations) —
-- those are operational data, visible to every user with calendar
-- access. This table adds a NEW, PRIVATE dimension: events that a single
-- user creates for themselves (reminders, personal todos with a date,
-- meetings outside the project pipeline, vacation days, etc).
--
-- Visibility rule: a row is visible ONLY to its `user_id`. Enforced
-- server-side in CalendarService — never in the SQL filter — so a stray
-- direct query can't accidentally leak them.
--
-- color: optional hex string (e.g. '#10b981'). Frontend falls back to a
-- default style if NULL.

CREATE TABLE personal_calendar_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT    NOT NULL,
    date       TEXT    NOT NULL,        -- YYYY-MM-DD
    end_date   TEXT,                    -- YYYY-MM-DD, optional (multi-day)
    notes      TEXT,
    color      TEXT,                    -- hex like '#10b981', optional
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pce_user_date ON personal_calendar_events(user_id, date);
