// Global client error capture. Forwards uncaught errors and unhandled promise
// rejections to the server's /api/cmd/log_renderer endpoint, which routes them
// into the structured server log (eventLog.logger). This complements the React
// <ErrorBoundary/> (which only catches render-tree errors) by also capturing
// errors thrown outside React — event handlers, timers, async callbacks.
//
// Dependency-free by design (no Sentry SDK in the bundle). To also forward to
// Sentry SaaS, init @sentry/react behind VITE_SENTRY_DSN separately.

const MAX_REPORTS_PER_SESSION = 50; // hard cap so an error loop can't flood the server
let sent = 0;
// Coalesce identical messages fired in a tight burst (e.g. a render loop).
const recent = new Map<string, number>();
const DEDUPE_WINDOW_MS = 5000;

function shouldSend(key: string): boolean {
  if (sent >= MAX_REPORTS_PER_SESSION) return false;
  const now = Date.now();
  const last = recent.get(key);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return false;
  recent.set(key, now);
  return true;
}

function post(level: 'error', message: string, meta: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const { protocol, origin, href } = window.location;
  if (protocol !== 'http:' && protocol !== 'https:') return; // skip file:// (desktop shell)
  if (!shouldSend(message)) return;
  sent += 1;
  let token = '';
  try { token = localStorage.getItem('promix_token') || ''; } catch {  }
  try {
    fetch(`${origin}/api/cmd/log_renderer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ level, message, meta: { ...meta, href } }),
      keepalive: true,
    }).catch(() => {  });
  } catch {  }
}

let installed = false;

export function installClientErrorReporter(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event: ErrorEvent) => {
    const err = event.error;
    const message = `window.onerror: ${event.message || (err && err.message) || 'unknown error'}`;
    post('error', message, {
      name: err?.name,
      stack: err?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = `unhandledrejection: ${
      reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'non-error rejection'
    }`;
    post('error', message, {
      name: reason instanceof Error ? reason.name : undefined,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
