-- 094: Reintroduce a 'manager' role that sits between 'admin' and 'user'.
--
-- Background: migration 088 collapsed the role taxonomy to admin + user.
-- The user has since asked for a middle tier — a manager who can see all
-- operational data the way an admin does, but who is NOT allowed into
-- Sistem internals (Utilizatori, Sesiuni) or into the platform-level
-- Settings tabs (Server, AI Service, Backup, Despre). Effectively:
--
--   admin   → everything, including Sistem/Users + Sistem/Sessions +
--             Settings/Server + Settings/AI + Settings/Backup + Settings/Despre
--   manager → everything EXCEPT the four Settings tabs above and the
--             Utilizatori / Sesiuni tabs under Sistem
--   user    → all operational pages; admin curates per-page extras via
--             custom_pages
--
-- Permission enforcement happens client-side in src/lib/access.ts (page
-- access map), src/pages/workspace/SistemWorkspace.tsx (which tabs to
-- expose), and src/pages/settings/SettingsPage.tsx (which Settings tabs
-- the nav surfaces). The role row here is the source-of-truth ID the FK
-- in `users.role_id` can point at.
--
-- We use role id = 3 to avoid colliding with the existing admin=1 / user=2
-- IDs and to leave a stable identifier for clients that hard-code it.

INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES
(3, 'manager', 'Manager — vede toată aplicația ca un admin, fără controale de sistem',
 '["manage_projects", "manage_production", "view_finances", "manage_alerts", "manage_costs", "manage_documents", "edit_documents", "view_all", "edit_all"]');
