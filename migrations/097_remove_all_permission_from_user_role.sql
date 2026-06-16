-- 097: Remove the wildcard "all" permission from the 'user' role (id = 2).
--
-- SECURITY FIX — privilege escalation.
--
-- Migration 088 rebuilt role id=2 as 'user' and seeded its permissions as:
--   ["all", "manage_projects", "manage_production", "view_finances",
--    "manage_alerts", "manage_costs", "manage_documents", "edit_documents",
--    "view_all", "edit_all"]
-- The leading "all" is a wildcard: hasPermission() in
-- electron/services/userService.ts returns true for EVERY permission check
-- when "all" is present, including 'manage_users'. Because the user-management
-- commands (create_user / update_user / delete_user) are gated only on
-- 'manage_users', any ordinary 'user' account could create accounts or set its
-- own role_id to admin — a full collapse of the role model.
--
-- The 'manager' role added later in migration 094 deliberately carries the
-- SAME operational permissions WITHOUT "all" (manager sits ABOVE user yet has
-- fewer raw permissions — proof the "all" on 'user' was an accident, not
-- intent). This migration aligns 'user' to that same enumerated set.
--
-- After this, 'manage_users' (and every other admin-only capability) is denied
-- to both manager and user at the backend; the admin / manager / user UI
-- distinction is enforced client-side in src/lib/access.ts + users.custom_pages,
-- exactly as migration 094 documents. 'view_all' is retained explicitly, so
-- read access across the app is unchanged — only the wildcard escalation is
-- removed.

UPDATE roles
SET permissions = '["manage_projects", "manage_production", "view_finances", "manage_alerts", "manage_costs", "manage_documents", "edit_documents", "view_all", "edit_all"]',
    updated_at = datetime('now')
WHERE id = 2 AND name = 'user';
