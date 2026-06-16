-- 088: Consolidate role model down to admin + user, and add a symbolic
-- job_title column on users.
--
-- Background: the original 11-role taxonomy (admin, manager, marketer,
-- proiectant, hala, financiar, etc.) ended up being more friction than
-- value — each role required hand-tuned access policies and the admin
-- UI got muddy as soon as you wanted "a manager who also sees engineering
-- but not finance". User decision: keep only TWO roles ('admin' and
-- 'user'); the user role inherits everything the old manager role had.
-- Per-user nuance is now expressed via `users.custom_pages` (with the
-- `denied` level we introduced in migration 085-era work).
--
-- The information that "Mihai is the production foreman" was previously
-- carried by the role name. We replace that with a `job_title` column —
-- a free-text label shown under the user's name in the UI but with NO
-- effect on permissions.
--
-- This migration:
--   1. Re-routes every user who isn't on role 1 (admin) to role 2.
--   2. Renames role 2 ('manager') to 'user' and rewrites its permission
--      JSON + description.
--   3. Drops every other role row. FK from `users.role_id` is the only
--      reference into `roles`, so once step 1 finishes there are no
--      orphans.
--   4. Adds the `job_title` column.

-- Step 1: move everyone off the old auxiliary roles onto role 2.
UPDATE users SET role_id = 2 WHERE role_id NOT IN (1, 2);

-- Step 2: rename + repurpose role 2.
UPDATE roles
   SET name        = 'user',
       description = 'Utilizator — acces complet operațional (acces admin se face prin rolul de Admin)',
       permissions = '["all", "manage_projects", "manage_production", "view_finances", "manage_alerts", "manage_costs", "manage_documents", "edit_documents", "view_all", "edit_all"]'
 WHERE id = 2;

-- Step 3: clean up everything else.
DELETE FROM roles WHERE id NOT IN (1, 2);

-- Step 4: symbolic job title. Free-text, NULL when not provided. Shown
-- in chat / sidebar / user cards but never gates permissions.
ALTER TABLE users ADD COLUMN job_title TEXT;
