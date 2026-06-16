-- 072: Add before/after photos to piece_services.
--
-- The Q2 simplification of MaintenancePage moved the before/after photo
-- feature out of the throwaway "Tools avansate" panel (where photos lived
-- in localStorage with no link to a specific service) and into the service
-- form itself, so each servisare carries its own pair of photos.
--
-- Photos are stored as base64 data URLs (`data:image/...;base64,...`).
-- The upload widget compresses to ~1024px max dim @ JPEG 0.7 before
-- saving, which keeps each image under ~250KB.

ALTER TABLE piece_services ADD COLUMN before_photo TEXT;
ALTER TABLE piece_services ADD COLUMN after_photo TEXT;
