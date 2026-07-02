// Optional error monitoring. No-op unless SENTRY_DSN is set, so a normal deploy
// sends nothing off-box; set the DSN to forward unhandled exceptions to Sentry.
// This sits *alongside* the structured file log (eventLog.logger) — it does not
// replace it. Kept deliberately thin: manual captureException only, no auto
// HTTP/DB instrumentation (avoids init-ordering constraints).
//
// @sentry/node is loaded via a GUARDED require (not a static import) so the
// server still builds + boots when the package is absent — e.g. after a
// source-update (apply + rebuild + restart, NO npm install). Mirrors the
// established guarded-require('electron') pattern.
import { logger } from './eventLog';

let enabled = false;
let Sentry: any = null;

export function initMonitoring(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // monitoring stays a no-op
  try {
    Sentry = require('@sentry/node');
  } catch {
    logger.warn('[monitoring] SENTRY_DSN set but @sentry/node not installed — run `npm i @sentry/node` to enable');
    return;
  }
  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'production',
      release: process.env.PROMIX_VERSION || undefined,
      // Error monitoring only — no perf tracing by default.
      tracesSampleRate: 0,
    });
    enabled = true;
    logger.info('[monitoring] Sentry enabled');
  } catch (e) {
    logger.warn('[monitoring] Sentry init failed — continuing without it', e);
  }
}

export function isMonitoringEnabled(): boolean {
  return enabled;
}

// Safe to call unconditionally; does nothing when monitoring is disabled.
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  try {
    if (context) Sentry.captureException(err, { extra: context });
    else Sentry.captureException(err);
  } catch {  }
}
