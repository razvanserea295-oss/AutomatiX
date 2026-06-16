-- 052: Add `snippet` column to email_messages.
--
-- The original migration 034 created snippet on email_threads but not on
-- email_messages. The renderer (EmailPage message list) reads `snippet`
-- from the row payload to show a one-line preview under the subject —
-- without this column, syncInbox INSERTs were failing in 035-style schemas
-- with "table email_messages has no column named snippet" and the inbox
-- never populated.
--
-- Safe to run on existing databases: ALTER ADD COLUMN with no DEFAULT
-- leaves existing rows with NULL snippet. New syncs / sends will fill it
-- (see emailService.syncInbox + sendMessage).

ALTER TABLE email_messages ADD COLUMN snippet TEXT;
