-- 080: Account-level lockout to defend against distributed brute-force.
--
-- The /api/cmd/login route already has per-IP rate limiting (10/min/IP) but
-- an attacker rotating IPs through a proxy pool defeats it. This migration
-- adds per-account counters: after 5 consecutive failed login attempts the
-- account is locked for 15 minutes regardless of source IP. A successful
-- login resets the counter.
--
-- Both columns are nullable / zero-default so existing rows pick this up
-- without a migration step on the auth side.

ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TEXT;
