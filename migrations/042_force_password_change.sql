-- Force first-login password change for admin (and any seeded demo users).
--
-- README.md:37-38 warns that admin/1234 must be changed before delivery, but
-- nothing in code enforced it. This migration adds a per-user flag that the
-- auth flow honors: while the flag is 1 the user is redirected to a dedicated
-- change-password screen and cannot navigate the app.
--
-- The flag is cleared by AuthService.changePassword() once a new password
-- is set. New users created via UserService.create() default to 0 (admins
-- already pick the password they hand out).

ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;

-- Mark the seeded demo accounts so the very first launch on a customer site
-- forces a real password before anything else can happen. Match by username
-- so this is a no-op on installs where the admin account was renamed/replaced.
UPDATE users
   SET must_change_password = 1
 WHERE username IN ('admin', 'marian.mgr', 'andrei.pm', 'vasile.hala',
                    'ioana.fin', 'client.viewer');
