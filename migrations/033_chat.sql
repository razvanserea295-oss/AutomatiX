-- 033: Chat intern — mesagerie intre utilizatori
CREATE TABLE IF NOT EXISTS chat_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_a INTEGER NOT NULL,
    user_b INTEGER NOT NULL,
    last_message_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_a, user_b)
);
CREATE INDEX IF NOT EXISTS idx_chat_conv_users ON chat_conversations(user_a, user_b);

CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    attachment_name TEXT,
    attachment_data TEXT,
    reference_type TEXT,
    reference_id INTEGER,
    reference_label TEXT,
    read_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id, created_at);
