-- 077: Store actual file bytes for documents (in-app preview).
--
-- Until now `documents.file_path` held a one-segment filename and the
-- file itself was expected to live on disk somewhere — but the upload
-- form never actually shipped the bytes anywhere, so "Download" pointed
-- at `/api/files/<name>` which 404'd. To make documents viewable
-- in-app (without setting up an object store), we store a base64
-- data URL inline.
--
-- Trade-off: SQLite TEXT can hold large blobs, but >5MB starts to
-- noticeably slow up reads. The frontend warns + caps file size before
-- upload to keep this manageable.

ALTER TABLE documents ADD COLUMN file_data TEXT;
ALTER TABLE documents ADD COLUMN file_mime TEXT;
