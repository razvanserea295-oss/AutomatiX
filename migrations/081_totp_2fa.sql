-- 081: TOTP-based two-factor authentication.
--
-- Adds opt-in 2FA columns. `totp_secret` holds the base32-encoded HMAC
-- secret (~32 chars) used to derive the 6-digit time-based code via
-- RFC 6238. The secret is stored as text — anyone with read access to
-- the DB file can read it, which is why the at-rest encryption (AES
-- wrapper around the sql.js export) is the matched defense. If the DB
-- file leaks AND the encryption key leaks, 2FA is bypassable.
--
-- `totp_enabled` is the gate: even if a row has a secret, login only
-- requires the second factor when this flag is 1. Lets us provision
-- 2FA in two steps (set secret → confirm with code → flip flag).

ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;
