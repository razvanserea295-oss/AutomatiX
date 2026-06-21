import crypto from 'crypto';

/**
 * Internal shared secret that gates the `login_google` command.
 *
 * The Google OAuth dance runs on the host server (server/index.ts). After it
 * has verified the user's Google identity it asks a tenant backend to issue a
 * session via the `login_google` command — which, unlike `login`, takes only an
 * email (no password). To make sure ONLY our own callback can mint a session
 * that way (and nobody can POST `{email: "admin@…"}` to /api/cmd/login_google to
 * forge a login), both sides share this secret and the command rejects any call
 * whose secret doesn't match.
 *
 * Single-process (single-tenant) deployments get a random per-boot value that is
 * automatically identical on both sides (same module instance). Multi-tenant
 * setups run each firm in a SEPARATE process, so they MUST pin the same value on
 * every instance via the PROMIX_SSO_BROKER_SECRET env var.
 */
export const SSO_BROKER_SECRET =
  process.env.PROMIX_SSO_BROKER_SECRET || crypto.randomBytes(32).toString('hex');
