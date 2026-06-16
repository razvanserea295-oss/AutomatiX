-- 071: Chat group management — track creator, admins, avatar.
--
-- Adds columns needed for the group settings panel:
--   • created_by  — user_id of the original creator (only they can promote/
--                   demote admins or remove members)
--   • group_avatar — optional base64-encoded avatar image
--   • group_admins — JSON array of user_ids with management rights
--
-- Backfill: for existing groups (created before this migration) we know the
-- creator was inserted into both user_a and user_b by createGroup, so user_a
-- is a safe origin for `created_by`. The creator becomes the only initial
-- admin.

ALTER TABLE chat_conversations ADD COLUMN created_by INTEGER;
ALTER TABLE chat_conversations ADD COLUMN group_avatar TEXT;
ALTER TABLE chat_conversations ADD COLUMN group_admins TEXT;

UPDATE chat_conversations
   SET created_by  = user_a,
       group_admins = '[' || user_a || ']'
 WHERE is_group = 1
   AND created_by IS NULL;
