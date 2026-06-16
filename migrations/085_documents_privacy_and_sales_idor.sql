-- 085: Document privacy + sales-lead IDOR fix.
--
-- Two changes bundled together because they're both about restricting
-- visibility of business data:
--
-- (1) Documents — add an `is_private` flag. Default 0 keeps existing
-- behavior (visible to everyone with documents access). When set to 1
-- by the uploader, only the uploader plus admin/manager see the row.
-- Use case: personal docs (CV, fișe medicale, NDA-uri) that don't
-- belong on the shared project documents list.
--
-- (2) Sales leads — no schema change here. The filtering already
-- happens in SalesService.getAll for non-admin/manager (l.created_by =
-- me OR l.assigned_to = me), but the SQL was string-interpolated AND
-- SalesService.getLead/update/delete had no ownership check on the
-- single-row path. The fix is in code (next commit) — this migration
-- is just the partner.

ALTER TABLE documents ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_documents_owner_private
    ON documents(uploaded_by, is_private);
