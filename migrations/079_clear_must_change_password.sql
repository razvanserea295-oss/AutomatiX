-- 079: Clear the must_change_password flag on every existing account.
--
-- The forced-password-change feature was retired (see middleware/auth.ts
-- and migration 078). On databases where 042 / 078 already ran with their
-- previous content, several users still have must_change_password = 1.
-- The server-side gate is gone so the flag is harmless, but we clear it
-- anyway for tidiness and to avoid confusing anyone reading the column
-- in audit queries.

UPDATE users SET must_change_password = 0 WHERE must_change_password = 1;
