-- 110: Hybrid storage for briefing attachments — large files on disk.
--
-- Inline base64 in `briefing_attachments.data` is fine for small references
-- but a 500 MB upload would bloat the AES-GCM-encrypted DB and block the event
-- loop on every save. So files over a threshold (5 MB) now stream to disk under
-- `data/briefing-files/{briefing_id}/` and the row keeps only a reference:
--   - `storage_path` : absolute on-disk path (NULL ⇒ legacy inline base64 in `data`)
--   - `size_bytes`   : real byte size (so listings don't need LENGTH(data), which
--                      is 0 for disk-backed rows)
-- `data` is set to '' for disk-backed rows (the column is NOT NULL from mig 102;
-- the real bytes live at storage_path). Existing inline rows are untouched
-- (storage_path NULL, size still derived from LENGTH(data)). Additive only.

ALTER TABLE briefing_attachments ADD COLUMN storage_path TEXT;
ALTER TABLE briefing_attachments ADD COLUMN size_bytes   INTEGER;
