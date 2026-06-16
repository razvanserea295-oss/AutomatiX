-- 034: Email — inbox IMAP + SMTP per user

CREATE TABLE IF NOT EXISTS email_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    email_address TEXT NOT NULL,
    display_name TEXT NOT NULL,
    imap_host TEXT NOT NULL,
    imap_port INTEGER NOT NULL DEFAULT 993,
    imap_use_tls INTEGER NOT NULL DEFAULT 1,
    imap_username TEXT NOT NULL,
    imap_password_enc TEXT NOT NULL,
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_use_tls INTEGER NOT NULL DEFAULT 1,
    smtp_username TEXT NOT NULL,
    smtp_password_enc TEXT NOT NULL,
    last_sync_at TEXT,
    last_sync_uid INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    subject_normalized TEXT NOT NULL,
    latest_date TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 1,
    is_read INTEGER NOT NULL DEFAULT 0,
    snippet TEXT
);
CREATE INDEX IF NOT EXISTS idx_email_threads_account ON email_threads(account_id, latest_date DESC);

CREATE TABLE IF NOT EXISTS email_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    folder TEXT NOT NULL DEFAULT 'INBOX',
    imap_uid INTEGER NOT NULL DEFAULT 0,
    message_id TEXT,
    in_reply_to TEXT,
    thread_id INTEGER,
    from_address TEXT NOT NULL,
    from_name TEXT,
    to_addresses TEXT NOT NULL DEFAULT '[]',
    cc_addresses TEXT DEFAULT '[]',
    subject TEXT NOT NULL DEFAULT '',
    body_text TEXT,
    body_html TEXT,
    date TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    is_starred INTEGER NOT NULL DEFAULT 0,
    has_attachments INTEGER NOT NULL DEFAULT 0,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(account_id, folder, imap_uid)
);
CREATE INDEX IF NOT EXISTS idx_email_msg_account ON email_messages(account_id, folder, date DESC);
CREATE INDEX IF NOT EXISTS idx_email_msg_thread ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_msg_msgid ON email_messages(message_id);

CREATE TABLE IF NOT EXISTS email_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    is_inline INTEGER NOT NULL DEFAULT 0,
    file_data TEXT
);
CREATE INDEX IF NOT EXISTS idx_email_att_msg ON email_attachments(message_id);

CREATE TABLE IF NOT EXISTS email_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    to_addresses TEXT NOT NULL DEFAULT '[]',
    cc_addresses TEXT NOT NULL DEFAULT '[]',
    subject TEXT NOT NULL DEFAULT '',
    body_html TEXT NOT NULL DEFAULT '',
    reply_to_message_id INTEGER,
    attachments_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);
