-- 083: Rename role "contabil" -> "financiar".
--
-- Migration 031 had renamed the original "financiar" (id 6) to "contabil";
-- by user request we revert the name back to "financiar". Description
-- and permissions stay the same — only the human-facing name changes.
--
-- Also cleans up an interim attempt (migration 082) that briefly added
-- a SEPARATE "financiar" role at id 12. That migration was withdrawn;
-- the row, if it landed on any DB, gets removed here so we end up with
-- exactly one role named "financiar".

-- 1. Drop the orphan id-12 row from the brief 082 detour. No-op on
-- fresh installs (they never ran 082 because its file is gone).
DELETE FROM roles WHERE id = 12 AND name = 'financiar';

-- 2. Rename id 6.
UPDATE roles
   SET name        = 'financiar',
       description = 'Financiar — facturi, furnizori, deplasări, costuri proiect'
 WHERE id = 6;
