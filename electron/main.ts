


















import { app, BrowserWindow, Menu, ipcMain, shell, nativeImage, dialog, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as net from 'net';


const WINDOW_BG = '#1C2228';            
const MIN_SPLASH_MS = 1200;             
const ACCENT = '#2DD4BF';               



const DEFAULT_W = 1600;
const DEFAULT_H = 1000;
const MIN_W = 1200;
const MIN_H = 720;

const isDev = !app.isPackaged && process.env.ELECTRON_RENDERER_URL != null;


const START_SERVER = process.env.ELECTRON_START_SERVER === '1'
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
  .stage {
    position:relative; width:100vw; height:100vh; overflow:hidden;
    border-radius:16px;
    background: radial-gradient(140% 120% at 50% -10%, #232C34 0%, #1A2127 55%, #141A1F 100%);
    border:1px solid rgba(255,255,255,.08);
    box-shadow: 0 24px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.05);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:22px;
  }
  .orb { position:absolute; border-radius:50%; filter:blur(60px); opacity:.5; animation: float 14s ease-in-out infinite; }
  .orb.a { width:300px; height:300px; top:-120px; left:-90px; background:var(--accent); opacity:.32; }
  .orb.b { width:240px; height:240px; bottom:-110px; right:-70px; background:#1B90FF; opacity:.22; animation-delay:-5s; }
  .orb.c { width:180px; height:180px; top:40%; left:55%; background:#A78BFA; opacity:.16; animation-delay:-9s; }
  .grid { position:absolute; inset:0; opacity:.05;
    background-image: linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px);
    background-size: 28px 28px; }
  .brand { position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; gap:10px; }
  .logo {
    width:64px; height:64px; border-radius:18px; display:grid; place-items:center;
    background: linear-gradient(150deg, rgba(45,212,191,.22), rgba(27,144,255,.14));
    border:1px solid rgba(45,212,191,.35);
    box-shadow: 0 0 28px rgba(45,212,191,.30), inset 0 1px 0 rgba(255,255,255,.10);
    font-size:30px; font-weight:700; letter-spacing:-1px; color:#fff;
  }
  .title { font-size:30px; font-weight:700; letter-spacing:-.02em;
    background:linear-gradient(180deg,#fff,#AEBAC4); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .sub { font-size:12px; color:#8B97A2; letter-spacing:.02em; }
  .footer { position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; gap:12px; }
  .spinner { width:26px; height:26px; border-radius:50%;
    border:2.5px solid rgba(255,255,255,.12); border-top-color:var(--accent);
    animation: spin .8s linear infinite; }
  .status { font-size:12px; color:#A7B2BC; min-height:16px; transition:opacity .25s ease; letter-spacing:.01em; }
  .ver { position:absolute; bottom:12px; right:14px; z-index:2; font-size:10px; color:#5C6873; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes float { 0%,100%{transform:translate(0,0)} 50%{transform:translate(18px,-14px)} }
  body { opacity:0; animation: appear .4s ease forwards; }
  @keyframes appear { to { opacity:1; } }
  @media (prefers-reduced-motion: reduce) {
    .orb,.spinner,body { animation:none !important; }
    body { opacity:1; }
    .spinner { border-top-color:var(--accent); }
  }
</style></head>
<body>
  <div class="stage">
    <div class="orb a"></div><div class="orb b"></div><div class="orb c"></div>
    <div class="grid"></div>
    <div class="brand">
      <div class="logo">A</div>
      <div class="title">Automatix</div>
      <div class="sub">Management industrial integrat</div>
    </div>
    <div class="footer">
      <div class="spinner"></div>
      <div class="status" id="status">Pornesc aplicația…</div>
    </div>
    <div class="ver">Promix Technologies</div>
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
    width: 480,
    height: 340,
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
  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: MIN_W,
    minHeight: MIN_H,
    show: false,
    backgroundColor: WINDOW_BG,
    autoHideMenuBar: false,
    title: 'automatiX',
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
              detail: `Versiune ${app.getVersion()}\nPromix Technologies\n\nManagement industrial integrat.`,
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



async function boot(): Promise<void> {
  const bootStart = Date.now();
  splashWindow = createSplash();

  try {
    if (START_SERVER) {
      setSplashStatus('Conectare la baza de date…');
      await startInProcessServer();
      setSplashStatus('Încărcare module…');
    } else {
      
      serverPort = parseInt(process.env.PROMIX_PORT || '3500', 10);
      serverUrl = `http://127.0.0.1:${serverPort}`;
      setSplashStatus('Conectare la server…');
      if (!isDev) await waitForServer(serverUrl).catch(() => {  });
    }

    setSplashStatus('Pregătire interfață…');
    mainWindow = createMainWindow();

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
