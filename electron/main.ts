


















import { app, BrowserWindow, Menu, ipcMain, shell, nativeImage, dialog, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';


const WINDOW_BG = '#1C2228';            
const MIN_SPLASH_MS = 1200;             
const ACCENT = '#2DD4BF';               



const DEFAULT_W = 1600;
const DEFAULT_H = 1000;
const MIN_W = 1200;
const MIN_H = 720;

const isDev = !app.isPackaged && process.env.ELECTRON_RENDERER_URL != null;


// Thin-client mode: when PROMIX_REMOTE_URL points at a central Automatix server,
// the app loads that server's UI directly (no local server) and auto-reloads the
// window whenever the server's frontend version changes — so frontend deploys
// reach desktop clients with no app rebuild.
const REMOTE_URL = (process.env.PROMIX_REMOTE_URL || '').trim().replace(/\/+$/, '');

const START_SERVER = REMOTE_URL
  ? false
  : process.env.ELECTRON_START_SERVER === '1'
  ? true
  : process.env.ELECTRON_START_SERVER === '0'
    ? false
    : !isDev;

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let serverPort = 0;
let serverUrl = '';




function bootLog(msg: string): void {
  try {
    const p = path.join(app.getPath('userData'), 'boot.log');
    fs.appendFileSync(p, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {  }
  console.log('[boot]', msg);
}





interface WindowState { x?: number; y?: number; width: number; height: number; maximized: boolean }

function windowStatePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState(): WindowState {
  try {
    const raw = JSON.parse(fs.readFileSync(windowStatePath(), 'utf-8')) as Partial<WindowState>;
    const state: WindowState = {
      x: typeof raw.x === 'number' ? raw.x : undefined,
      y: typeof raw.y === 'number' ? raw.y : undefined,
      width: typeof raw.width === 'number' ? raw.width : DEFAULT_W,
      height: typeof raw.height === 'number' ? raw.height : DEFAULT_H,
      maximized: raw.maximized !== false, 
    };
    
    
    if (state.x != null && state.y != null) {
      const inView = screen.getAllDisplays().some((d) => {
        const a = d.workArea;
        return state.x! < a.x + a.width && state.x! + 80 > a.x &&
               state.y! < a.y + a.height && state.y! + 40 > a.y;
      });
      if (!inView) { state.x = undefined; state.y = undefined; }
    }
    return state;
  } catch {
    
    return { width: DEFAULT_W, height: DEFAULT_H, maximized: true };
  }
}

function saveWindowState(win: BrowserWindow): void {
  try {
    const maximized = win.isMaximized();
    
    
    const b = win.getNormalBounds();
    const state: WindowState = { x: b.x, y: b.y, width: b.width, height: b.height, maximized };
    fs.writeFileSync(windowStatePath(), JSON.stringify(state));
  } catch {  }
}


const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}




function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}


function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`${url}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('error', retry);
      req.setTimeout(2000, () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() > deadline) return reject(new Error('Serverul nu a pornit la timp.'));
      setTimeout(tick, 250);
    };
    tick();
  });
}


function serverEntryPath(): string {
  
  const candidates = [
    path.join(__dirname, '..', 'dist-server', 'server', 'index.js'),
    path.join(process.resourcesPath || '', 'app', 'dist-server', 'server', 'index.js'),
    path.join(app.getAppPath(), 'dist-server', 'server', 'index.js'),
  ];
  return candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) || candidates[0];
}


async function startInProcessServer(): Promise<void> {
  
  const dataRoot = app.getPath('userData');
  try { fs.mkdirSync(dataRoot, { recursive: true }); } catch {  }
  try { process.chdir(dataRoot); } catch (e) { console.error('[main] chdir failed:', e); }

  serverPort = await findFreePort();
  serverUrl = `http://127.0.0.1:${serverPort}`;
  process.env.PROMIX_PORT = String(serverPort);
  
  
  
  process.env.PROMIX_RATE_LIMIT_OFF = process.env.PROMIX_RATE_LIMIT_OFF || '1';

  const entry = serverEntryPath();
  bootLog(`server entry = ${entry} (exists=${fs.existsSync(entry)}), port=${serverPort}, cwd=${process.cwd()}`);
  if (!fs.existsSync(entry)) {
    throw new Error(`Build server lipsește: ${entry}. Rulează "npm run build:electron".`);
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(entry); 
  } catch (e: any) {
    bootLog(`require(server) THREW: ${e?.stack || e}`);
    throw e;
  }
  bootLog('require(server) returned; waiting for /api/health…');
  await waitForServer(serverUrl);
  bootLog('server is healthy');
}



function splashHtml(): string {
  
  
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8" />
<style>
  :root { --accent: ${ACCENT}; }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-user-select:none; user-select:none; }
  html,body { width:100%; height:100%; overflow:hidden; background:transparent; }
  body {
    font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    color:#E6EDF3; -webkit-app-region: drag;
    display:flex; align-items:center; justify-content:center;
  }
  .card {
    position:relative; width:100vw; height:100vh; overflow:hidden;
    border-radius:14px;
    background: radial-gradient(120% 110% at 50% 0%, #1E2730 0%, #141A1F 72%);
    border:1px solid rgba(255,255,255,.08);
    box-shadow: 0 18px 44px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05);
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:13px;
  }
  .top-accent { position:absolute; top:0; left:0; right:0; height:3px;
    background:linear-gradient(90deg,#16307A 0%,#4D86FF 50%,#16307A 100%); }
  .logo { width:46px; height:46px; display:block; }
  .logo .hex { stroke-dasharray:300; stroke-dashoffset:300; animation: draw .9s ease forwards; }
  .logo .nd { opacity:0; transform-box:fill-box; transform-origin:center; }
  .logo .n1 { animation: pop .35s ease forwards .8s; }
  .logo .n2 { animation: pop .35s ease forwards .95s; }
  .logo .n3 { animation: pop .35s ease forwards 1.1s; }
  @keyframes draw { to { stroke-dashoffset:0; } }
  @keyframes pop { 0%{opacity:0;transform:scale(.3)} 60%{opacity:1;transform:scale(1.2)} 100%{opacity:1;transform:scale(1)} }
  .title { font-size:18px; font-weight:600; letter-spacing:-.01em; color:#ECECEC; }
  .bar { position:relative; width:140px; height:3px; border-radius:3px; background:rgba(255,255,255,.10); overflow:hidden; }
  .bar::after { content:''; position:absolute; left:-45%; top:0; height:100%; width:45%; border-radius:3px;
    background:linear-gradient(90deg,transparent,#4D86FF,transparent); animation: slide 1.1s ease-in-out infinite; }
  @keyframes slide { to { left:100%; } }
  .status { font-size:10px; color:#8B97A2; letter-spacing:.10em; text-transform:uppercase;
    min-height:13px; transition:opacity .25s ease; }
  body { opacity:0; animation: appear .35s ease forwards; }
  @keyframes appear { to { opacity:1; } }
  @media (prefers-reduced-motion: reduce) {
    .bar::after, body, .logo .hex, .logo .nd { animation:none !important; }
    body { opacity:1; } .logo .hex { stroke-dashoffset:0; } .logo .nd { opacity:1; }
  }
</style></head>
<body>
  <div class="card">
    <div class="top-accent"></div>
    <svg class="logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#5B9CFF"/><stop offset=".55" stop-color="#3FB0FF"/><stop offset="1" stop-color="#27D3FF"/>
      </linearGradient></defs>
      <path class="hex" d="M50 8 L86.4 29 L86.4 71 L50 92 L13.6 71 L13.6 29 Z" stroke="url(#sg)" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M29 50 H71" stroke="url(#sg)" stroke-width="5" stroke-linecap="round"/>
      <circle class="nd n1" cx="29" cy="50" r="7" stroke="url(#sg)" stroke-width="5" fill="none"/>
      <circle class="nd n2" cx="50" cy="50" r="4.5" fill="url(#sg)"/>
      <circle class="nd n3" cx="71" cy="50" r="6" fill="url(#sg)"/>
    </svg>
    <div class="title">Automatix</div>
    <div class="bar"></div>
    <div class="status" id="status">Se încarcă…</div>
  </div>
  <script>
    window.__setStatus = function (t) {
      var el = document.getElementById('status');
      if (!el) return;
      el.style.opacity = '0';
      setTimeout(function(){ el.textContent = t; el.style.opacity = '1'; }, 180);
    };
  </script>
</body></html>`;
}

function createSplash(): BrowserWindow {
  const win = new BrowserWindow({
    width: 340,
    height: 200,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    center: true,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml()));
  win.once('ready-to-show', () => win.show());
  return win;
}

function setSplashStatus(text: string): void {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.webContents
    .executeJavaScript(`window.__setStatus && window.__setStatus(${JSON.stringify(text)})`)
    .catch(() => {  });
}



function createMainWindow(): BrowserWindow {
  const state = loadWindowState();
  const customTitleBar = process.platform === 'win32' || process.platform === 'linux';
  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: MIN_W,
    minHeight: MIN_H,
    show: false,
    backgroundColor: WINDOW_BG,
    autoHideMenuBar: customTitleBar,
    title: 'automatiX',
    ...(customTitleBar ? { frame: false } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  
  if (state.maximized) win.maximize();

  
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) { void shell.openExternal(url); }
    return { action: 'deny' };
  });

  
  win.on('maximize', () => win.webContents.send('window:max-state', true));
  win.on('unmaximize', () => win.webContents.send('window:max-state', false));

  
  
  const persist = () => saveWindowState(win);
  win.on('resize', persist);
  win.on('move', persist);
  win.on('close', persist);

  const target = isDev ? process.env.ELECTRON_RENDERER_URL! : serverUrl;
  void win.loadURL(target);

  return win;
}



function buildMenu(): void {
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'Fișier',
      submenu: [isMac ? { role: 'close' as const } : { role: 'quit' as const, label: 'Ieșire' }],
    },
    {
      label: 'Vizualizare',
      submenu: [
        { role: 'reload' as const, label: 'Reîncarcă' },
        { role: 'forceReload' as const, label: 'Reîncarcă forțat' },
        ...(isDev || process.env.ELECTRON_DEVTOOLS === '1'
          ? [{ role: 'toggleDevTools' as const, label: 'Instrumente dezvoltator' }]
          : []),
        { type: 'separator' as const },
        { role: 'resetZoom' as const, label: 'Zoom implicit' },
        { role: 'zoomIn' as const, label: 'Mărește' },
        { role: 'zoomOut' as const, label: 'Micșorează' },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const, label: 'Ecran complet' },
      ],
    },
    {
      label: 'Fereastră',
      submenu: [
        { role: 'minimize' as const, label: 'Minimizează' },
        { role: 'zoom' as const, label: 'Zoom' },
        ...(isMac ? [{ type: 'separator' as const }, { role: 'front' as const }] : []),
      ],
    },
    {
      label: 'Ajutor',
      submenu: [
        {
          label: 'Despre automatiX',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'Despre automatiX',
              message: 'automatiX',
              detail: `Versiune ${app.getVersion()}\nAutomatix Software\n\nManagement industrial integrat.`,
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}





ipcMain.handle('window_set_title_bar_theme', () => ({ ok: true }));

ipcMain.handle('window_minimize', () => {
  mainWindow?.minimize();
  return { ok: true };
});

ipcMain.handle('window_toggle_maximize', () => {
  if (!mainWindow) return { ok: false, maximized: false };
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return { ok: true, maximized: mainWindow.isMaximized() };
});

ipcMain.handle('window_close', () => {
  mainWindow?.close();
  return { ok: true };
});

ipcMain.handle('window_is_maximized', () => ({
  maximized: mainWindow?.isMaximized() ?? false,
}));







function showNativeNotification(opts: { title?: string; body?: string; level?: string }): { ok: boolean } {
  try {
    const { Notification } = require('electron') as typeof import('electron');
    if (!Notification || !Notification.isSupported()) return { ok: false };
    const title = String(opts?.title || 'automatiX').slice(0, 120);
    const body = String(opts?.body || '').slice(0, 500);
    const n = new Notification({ title, body, silent: opts?.level === 'info' });
    n.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });
    n.show();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

ipcMain.handle('notify', (_e, args: { title?: string; body?: string; level?: string }) =>
  showNativeNotification(args || {}));





let lastCrashToast = 0;
function notifyServerCrash(reason: unknown): void {
  const now = Date.now();
  if (now - lastCrashToast < 30_000) return;
  lastCrashToast = now;
  const msg = (reason as any)?.message || String(reason);
  showNativeNotification({
    title: 'Eroare critică în server',
    body: `automatiX a întâmpinat o problemă: ${String(msg).slice(0, 160)}`,
    level: 'error',
  });
}
process.on('uncaughtException', (e) => notifyServerCrash(e));
process.on('unhandledRejection', (e) => notifyServerCrash(e));



/**
 * Poll the server's /api/health version; when it changes (a new frontend was
 * deployed), reload the window so desktop clients pick up frontend updates with
 * no app rebuild. Active in thin-client (REMOTE_URL) and connect-to-server modes.
 */
function watchFrontendVersion(win: BrowserWindow, baseUrl: string): void {
  if (!baseUrl) return;
  let known: string | null = null;
  const lib = baseUrl.startsWith('https') ? https : http;
  const check = (): void => {
    if (win.isDestroyed()) return;
    const req = lib.get(`${baseUrl}/api/health`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const v = (JSON.parse(body) as { version?: string }).version;
          if (!v) return;
          if (known && v !== known && !win.isDestroyed()) {
            win.webContents.reload();
          }
          known = v;
        } catch { /* ignore */ }
      });
    });
    req.on('error', () => { /* server momentarily unreachable */ });
    req.setTimeout(5000, () => req.destroy());
  };
  check();
  const timer = setInterval(check, 60_000);
  win.on('closed', () => clearInterval(timer));
}

async function boot(): Promise<void> {
  const bootStart = Date.now();
  splashWindow = createSplash();

  try {
    if (START_SERVER) {
      setSplashStatus('Conectare la baza de date…');
      await startInProcessServer();
      setSplashStatus('Încărcare module…');
    } else if (REMOTE_URL) {
      // Thin client → load the central server's UI directly.
      serverUrl = REMOTE_URL;
      setSplashStatus('Conectare la server…');
      await waitForServer(serverUrl).catch(() => {  });
    } else {

      serverPort = parseInt(process.env.PROMIX_PORT || '3500', 10);
      serverUrl = `http://127.0.0.1:${serverPort}`;
      setSplashStatus('Conectare la server…');
      if (!isDev) await waitForServer(serverUrl).catch(() => {  });
    }

    setSplashStatus('Pregătire interfață…');
    mainWindow = createMainWindow();

    // Auto-reload the UI when the server ships a new frontend version.
    if (!isDev) watchFrontendVersion(mainWindow, serverUrl);

    mainWindow.webContents.once('did-finish-load', async () => {
      setSplashStatus('Gata');
      const elapsed = Date.now() - bootStart;
      if (elapsed < MIN_SPLASH_MS) {
        await new Promise((r) => setTimeout(r, MIN_SPLASH_MS - elapsed));
      }
      mainWindow!.show();
      mainWindow!.focus();
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
    });

    mainWindow.on('closed', () => { mainWindow = null; });
  } catch (err: any) {
    bootLog(`BOOT FAILED: ${err?.stack || err?.message || err}`);
    if (splashWindow && !splashWindow.isDestroyed()) { splashWindow.close(); splashWindow = null; }
    dialog.showErrorBox(
      'Pornire eșuată',
      `automatiX nu a putut porni:\n\n${err?.message || err}\n\nVezi boot.log în ${app.getPath('userData')}.`,
    );
    app.quit();
  }
}



if (gotLock) {
  app.whenReady().then(() => {
    
    
    if (process.platform === 'win32') app.setAppUserModelId('com.promix.automatix');
    buildMenu();
    void boot();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void boot();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}


app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');


void nativeImage;
