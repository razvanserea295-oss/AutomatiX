-- 099: Force the factory-default admin to set a real password on first login.
--
-- The seeded admin ships with the well-known password "1234" (Argon2id hash
-- below, from migration 001). Shipping that to a public deployment is an
-- instant compromise. This sets must_change_password = 1 so the next login is
-- routed through ForcePasswordChangePage; the flag clears automatically once
-- the password is changed (see authService.ts changePassword / login).
--
-- The match is scoped to the EXACT factory hash, so an admin who has already
-- rotated their password is left untouched (no spurious re-prompt). Idempotent.

UPDATE users
   SET must_change_password = 1
 WHERE id = 1
   AND LOWER(username) = 'admin'
   AND password_hash = '$argon2id$v=19$m=19456,t=2,p=1$EK6meEuFaNQD4sZJmbfAiA$sFxmzCJQaYWHnsvidB3y/AKF46XJ0n1KhcoJ7NJoZnk';
