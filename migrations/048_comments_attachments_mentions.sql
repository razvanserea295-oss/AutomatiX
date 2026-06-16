-- Add attachment + mention columns to project_comments.
--
-- attachments: JSON array of file paths/names. Lightweight — comments can
-- carry a few small files (drawings, photos) without a separate documents row.
--
-- mentioned_user_ids: JSON array of user IDs extracted from @username
-- pattern in content. Drives notifications.

ALTER TABLE project_comments ADD COLUMN attachments TEXT;          -- JSON array of {name, path, size_bytes}
ALTER TABLE project_comments ADD COLUMN mentioned_user_ids TEXT;   -- JSON array of user IDs
