-- 106: App-wide "maintenance mode".
--
-- When `maintenance_mode = 1`, every non-admin user is shown a dedicated
-- maintenance screen instead of the app; admins keep full access (so they can
-- finish work / fix things). The flag lives on the company_settings singleton
-- (id = 1) — the same row that already holds app-wide config — so there's one
-- source of truth, already mirrored to clients. Additive & reversible.

ALTER TABLE company_settings ADD COLUMN maintenance_mode INTEGER NOT NULL DEFAULT 0;
ALTER TABLE company_settings ADD COLUMN maintenance_message TEXT;
ALTER TABLE company_settings ADD COLUMN maintenance_eta TEXT;
ALTER TABLE company_settings ADD COLUMN maintenance_updated_at TEXT;
