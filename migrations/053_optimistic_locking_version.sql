-- Optimistic concurrency control — adds a `version` column to entities that
-- multiple users edit simultaneously. Updates must pass the expected version;
-- the service bumps it by 1 on every successful UPDATE.
--
-- Why: two users editing the same project would silently overwrite each
-- other. The `WHERE id = ? AND version = ?` filter turns the conflict into
-- a 409 instead of lost data.

ALTER TABLE projects        ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE project_pieces  ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contracts       ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
