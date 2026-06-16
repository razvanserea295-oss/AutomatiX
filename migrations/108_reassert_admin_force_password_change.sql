-- 108: Re-assert the forced password change for the factory-default admin.
--
-- The client-side gate (App.tsx → ForcePasswordChangePage) was retired at one
-- point, leaving the seeded admin able to log straight in with the well-known
-- "1234". The gate is now restored; this migration guarantees the DB flag is
-- set so the gate actually fires, independent of whether migration 099 ran on
-- this particular database.
--
-- Scope is the EXACT factory Argon2id hash of "1234" (from migration 001), so:
--   • an admin who already rotated their password is NOT re-prompted, and
--   • re-running is a no-op (the row is already at must_change_password = 1).
-- Fully additive and reversible (set the flag back to 0 to undo).

UPDATE users
   SET must_change_password = 1
 WHERE id = 1
   AND LOWER(username) = 'admin'
   AND password_hash = '$argon2id$v=19$m=19456,t=2,p=1$EK6meEuFaNQD4sZJmbfAiA$sFxmzCJQaYWHnsvidB3y/AKF46XJ0n1KhcoJ7NJoZnk';
