

let app: any = undefined, ipcMain: any = undefined;
try {
  const _e = require('electron');
  if (_e && typeof _e === 'object') { app = _e.app; ipcMain = _e.ipcMain; }
} catch {  }






let log: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _l = require('electron-log/main');
  log = _l && _l.default ? _l.default : _l;
  if (!log) throw new Error('electron-log unavailable');
} catch {
  
  log = {
    initialize: () => {  },
    transports: {
      
      
      file: { level: undefined, resolvePathFn: undefined, maxSize: undefined, format: undefined },
      console: { level: undefined },
    },
    // eslint-disable-next-line no-console
    info: (...args: unknown[]) => console.info(...args),
    // eslint-disable-next-line no-console
    warn: (...args: unknown[]) => console.warn(...args),
    // eslint-disable-next-line no-console
    error: (...args: unknown[]) => console.error(...args),
    // eslint-disable-next-line no-console
    debug: (...args: unknown[]) => console.debug(...args),
  };
}

import path from 'path';













export function setupLogging(): void {
  log.initialize();

  
  
  const userDataDir = app?.getPath?.('userData');
  const logsDir = userDataDir ? path.join(userDataDir, 'logs') : path.join(process.cwd(), 'logs');

  log.transports.file.resolvePathFn = () => path.join(logsDir, 'main.log');
  log.transports.file.maxSize = 5 * 1024 * 1024;
  log.transports.file.level = 'info';
  log.transports.console.level = app?.isPackaged ? 'warn' : 'debug';
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

  
  process.on('uncaughtException', (err) => {
    log.error('[uncaught]', err);
  });
  process.on('unhandledRejection', (reason) => {
    log.error('[unhandledRejection]', reason);
  });

  
  
  
  if (ipcMain) {
    ipcMain.handle('log_renderer', (_e: unknown, args: { level?: string; message?: string; meta?: unknown }) => {
      const level = (args?.level as 'info' | 'warn' | 'error' | 'debug') || 'info';
      const msg = args?.message ?? '';
      const meta = args?.meta ?? undefined;
      (log[level] ?? log.info)(`[renderer] ${msg}`, meta);
      return { ok: true };
    });

    ipcMain.handle('log_get_path', () => {
      return logsDir;
    });
  }

  const version = app?.getVersion?.() ?? 'server';
  log.info(`[logger] ready. Version ${version}. packaged=${app?.isPackaged ?? false}`);
}

export { log };
