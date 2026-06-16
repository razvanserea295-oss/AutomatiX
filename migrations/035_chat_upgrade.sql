-- 035: Chat system upgrade — groups, delivery status, replies

ALTER TABLE chat_conversations ADD COLUMN is_group INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chat_conversations ADD COLUMN group_name TEXT;
ALTER TABLE chat_conversations ADD COLUMN group_members TEXT;

ALTER TABLE chat_messages ADD COLUMN delivered_at TEXT;
ALTER TABLE chat_messages ADD COLUMN reply_to_id INTEGER;
