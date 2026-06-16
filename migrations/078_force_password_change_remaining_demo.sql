-- 078: Retire the forced-password-change gate.
--
-- The feature was retired by user request:
--   - The client-side redirect was removed earlier (see App.tsx).
--   - The server-side middleware check is removed in middleware/auth.ts.
--   - userService.create / update no longer set the flag.
--
-- This migration clears the flag from every existing user so a previously
-- flagged account (e.g. demo seeds from migration 042 or any admin-created
-- user) can immediately use the app without bumping into a 403 from the
-- old gate. The column itself is preserved in case the feature is
-- reintroduced later.

UPDATE users SET must_change_password = 0;
