// Universal console logger. (The Electron desktop shell + electron-log were
// removed — the desktop runtime is now Tauri.) Safe in the server (Node) and the
// frontend (browser/Tauri webview); the public shape is kept backwards-compatible
// so existing `log.*` / `setupLogging()` callers keep working.

type Args = unknown[];

export const log = {
  initialize: () => { /* no-op (was electron-log) */ },
  transports: {
    file: { level: undefined as string | undefined, resolvePathFn: undefined as unknown, maxSize: undefined as number | undefined, format: undefined as string | undefined },
    console: { level: undefined as string | undefined },
  },
  info: (...args: Args) => console.info(...args),
  warn: (...args: Args) => console.warn(...args),
  error: (...args: Args) => console.error(...args),
  debug: (...args: Args) => console.debug(...args),
};

export function setupLogging(): void {
  // Node-only crash hooks; guarded so the browser/Tauri bundle is a no-op.
  const proc = typeof process !== 'undefined' ? process : undefined;
  proc?.on?.('uncaughtException', (err) => log.error('[uncaught]', err));
  proc?.on?.('unhandledRejection', (reason) => log.error('[unhandledRejection]', reason));
  log.info('[logger] ready (console transport)');
}
