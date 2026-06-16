-- 113: Profile picture (avatar) support.
--
-- Adds a nullable `avatar_path` to users — the relative path of the uploaded
-- profile picture on disk (e.g. 'avatars/12.png'). NULL ⇒ fall back to the
-- initials avatar. The image bytes live on disk under data/avatars/{user_id}.{ext}
-- (served by /api/avatar/:userId), NOT in the DB. Additive only.

ALTER TABLE users ADD COLUMN avatar_path TEXT;
