-- 032: Custom page access per user (admin override)
ALTER TABLE users ADD COLUMN custom_pages TEXT;
-- custom_pages = JSON array of page IDs that override role defaults
-- NULL = use role defaults, empty array = no pages, array with values = specific pages
