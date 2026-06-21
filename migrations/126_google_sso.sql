-- 126_google_sso.sql
-- "Sign in with Google" (OAuth 2.0). Sign-in matches an incoming Google account
-- to an EXISTING Automatix user by email (server-side, in authService). The
-- first time that user signs in with Google we also record the stable Google
-- account id ("sub") so future logins can be tied to the same Google identity
-- even if the visible email later changes. Nullable: accounts that never use
-- Google SSO simply keep google_sub = NULL.
ALTER TABLE users ADD COLUMN google_sub TEXT;

-- Enforce that one Google account maps to at most one Automatix user, while
-- still allowing many users with no Google link (partial index skips NULLs).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub
  ON users(google_sub) WHERE google_sub IS NOT NULL;
