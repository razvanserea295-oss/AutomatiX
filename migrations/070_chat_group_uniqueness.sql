-- 070: Fix chat group creation — UNIQUE(user_a, user_b) breaks groups.
--
-- Bug: migration 033 declared chat_conversations with a column-level UNIQUE
-- constraint on (user_a, user_b). For DMs that's correct (one DM thread per
-- pair). But the group-creation path in chatService.ts inserts groups with
-- user_a = user_b = creator.id. The first group goes through; the second
-- attempt by the same creator hits the UNIQUE index and fails silently.
--
-- Fix: replace the always-on UNIQUE with a partial UNIQUE INDEX that only
-- applies when is_group = 0 (DMs). Groups can then be created freely.
--
-- SQLite doesn't allow dropping a column-level UNIQUE in place, so we rebuild
-- the table.

PRAGMA foreign_keys = OFF;

CREATE TABLE chat_conversations_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_a INTEGER NOT NULL,
    user_b INTEGER NOT NULL,
    last_message_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    is_group INTEGER NOT NULL DEFAULT 0,
    group_name TEXT,
    group_members TEXT
);

INSERT INTO chat_conversations_new (id, user_a, user_b, last_message_at, created_at, is_group, group_name, group_members)
SELECT id, user_a, user_b, last_message_at, created_at,
       COALESCE(is_group, 0), group_name, group_members
FROM chat_conversations;

DROP TABLE chat_conversations;
ALTER TABLE chat_conversations_new RENAME TO chat_conversations;

-- Partial unique only for DMs — groups can repeat (user_a, user_b).
CREATE UNIQUE INDEX IF NOT EXISTS chat_conv_dm_unique
    ON chat_conversations(user_a, user_b)
    WHERE is_group = 0;

-- Lookup index (was idx_chat_conv_users in migration 033).
CREATE INDEX IF NOT EXISTS idx_chat_conv_users
    ON chat_conversations(user_a, user_b);

PRAGMA foreign_keys = ON;
