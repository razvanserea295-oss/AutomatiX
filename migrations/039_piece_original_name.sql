-- Migration 039: keep the original imported filename/name on project_pieces
-- so the AI sort can rename `name` to a short readable label while the
-- detail view can still show the full original name.

ALTER TABLE project_pieces ADD COLUMN original_name TEXT;

-- Backfill: existing pieces get original_name = current name
UPDATE project_pieces SET original_name = name WHERE original_name IS NULL;
