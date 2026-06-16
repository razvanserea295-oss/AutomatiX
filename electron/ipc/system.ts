

let ipcMain: any = undefined, dialog: any = undefined, app: any = undefined, BrowserWindow: any = undefined, safeStorage: any = undefined;
try {
  const _e = require('electron');
  if (_e && typeof _e === 'object') {
    ipcMain = _e.ipcMain;
    dialog = _e.dialog;
    app = _e.app;
    BrowserWindow = _e.BrowserWindow;
    safeStorage = _e.safeStorage;
  }
} catch {  }
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ipcRegister } from '../commands/registry';
import { CadPreviewService } from '../services/cadPreviewService';
import { withAuthenticatedUser } from '../middleware/auth';
import { CommandError } from '../middleware/errors';







function getFsSandboxRoot(): string {
  let base: string;
  try {
    base = (app && typeof app.getPath === 'function') ? app.getPath('userData') : '';
  } catch { base = ''; }
  if (!base) base = path.resolve(process.cwd(), 'data');
  return path.resolve(base, 'documents');
}





function resolveSandboxPath(p: unknown): string {
  if (typeof p !== 'string' || p.length === 0) {
    throw CommandError.badRequest('path lipsă sau invalid');
  }
  
  if (path.isAbsolute(p) || /^[a-zA-Z]:/.test(p) || p.includes('\0')) {
    throw CommandError.forbidden('path absolut nu este permis');
  }
  const root = getFsSandboxRoot();
  const resolved = path.resolve(root, p);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw CommandError.forbidden('path în afara sandbox-ului');
  }
  return resolved;
}








const inElectron = !!ipcMain && typeof (ipcMain as any).handle === 'function';





const CREDS_FILE = () => path.join(app.getPath('userData'), 'creds.bin');


let aiProcess: ChildProcess | null = null;

function defaultAiPaths(): string[] {
  const exeName = process.platform === 'win32' ? 'ai-service.exe' : 'ai-service';
  const paths: string[] = [];
  
  if ((process as any).resourcesPath) {
    paths.push(path.join((process as any).resourcesPath, 'ai-service', exeName));
  }
  
  paths.push(path.join(process.cwd(), 'ai-service', 'target-linux', 'release', exeName));
  paths.push(path.join(process.cwd(), 'ai-service', 'target', 'release', exeName));
  
  paths.push(path.join(app.getPath('userData'), 'ai-service', exeName));
  return paths;
}

function findAiExe(customPath?: string): string | null {
  if (customPath && fs.existsSync(customPath)) return customPath;
  for (const p of defaultAiPaths()) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function registerSystemHandlers(): void {
  
  
  
  
  
  
  
  ipcRegister('fs_exists', async (args: any) => {
    return withAuthenticatedUser(args?.token, async () => {
      try {
        const safe = resolveSandboxPath(args?.path);
        return fs.existsSync(safe);
      } catch {
        return false;
      }
    });
  });

  ipcRegister('fs_read_text', async (args: any) => {
    return withAuthenticatedUser(args?.token, async () => {
      const safe = resolveSandboxPath(args?.path);
      
      const stat = fs.statSync(safe);
      if (stat.size > 5 * 1024 * 1024) {
        throw CommandError.badRequest('Fișier prea mare (>5 MB)');
      }
      return fs.readFileSync(safe, 'utf-8');
    });
  });

  
  
  
  ipcRegister('extract_sldprt_thumbnail', async (args: any) => {
    return withAuthenticatedUser(args?.token, async () => {
      const filePathRaw: string = args?.file_path || args?.filePath || '';
      if (!filePathRaw) return null;
      const safe = resolveSandboxPath(filePathRaw);
      return CadPreviewService.extractThumbnail(safe);
    });
  });

  
  
  
  
  if (!inElectron) return;

  
  
  
  ipcMain.handle('dialog_open_directory', async (_e: any, args: any) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      title: args?.title || 'Selecteaza folder',
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0] || null;
  });

  ipcMain.handle('dialog_open_file', async (_e: any, args: any) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const filters = args?.filters || [];
    const result = await dialog.showOpenDialog(win, {
      title: args?.title || 'Selecteaza fisier',
      properties: ['openFile'],
      filters,
    });
    return result.canceled ? null : result.filePaths[0] || null;
  });

  
  
  ipcMain.handle('app_quit', () => {
    app.quit();
  });

  ipcRegister('updater_get_version', async () => {
    return app.getVersion();
  });

  
  
  ipcRegister('system_info', async () => {
    const userData = app.getPath('userData');
    const dbPath = path.join(userData, 'data', 'promix.db');
    const backupsDir = path.join(userData, 'backups');
    const logsDir = path.join(userData, 'logs');

    let dbBytes: number | null = null;
    try { dbBytes = fs.statSync(dbPath).size; } catch {  }

    let backups: Array<{ name: string; bytes: number; mtime: string }> = [];
    try {
      backups = fs.readdirSync(backupsDir)
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const st = fs.statSync(path.join(backupsDir, f));
          return { name: f, bytes: st.size, mtime: st.mtime.toISOString() };
        })
        .sort((a, b) => b.mtime.localeCompare(a.mtime));
    } catch {  }

    return {
      app: {
        name: app.getName(),
        version: app.getVersion(),
        packaged: app.isPackaged,
        locale: app.getLocale(),
      },
      runtime: {
        electron: process.versions.electron ?? null,
        chrome: process.versions.chrome ?? null,
        node: process.versions.node ?? null,
        v8: process.versions.v8 ?? null,
      },
      os: {
        platform: process.platform,
        arch: process.arch,
        release: os.release(),
        type: os.type(),
        hostname: os.hostname(),
        username: os.userInfo().username,
        total_memory_mb: Math.round(os.totalmem() / (1024 * 1024)),
        free_memory_mb: Math.round(os.freemem() / (1024 * 1024)),
        cpu_count: os.cpus().length,
        cpu_model: os.cpus()[0]?.model ?? null,
        uptime_sec: Math.round(os.uptime()),
      },
      paths: {
        userData,
        db: dbPath,
        backups: backupsDir,
        logs: logsDir,
        exe: app.getPath('exe'),
        temp: app.getPath('temp'),
      },
      db: {
        path: dbPath,
        size_bytes: dbBytes,
        backup_count: backups.length,
        last_backup: backups[0] ?? null,
      },
    };
  });

  
  
  ipcMain.handle('ai_service_status', () => {
    return {
      running: aiProcess !== null && aiProcess.exitCode === null,
      pid: aiProcess?.pid ?? null,
      exe: findAiExe(),
    };
  });

  ipcMain.handle('ai_service_start', (_e: any, args: any) => {
    if (aiProcess && aiProcess.exitCode === null) {
      return { ok: true, message: 'AI Service deja pornit', pid: aiProcess.pid };
    }

    const exe = findAiExe(args?.exe_path);
    if (!exe) {
      return { ok: false, message: 'ai-service.exe nu a fost gasit. Verifica calea.' };
    }

    const cwd = path.dirname(exe);
    aiProcess = spawn(exe, [], {
      cwd,
      stdio: 'ignore',
      detached: false,
      windowsHide: true,
    });

    aiProcess.on('exit', (code) => {
      console.log(`[ai-service] exited with code ${code}`);
      aiProcess = null;
    });

    aiProcess.on('error', (err) => {
      console.error(`[ai-service] error: ${err.message}`);
      aiProcess = null;
    });

    return { ok: true, message: 'AI Service pornit', pid: aiProcess.pid };
  });

  ipcMain.handle('ai_service_stop', () => {
    if (!aiProcess || aiProcess.exitCode !== null) {
      aiProcess = null;
      return { ok: true, message: 'AI Service nu rula' };
    }
    aiProcess.kill();
    aiProcess = null;
    return { ok: true, message: 'AI Service oprit' };
  });

  
  
  ipcMain.handle('creds_save', (_e: any, args: { username?: string; password?: string }) => {
    const username = args?.username ?? '';
    const password = args?.password ?? '';
    if (!username || !password) return { ok: false, message: 'username/password required' };
    if (!safeStorage.isEncryptionAvailable()) {
      return { ok: false, message: 'OS encryption not available' };
    }
    const payload = JSON.stringify({ username, password });
    const encrypted = safeStorage.encryptString(payload);
    fs.writeFileSync(CREDS_FILE(), encrypted);
    return { ok: true };
  });

  ipcMain.handle('creds_load', () => {
    try {
      if (!fs.existsSync(CREDS_FILE())) return null;
      if (!safeStorage.isEncryptionAvailable()) return null;
      const buf = fs.readFileSync(CREDS_FILE());
      const plain = safeStorage.decryptString(buf);
      const parsed = JSON.parse(plain) as { username: string; password: string };
      if (!parsed.username || !parsed.password) return null;
      return parsed;
    } catch {
      return null;
    }
  });

  ipcMain.handle('creds_clear', () => {
    try {
      if (fs.existsSync(CREDS_FILE())) fs.unlinkSync(CREDS_FILE());
    } catch {  }
    return { ok: true };
  });
}
