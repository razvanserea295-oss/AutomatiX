






















import './loadProjectEnv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import { initDatabaseForServer, getDb, saveDatabase, flushDatabase, isFreshDatabase, getDbPath, getLastSaveAt } from './db';
import { acquireInstanceLock, releaseInstanceLock } from './instanceLock';
import { ensureBlankTenant } from './tenantInit';
import { DeplasariService } from '../electron/services/deplasariService';
import { runMigrations } from '../electron/db/migrations';
import { neutralizeFactoryCredentials } from './factoryCreds';
import { seedDemoData } from './demoSeed';
import { registerCommandHandlers, handleCommand, isMutatingCommand } from './commandRouter';
import { startScheduler } from '../electron/services/escalationCron';
import { DemoSeedService } from '../electron/services/demoSeedService';
import { MOBILE_HTML } from './mobileWeb';
import { mapSqliteConstraintError } from './sqliteErrors';
import { subscribe as sseSubscribe } from './eventHub';
import { AuthService } from '../electron/services/authService';
import { getDb as getServerDb } from './db';
import { PortalService } from '../electron/services/portalService';
import { RfqService } from '../electron/services/rfqService';
import { logServerEvent, getServerLogPath, logger } from './eventLog';
import { initMonitoring, captureException } from './monitoring';

// Error monitoring (no-op unless SENTRY_DSN is set).
initMonitoring();
import { registerReleaseUpload } from './releaseUpload';
import { registerPartsTreeDownload } from './partsTreeDownload';
import { registerPartsTreeUpload } from './partsTreeUpload';
import { registerBriefingUpload } from './briefingUpload';
import { registerAvatarUpload } from './avatarUpload';
import { registerDownloads } from './downloads';
import { registerSourceArchive } from './sourceArchive';
import { registerSourceUpdate } from './sourceUpdate';
import { startBackupScheduler } from './backup';
import { getAutoBackupDirectory } from './autoBackup';
import { registerSharedStorageApi } from './sharedStorageApi';
import { registerLicense, instanceLicensed, ACTIVATION_ALLOWLIST } from './license';
import { registerLeads } from './leads';
import { registerRemoteSupportRoutes } from './remoteSupport';
import { attachRustDeskWsProxy } from './rustdeskWsProxy';

const PORT = parseInt(process.env.PROMIX_PORT || '3500', 10);
const UPDATES_DIR = process.env.PROMIX_UPDATES_DIR || path.join(process.cwd(), 'updates');







const BODY_LIMIT = process.env.PROMIX_BODY_LIMIT || '50mb';
const TRUST_PROXY = process.env.PROMIX_TRUST_PROXY === '1';
const RATE_LIMIT_OFF = process.env.PROMIX_RATE_LIMIT_OFF === '1';

// Per-tenant license gate. OFF by default so deploying the code never bricks a
// running instance; flip PROMIX_LICENSE_GATE=1 in the launcher once the firm's
// license is imported. Demo instances are always exempt (license-free showcase).
const LICENSE_GATE_ON = process.env.PROMIX_LICENSE_GATE === '1' && process.env.PROMIX_DEMO !== '1';



const ALLOWED_ORIGINS = (process.env.PROMIX_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);







const BIND_HOST = process.env.PROMIX_BIND_HOST
  || ((TRUST_PROXY || process.env.PROMIX_LAN === '1') ? '0.0.0.0' : '127.0.0.1');

const app = express();




if (TRUST_PROXY) app.set('trust proxy', 1);









// SAP Fiori (classic SAPUI5) CSP allowance.
// The Fiori UI mode can mount classic SAPUI5 controls (Smart Table, VizFrame,
// Gantt, Network Graph, Process Flow, PDF Viewer) loaded from SAP's public CDN.
// SAPUI5 needs that origin reachable for scripts/styles/fonts/XHR, and sap.viz
// (charts) compiles code at runtime → 'unsafe-eval'. This widens the otherwise
// strict CSP, so it is gated behind PROMIX_FIORI_CLASSIC (ON unless set to '0')
// and logged loudly at boot. Set PROMIX_FIORI_CLASSIC=0 to keep the strict
// baseline (which disables the classic-control parts of Fiori mode).
const FIORI_CLASSIC = process.env.PROMIX_FIORI_CLASSIC !== '0';
const SAP_UI5_CDN = 'https://ui5.sap.com';
// @ui5/webcomponents pulls its theming base content (the "72" font family, theme
// params) from the jsDelivr-hosted @sap-theming package — even in the normal
// SaaS shell (the components are used app-wide), not just Fiori mode. Allow that
// CDN so the fonts/assets load instead of being CSP-blocked (cosmetic but noisy).
const SAP_THEMING_CDN = 'https://cdn.jsdelivr.net';
const cspScriptExtra  = FIORI_CLASSIC ? [SAP_UI5_CDN, "'unsafe-eval'"] : [];
const cspStyleExtra   = [SAP_THEMING_CDN, ...(FIORI_CLASSIC ? [SAP_UI5_CDN] : [])];
const cspFontExtra    = [SAP_THEMING_CDN, ...(FIORI_CLASSIC ? [SAP_UI5_CDN] : [])];
const cspImgExtra     = [SAP_THEMING_CDN, ...(FIORI_CLASSIC ? [SAP_UI5_CDN] : [])];
const cspConnectExtra = [SAP_THEMING_CDN, ...(FIORI_CLASSIC ? [SAP_UI5_CDN] : [])];
if (FIORI_CLASSIC) {
  logger.warn(`[security] PROMIX_FIORI_CLASSIC on — CSP widened for SAP UI5 CDN (${SAP_UI5_CDN} on script/style/font/img/connect + script 'unsafe-eval' for sap.viz charts). Set PROMIX_FIORI_CLASSIC=0 to disable classic Fiori controls and restore the strict CSP.`);
}

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      // PDF Viewer (sap.m.PDFViewer) renders the document in a blob: iframe.
      frameSrc: ["'self'", 'blob:'],
      scriptSrc: ["'self'", ...cspScriptExtra],



      styleSrc: ["'self'", "'unsafe-inline'", ...cspStyleExtra],
      imgSrc: ["'self'", 'data:', 'blob:', ...cspImgExtra],
      fontSrc: ["'self'", 'data:', ...cspFontExtra],
      connectSrc: ["'self'", ...cspConnectExtra],
      workerSrc: ["'self'", 'blob:'],


      upgradeInsecureRequests: null,
    },
  },
  crossOriginResourcePolicy: false,
  hsts: TRUST_PROXY ? { maxAge: 15_552_000, includeSubDomains: true } : false,
}));









const CORS_ALLOW_ALL = ALLOWED_ORIGINS.includes('*');



const DOMAIN_ORIGIN = process.env.PROMIX_DOMAIN
  ? `https://${process.env.PROMIX_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
  : '';
const EFFECTIVE_ORIGINS = new Set(ALLOWED_ORIGINS.filter(o => o !== '*'));
if (DOMAIN_ORIGIN) EFFECTIVE_ORIGINS.add(DOMAIN_ORIGIN);




EFFECTIVE_ORIGINS.add('http://tauri.localhost');
EFFECTIVE_ORIGINS.add('https://tauri.localhost');
EFFECTIVE_ORIGINS.add('tauri://localhost');
function isLoopbackOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch { return false; }
}
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                  
    if (CORS_ALLOW_ALL) return cb(null, true);
    if (EFFECTIVE_ORIGINS.has(origin)) return cb(null, true);
    if (isLoopbackOrigin(origin)) return cb(null, true); 
    
    
    
    
    
    
    return cb(null, false);
  },
  credentials: true,
}));

// ── Multi-tenant path-prefix reverse proxy ───────────────────────────────────
// /t/<slug>/* → that firm's own backend (its port in tenants/registry.json), so
// many firms share the single automatix.online origin with NO subdomain
// (same-origin → CSP/CORS unchanged). Registered BEFORE express.json so request
// bodies stream through unparsed; responses (incl. SSE /api/events) are piped
// without buffering. The HOST tenant (this server's own port) is served directly
// by stripping the prefix — no self-proxy hop. The bare origin = host tenant.
const OWN_PORT = Number(process.env.PROMIX_PORT) || 3500;
const TENANT_PORTS = new Map<string, number>();
try {
  const reg = JSON.parse(require('fs').readFileSync(path.join(process.cwd(), 'tenants', 'registry.json'), 'utf8'));
  for (const t of (reg.tenants || [])) TENANT_PORTS.set(t.slug, t.port);
} catch { /* no registry → no tenant proxying */ }

app.use((req, res, next) => {
  const m = req.url.match(/^\/t\/([^/?#]+)(.*)$/);
  if (!m) return next();
  const port = TENANT_PORTS.get(m[1]);
  if (!port) { res.status(404).json({ code: 404, message: 'Firmă necunoscută' }); return; }
  let fwd = m[2] || '/';
  if (fwd === '' || fwd[0] === '?') fwd = '/' + fwd;
  if (port === OWN_PORT) { req.url = fwd; return next(); } // host tenant — serve directly
  const proxyReq = http.request(
    { hostname: '127.0.0.1', port, path: fwd, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${port}` } },
    (proxyRes) => { res.writeHead(proxyRes.statusCode || 502, proxyRes.headers as Record<string, string | string[]>); proxyRes.pipe(res); },
  );
  proxyReq.on('error', () => { if (!res.headersSent) res.status(502).json({ code: 502, message: 'Firma este indisponibilă' }); });
  req.pipe(proxyReq);
});

app.use(express.json({ limit: BODY_LIMIT }));



// /api/cmd/:command endpoint), so we apply a generous global limit on the

const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 600,                 
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 5 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // Loopback is trusted host context (the tenant-login broker fans a single
  // external attempt out to each tenant's /api/cmd/login over 127.0.0.1, and
  // local admin tools like restart-no-uac.ps1 log in over loopback). Skipping
  // it keeps those internal hops from filling the real client's rate bucket.
  // The external attempt is still limited by req.ip via the broker route below.
  skip: (req) => { const ip = req.ip || ''; return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'; },
  message: { code: 429, message: 'Prea multe încercări. Așteaptă câteva minute.' },
});



// triggering the global limit. (Audit finding: HIGH — no rate limit on

const tokenLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,                  
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: 'Prea multe încercări. Așteaptă un minut.' },
});



const APP_VERSION = (() => {
  try {
    return require('../package.json').version as string;
  } catch {
    return '0.0.0';
  }
})();

// Build fingerprint — a short hash of the served frontend's index.html (which
// references Vite's content-hashed chunks, so it changes whenever ANY frontend
// asset changes). Desktop thin-clients poll this and reload when it changes, so
// a deploy reaches them instantly even without a version bump. Memoized; the
// server restarts on every source-update, so it's recomputed per deploy.
let _buildId: string | null = null;
function buildId(): string {
  if (_buildId) return _buildId;
  const candidates = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(__dirname, '../../dist/index.html'),
    path.join(__dirname, '../../../dist/index.html'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        _buildId = crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 12);
        return _buildId;
      }
    } catch { /* try next */ }
  }
  _buildId = APP_VERSION;
  return _buildId;
}

app.get('/api/health', (_req, res) => {
  // Actually probe the DB — a static "ok" hid a locked/broken DB from monitoring.
  let dbOk = false;
  try {
    const r = getDb().exec('SELECT 1');
    dbOk = Array.isArray(r) && r.length > 0;
  } catch { dbOk = false; }

  const lastSaveAt = getLastSaveAt();
  // Age (ms) of the last successful snapshot write. Steadily growing past the
  // 30s save interval signals saves are failing even while requests still serve.
  const lastSaveAgeMs = lastSaveAt ? Date.now() - lastSaveAt : null;

  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk ? 'ok' : 'error',
    lastSaveAgeMs,
    version: APP_VERSION,
    buildId: buildId(),
    mode: 'server',
    demo: process.env.PROMIX_DEMO === '1',
    businessType: process.env.PROMIX_BUSINESS_TYPE || 'manufacturing',
    tenantName: process.env.PROMIX_TENANT_NAME || '',
  });
});

// Public firm list for the pre-login chooser. Exposes ONLY slug + name — never
// the internal port. Reachable on the bare origin before a firm is chosen.
app.get('/api/tenants', (_req, res) => {
  try {
    const reg = JSON.parse(require('fs').readFileSync(path.join(process.cwd(), 'tenants', 'registry.json'), 'utf8'));
    res.json((reg.tenants || []).map((t: { slug: string; name: string }) => ({ slug: t.slug, name: t.name })));
  } catch { res.json([]); }
});




app.get('/api/events', (req, res) => {
  const token = (req.query.token as string) || '';
  if (!token) { res.status(401).json({ message: 'token required' }); return; }
  let user;
  try { user = AuthService.validateSession(getServerDb(), token); }
  catch { res.status(401).json({ message: 'invalid token' }); return; }
  if (!user) { res.status(401).json({ message: 'invalid token' }); return; }

  const teardown = sseSubscribe(user.id, res);

  
  
  
  
  
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); }
    catch { clearInterval(heartbeat); teardown(); }
  }, 25_000);
  heartbeat.unref?.();

  req.on('close', () => { clearInterval(heartbeat); teardown(); });
});













const AI_PORT = parseInt(process.env.PROMIX_AI_PORT || '8100', 10);


app.get('/ai/health', (_req, res) => {
  const proxy = http.request({
    hostname: '127.0.0.1', port: AI_PORT, path: '/health', method: 'GET',
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxy.on('error', () => {
    if (!res.headersSent) res.status(503).json({ message: 'AI service unavailable' });
  });
  proxy.end();
});










let aiActiveRequests = 0;

app.get('/ai/queue', (_req, res) => {
  
  
  res.json({ active: aiActiveRequests });
});

app.use('/ai', (req, res) => {
  
  
  
  const headerToken = req.headers.authorization?.replace('Bearer ', '') || '';
  const bodyToken = (req.body && typeof req.body === 'object' && req.body.user_token) || '';
  const promixToken = headerToken || bodyToken;
  if (!promixToken) {
    res.status(401).json({ message: 'PROMIX authentication required for AI access' });
    return;
  }
  try {
    const user = AuthService.validateSession(getServerDb(), promixToken);
    if (!user) throw new Error('invalid');
  } catch {
    res.status(401).json({ message: 'PROMIX authentication invalid or expired' });
    return;
  }

  
  
  const isChatRequest = req.method === 'POST' && (req.url || '').includes('chat');
  let countedHere = false;
  let queuePositionAtStart = 0;
  if (isChatRequest) {
    queuePositionAtStart = aiActiveRequests; 
    aiActiveRequests += 1;
    countedHere = true;
    
    
    const release = () => {
      if (countedHere) {
        countedHere = false;
        aiActiveRequests = Math.max(0, aiActiveRequests - 1);
      }
    };
    res.on('close', release);
    res.on('finish', release);
  }

  
  const isWriteMethod = req.method !== 'GET' && req.method !== 'HEAD';
  const bodyStr = isWriteMethod ? JSON.stringify(req.body || {}) : '';
  const headers = { ...req.headers, host: `127.0.0.1:${AI_PORT}` };
  if (isWriteMethod) {
    headers['content-length'] = Buffer.byteLength(bodyStr).toString();
    headers['content-type'] = 'application/json';
  }

  const targetPath = (req.url === '/' ? '' : req.url) || '';
  const proxy = http.request({
    hostname: '127.0.0.1',
    port: AI_PORT,
    path: targetPath,
    method: req.method,
    headers,
  }, (proxyRes) => {
    
    
    
    
    
    const chunks: Buffer[] = [];
    proxyRes.on('data', (c: Buffer) => chunks.push(c));
    proxyRes.on('end', () => {
      let bodyOut = Buffer.concat(chunks).toString('utf-8');
      
      bodyOut = bodyOut.replace(/\$argon2(?:id|i|d)\$[A-Za-z0-9+/=,$]+/g, '[REDACTED-HASH]');
      bodyOut = bodyOut.replace(/\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}/g, '[REDACTED-HASH]');
      
      bodyOut = bodyOut.replace(/("password_hash"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"');
      bodyOut = bodyOut.replace(/("token_hash"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"');
      bodyOut = bodyOut.replace(/("(?:smtp_password|api_token|service_token|service_password)"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"');
      
      const headers = { ...proxyRes.headers };
      delete headers['content-length'];
      
      
      
      headers['x-ai-queue-position'] = String(queuePositionAtStart);
      headers['x-ai-queue-active'] = String(aiActiveRequests);
      res.writeHead(proxyRes.statusCode || 502, headers);
      res.end(bodyOut);
    });
    proxyRes.on('error', () => {
      if (!res.headersSent) res.status(502).json({ message: 'AI proxy error' });
    });
  });

  proxy.on('error', () => {
    if (!res.headersSent) res.status(503).json({ message: 'AI service unavailable' });
  });

  if (isWriteMethod) proxy.write(bodyStr);
  proxy.end();
});



const DIST_DIR = (() => {
  const candidates = [
    path.join(process.cwd(), 'dist'),
    path.join(__dirname, '../../dist'),
    path.join(__dirname, '../../../dist'),
  ];
  const fs = require('fs') as typeof import('fs');
  return candidates.find(p => fs.existsSync(path.join(p, 'index.html'))) || candidates[0];
})();

// ── Host-based shell selection (marketing landing vs the app SPA) ────────────
// automatix.online / www  → dist/landing.html (the presentation site);
// app.automatix.online and everything else (localhost, tauri, LAN) → the SPA.
// API, /t, /ai, /downloads and /m are host-agnostic (matched before the SPA
// fallback), so this only chooses which HTML document to hand back.
const LANDING_HOSTS = new Set(
  (process.env.PROMIX_LANDING_HOSTS || 'automatix.online,www.automatix.online')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
);
function axHostOf(req: express.Request): string {
  const xfh = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const h = xfh || req.headers.host || req.hostname || '';
  return h.toLowerCase().split(':')[0];
}
function wantsLanding(req: express.Request): boolean {
  return LANDING_HOSTS.size > 0 && LANDING_HOSTS.has(axHostOf(req));
}
function sendShell(req: express.Request, res: express.Response): void {
  const fsx = require('fs') as typeof import('fs');
  res.set('Cache-Control', 'no-store');
  if (wantsLanding(req)) {
    const landing = path.join(DIST_DIR, 'landing.html');
    if (fsx.existsSync(landing)) { res.sendFile(landing); return; }
  }
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fsx.existsSync(indexPath)) { res.sendFile(indexPath); return; }
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(MOBILE_HTML);
}

// /downloads/* is license-gated (see registerDownloads). Keep express.static
// from serving the installer straight out of dist/downloads (Vite copies
// public/ → dist/), which would bypass the license check entirely.
const IMMUTABLE_DIST_ASSET_RE = /^assets\/.+-[A-Za-z0-9_-]{8,}\.(?:js|mjs|cjs|css|woff2?|ttf|otf|svg|png|jpe?g|webp|gif|ico)$/i;
const staticMw = express.static(DIST_DIR, {
  index: false,
  setHeaders: (res, filePath) => {
    const relPath = path.relative(DIST_DIR, filePath).replace(/\\/g, '/');
    if (relPath.endsWith('.html')) {
      // HTML shell must always revalidate so it points at the current chunk set.
      res.setHeader('Cache-Control', 'no-store');
      return;
    }
    if (IMMUTABLE_DIST_ASSET_RE.test(relPath)) {
      // Fingerprinted files are content-addressed and safe to cache forever.
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return;
    }
    // Non-fingerprinted static files (manifest, icons, etc.) stay short-lived.
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
  },
});
app.use((req, res, next) => {
  if (req.path.startsWith('/downloads/')) return next();
  return staticMw(req, res, next);
});


app.get(['/m', '/m/'], (_req, res) => {
  // The mobile page is a self-contained app with one inline <script>. The global
  // CSP has no 'unsafe-inline' for scripts, which silently blanked the page — so
  // serve /m with a per-request nonce that whitelists just this trusted script.
  const nonce = globalThis.crypto.randomUUID();
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      `script-src 'self' 'nonce-${nonce}'`,
    ].join('; '),
  );
  res.send(MOBILE_HTML.replace('<script>', `<script nonce="${nonce}">`));
});



app.get('/', (req, res) => { sendShell(req, res); });

// ── Manager portal (standalone admin console) ────────────────────────────────
// /manager is its own Vite entry (manager.html), host-agnostic: the same console
// is reachable on app.* or the apex. It logs in via the broker (/api/auth/login)
// and drives the existing per-tenant commands (users, licenses, leads). Served
// before the SPA fallback so it isn't swallowed by index.html / landing.html.
function sendManagerShell(_req: express.Request, res: express.Response): void {
  const fsx = require('fs') as typeof import('fs');
  res.set('Cache-Control', 'no-store');
  const shell = path.join(DIST_DIR, 'manager.html');
  if (fsx.existsSync(shell)) { res.sendFile(shell); return; }
  res.status(404).send('Manager portal build missing');
}
app.get(['/manager', '/manager/'], sendManagerShell);
app.get('/manager/*path', sendManagerShell);







app.get('/api/release-notes/:version', (req, res) => {
  const version = (req.params.version || '').trim();
  if (!/^[0-9A-Za-z._-]+$/.test(version)) { res.status(400).json({ message: 'invalid version' }); return; }

  const candidates = [
    path.join(process.cwd(), 'CHANGELOG.md'),
    path.join(__dirname, '../../CHANGELOG.md'),
    path.join(__dirname, '../../../CHANGELOG.md'),
  ];
  let raw: string | null = null;
  for (const p of candidates) {
    try { raw = require('fs').readFileSync(p, 'utf-8'); break; } catch {  }
  }
  if (!raw) { res.status(404).json({ message: 'changelog missing' }); return; }

  
  
  const lines = raw.split('\n');
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headRe = new RegExp(`^##\\s*\\[?${escaped}\\]?(?:\\s|$)`);
  const start = lines.findIndex(l => headRe.test(l));
  if (start === -1) { res.status(404).json({ message: 'no notes for this version', version }); return; }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) { end = i; break; }
  }
  
  const body = lines.slice(start + 1, end).join('\n').trim();

  res.set('Cache-Control', 'public, max-age=300');
  res.json({ version, markdown: body });
});


app.get('/api/rfq/:token', tokenLimiter, (req, res) => {
  try {
    const view = RfqService.getByPublicToken(getServerDb(), String(req.params.token));
    saveDatabase();
    res.set('Cache-Control', 'no-store');
    res.json(view);
  } catch (err: any) {
    const code = err?.code && err.code >= 100 && err.code < 600 ? err.code : 500;
    res.status(code).json({ message: err?.message || 'rfq error' });
  }
});

app.post('/api/rfq/:token/submit', tokenLimiter, (req, res) => {
  try {
    const result = RfqService.submitPublicResponse(getServerDb(), String(req.params.token), req.body);
    saveDatabase();
    res.json(result);
  } catch (err: any) {
    const code = err?.code && err.code >= 100 && err.code < 600 ? err.code : 500;
    res.status(code).json({ message: err?.message || 'rfq submit error' });
  }
});




app.get('/api/portal/:token', tokenLimiter, (req, res) => {
  try {
    const view = PortalService.viewByToken(getServerDb(), String(req.params.token));
    saveDatabase();
    res.set('Cache-Control', 'no-store');
    res.json(view);
  } catch (err: any) {
    const code = err?.code && err.code >= 100 && err.code < 600 ? err.code : 500;
    res.status(code).json({ message: err?.message || 'portal error' });
  }
});



app.use('/api/update', express.static(UPDATES_DIR, { fallthrough: false }));

// Auto-backup download endpoint - serves files directly without loading into memory
const AUTO_BACKUP_DIR = getAutoBackupDirectory();
app.get('/api/auto-backup/:filename', (req, res) => {
  // Admin-only: backup zips contain the (encrypted) database. Accept the session
  // token via Bearer header or ?token= query (so a plain <a download> link works).
  const token =
    req.headers.authorization?.replace(/^Bearer\s+/i, '') || (req.query.token as string) || '';
  if (!token) { res.status(401).json({ message: 'token required' }); return; }
  try {
    const user = AuthService.validateSession(getServerDb(), token) as { role_name?: string } | null;
    if (!user || String(user.role_name || '').toLowerCase() !== 'admin') {
      res.status(403).json({ message: 'necesită drepturi de administrator' });
      return;
    }
  } catch {
    res.status(401).json({ message: 'invalid token' });
    return;
  }

  const filename = path.basename(req.params.filename);
  const filepath = path.join(AUTO_BACKUP_DIR, filename);
  if (!filename.endsWith('.zip') || !fs.existsSync(filepath)) {
    res.status(404).json({ message: 'Backup not found' });
    return;
  }
  res.set('Content-Type', 'application/zip');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  fs.createReadStream(filepath).pipe(res);
});











registerReleaseUpload(app, UPDATES_DIR);



registerPartsTreeDownload(app);

// Admin-only temporary source-code archive download (Instrumente → Arhivă).
registerSourceArchive(app);
// Admin-only live source update via upload + restart.
registerSourceUpdate(app);


// global express.json() body parser would matter (json parser skips



registerPartsTreeUpload(app);




registerBriefingUpload(app);


registerAvatarUpload(app);



registerDownloads(app);

registerRemoteSupportRoutes(app, tokenLimiter);

registerLicense(app);

registerLeads(app);

registerSharedStorageApi(app);

if (!RATE_LIMIT_OFF) app.use('/api/cmd', globalLimiter);

// ── User-based tenant routing: login broker ──────────────────────────────────
// The bare origin (no /t/<slug>) is the host tenant. Instead of asking the user
// to pick a firm first, this endpoint takes username+password and finds WHICH
// firm the user belongs to by attempting the login against every tenant backend
// (the user lives in exactly one tenant DB). On the first success it returns
// that firm's slug; the client persists it so all later calls route via
// /t/<slug>. Requires usernames to be unique across firms (first match wins).
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const body = req.body || {};
  const username = body.username ?? body.request?.username;
  const password = body.password ?? body.request?.password;
  if (!username || !password) {
    res.status(400).json({ code: 400, message: 'Username și parola sunt obligatorii' });
    return;
  }
  // Tenants to try, in registry order. No registry (single-tenant/dev) → just
  // this server, with an empty slug (client keeps using the bare origin).
  const targets: Array<{ slug: string; port: number }> = TENANT_PORTS.size
    ? [...TENANT_PORTS.entries()].map(([slug, port]) => ({ slug, port }))
    : [{ slug: '', port: OWN_PORT }];

  for (const { slug, port } of targets) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/cmd/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // clientIp flows into the tenant's audit log / lockout accounting.
        body: JSON.stringify({ username, password, clientIp: req.ip }),
      });
      if (r.status === 200) {
        // 200 = this tenant owns the user. Body is either {token,user} or the
        // 2FA challenge {requires_2fa,challenge}; the session/challenge already
        // lives in THIS tenant's instance, reachable next via /t/<slug>.
        const data = await r.json();
        // When the gate is armed, tell the client up front whether this firm's
        // instance still needs activation so it can show the activation screen
        // instead of the dashboard. Login itself still succeeds — the
        // per-command gate keeps everything else blocked until an admin imports
        // a license. Skipped for the 2FA-challenge response (no token yet).
        let requiresLicense = false;
        if (LICENSE_GATE_ON && data && data.token) {
          try {
            const lr = await fetch(`http://127.0.0.1:${port}/api/license/tenant-state`);
            if (lr.ok) { const ls = await lr.json() as { licensed?: boolean }; requiresLicense = !ls.licensed; }
          } catch { /* unreachable → per-command gate still enforces */ }
        }
        res.json({ tenant_slug: slug, requires_license: requiresLicense, ...data });
        return;
      }
      // 401 (wrong tenant / bad creds) or other → try the next firm.
    } catch { /* tenant instance unreachable → skip it */ }
  }
  // Generic message — never reveal which/whether a firm has the username.
  res.status(401).json({ code: 401, message: 'Username sau parolă incorectă' });
});


// Commands allowed even when the account is flagged must_change_password — the
// minimal surface needed to authenticate and get OUT of that state. Everything
// else is 403'd server-side so the force-password-change step can't be bypassed
// (the flag was previously enforced ONLY in the React client, so a default
// admin/1234 could drive the entire API once an instance was reachable).
const MUST_CHANGE_ALLOWLIST = new Set<string>([
  'login', 'login_verify_2fa', 'logout', 'validate_session', 'change_password',
]);

app.post('/api/cmd/:command',



  (req, res, next) => {
    if (RATE_LIMIT_OFF) return next();
    const cmd = req.params.command;
    
    
    // matched and login fell through to the generous global limiter. We keep
    
    
    
    if (cmd === 'login' || cmd === 'login_user' || cmd === 'login_verify_2fa' || cmd === 'change_password') {
      return authLimiter(req, res, next);
    }
    return next();
  },
  async (req, res) => {
    const { command } = req.params;
    const headerToken = req.headers.authorization?.replace('Bearer ', '') || '';
    const body = req.body || {};

    
    
    
    const token = headerToken || body.token || '';
    const args = { ...body, token, client_ip: req.ip };

    // ── Per-tenant license gate ──────────────────────────────────────────────
    // Until this instance has a valid, non-revoked license, only the activation
    // surface (login + import_license + a few reads) runs; everything else gets
    // 402 so the client can route to the activation screen. Each firm is its own
    // process+DB, so instanceLicensed() is per-tenant for free. Toggled by
    // PROMIX_LICENSE_GATE (demo exempt).
    if (LICENSE_GATE_ON && !ACTIVATION_ALLOWLIST.has(command) && !instanceLicensed()) {
      res.status(402).json({ code: 402, message: 'Licență necesară pentru această firmă.', requires_license: true });
      return;
    }

    // ── Session-derived gates: must_change_password + viewer read-only ────────
    // One session lookup drives both. must_change_password is now enforced HERE
    // (server-side), not only in the React shell, so a freshly seeded/default
    // admin cannot run ANY command until the password is rotated. The flag is
    // re-queried from the DB each request (never trust the login snapshot). An
    // invalid/expired token falls through to handleCommand, which performs its
    // own auth and returns the proper 401.
    if (token && !MUST_CHANGE_ALLOWLIST.has(command)) {
      let sessionUser: { role_name?: string; must_change_password?: boolean } | null = null;
      try { sessionUser = AuthService.validateSession(getServerDb(), token); } catch { sessionUser = null; }
      if (sessionUser) {
        if (sessionUser.must_change_password) {
          res.status(403).json({ code: 403, message: 'Schimbă-ți parola înainte de a continua.', must_change_password: true });
          return;
        }
        if (isMutatingCommand(command) && String(sessionUser.role_name || '').toLowerCase() === 'viewer') {
          res.status(403).json({ code: 403, message: 'Rol „Vizitator" — doar vizualizare. Nu poți modifica date.' });
          return;
        }
      }
    }

    try {
      const result = await handleCommand(command, args);
      res.json(result ?? null);
    } catch (err: any) {
      const hasCode = err && Number.isInteger(err.code) && err.code >= 100 && err.code < 600;
      if (hasCode) {
        
        logger.error(`[server] ${command} failed (${err.code}): ${err.message}`);
        res.status(err.code).json({ code: err.code, message: err.message });
      } else {
        // Friendly mapping for raw sql.js constraint violations (UNIQUE / FK /
        // NOT NULL / CHECK) so the user sees an actionable message instead of a
        // generic 500. Anything else stays a safe generic 400/500 (no SQL leak).
        const dbErr = mapSqliteConstraintError(err);
        if (dbErr) {
          logger.error(`[server] ${command} rejected (${dbErr.code} db-constraint):`, err instanceof Error ? err.message : err);
          res.status(dbErr.code).json({ code: dbErr.code, message: dbErr.message });
        } else {
          const isInput = typeof err === 'string' || err instanceof TypeError || err instanceof RangeError;
          const code = isInput ? 400 : 500;
          logger.error(`[server] ${command} ${isInput ? 'rejected (400 bad input)' : 'crashed (500)'}:`, err);
          res.status(code).json({
            code,
            message: isInput ? 'Cerere invalidă: parametri lipsă sau incorecți.' : 'Eroare internă.',
          });
        }
      }
    }
  },
);






app.get(/^(?!\/api).*/, (req, res) => { sendShell(req, res); });






app.use((err: any, _req: any, res: any, _next: any) => {
  const code = err?.code && Number.isInteger(err.code) && err.code >= 100 && err.code < 600
    ? err.code : 500;
  
  logger.error(`[server] unhandled error (${code}):`, err?.message || err);
  if (code >= 500) captureException(err, { source: 'express-error-handler', code });
  if (res.headersSent) return;
  res.status(code).json({
    code,
    message: code === 500 ? 'Internal server error' : (err?.message || 'Error'),
  });
});


async function main() {
  // Single-instance guard FIRST — never let two servers share one promix.db
  // (full-snapshot persistence means the second would silently clobber the first).
  try {
    await acquireInstanceLock(getDbPath());
  } catch (e) {
    console.error('[server]', e instanceof Error ? e.message : e);
    logServerEvent('FATAL', 'refused to start — another instance holds the DB lock', e);
    process.exit(1);
  }

  console.log('[server] Initializing database...');
  const db = await initDatabaseForServer();
  runMigrations(db);
  // Persist the migrated schema synchronously NOW. Otherwise the first durable
  // save is the debounced one below, and a crash in that window would re-run the
  // (not always idempotent) migrations on next boot.
  try { flushDatabase(); } catch (e) { console.error('[server] flush after migrations failed:', e); }

  // Security: invalidate the seeded factory passwords (admin/1234 + the shared
  // demo "Promix2024!") so a released instance is never reachable with a known
  // default. Idempotent; skipped for demo / PROMIX_ALLOW_DEFAULT_CREDS=1.
  try { await neutralizeFactoryCredentials(db, flushDatabase); }
  catch (e) { console.error('[server] factory-credential neutralization failed:', e); }

  
  
  
  
  
  try {
    db.run(
      'INSERT OR IGNORE INTO roles (name, description, permissions) VALUES (?, ?, ?)',
      ['viewer', 'Vizitator — vede toate paginile operaționale (doar vizualizare), fără modificări și fără zona Sistem.', '["view_all"]'],
    );
    const vid = db.exec("SELECT id FROM roles WHERE name = 'viewer'")[0]?.values[0]?.[0];
    console.log('[roles] viewer (Vizitator) role ensured — id:', vid);
    saveDatabase();
  } catch (e) {
    console.error('[roles] ensure viewer role FAILED:', e instanceof Error ? e.message : e);
  }

  
  
  
  
  
  if (process.env.PROMIX_TENANT === '1' && isFreshDatabase()) {
    try {
      ensureBlankTenant(db);
      saveDatabase();
    } catch (e) {
      console.error('[tenant] blank init failed:', e instanceof Error ? e.message : e);
    }
  }

  
  
  
  
  if (process.env.PROMIX_DEMO === '1') {
    try {
      await seedDemoData(db);
      saveDatabase();
    } catch (e) {
      console.error('[demo] seed failed:', e instanceof Error ? e.message : e);
    }
  }

  
  
  
  try {
    const bf = DeplasariService.backfillUnpostedExpenses(db);
    if (bf.posted > 0) {
      console.log(`[deplasari] backfilled ${bf.posted} finalized trip(s) → ${bf.lines} expense line(s)`);
      saveDatabase();
    }
  } catch (e) {
    console.error('[deplasari] backfill failed:', e instanceof Error ? e.message : e);
  }

  console.log('[server] Registering command handlers...');
  registerCommandHandlers();

  console.log('[server] Starting scheduler (handoff escalation + daily anomaly detection)...');
  startScheduler(db, () => saveDatabase());

  
  
  
  
  
  if (process.env.AUTOMATIX_SEED_DEMO_STEP6 === '1') {
    try {
      const adminStmt = db.prepare(`
        SELECT u.id, u.username, u.email, u.full_name, u.role_id, r.name AS role_name,
               u.active, u.custom_pages
          FROM users u JOIN roles r ON r.id = u.role_id
         WHERE u.active = 1 AND LOWER(r.name) = 'admin'
         ORDER BY u.id ASC LIMIT 1`);
      if (adminStmt.step()) {
        const r = adminStmt.getAsObject() as any;
        const adminUser = {
          id: r.id, username: r.username, email: r.email, password_hash: null,
          full_name: r.full_name, role_id: r.role_id, role_name: r.role_name,
          role_description: '', active: !!r.active, last_login: null,
          custom_pages: r.custom_pages ?? null, must_change_password: false,
          created_at: '', updated_at: '',
        };
        adminStmt.free();
        const result = await DemoSeedService.seedStep6Demo(db, adminUser as any);
        console.log('[seed-demo-step6] inserted', result.inserted, 'rows:', JSON.stringify(result.per_table));
        saveDatabase();
      } else {
        adminStmt.free();
        console.warn('[seed-demo-step6] no admin user found — skipping');
      }
    } catch (e: any) {
      
      
      const msg = e?.message || String(e);
      if (msg.includes('Demo deja prezent')) {
        console.log('[seed-demo-step6] already seeded — skipping');
      } else {
        console.error('[seed-demo-step6] FAILED:', msg);
      }
    }
  }

  
  
  
  console.log('[server] Starting rolling backup scheduler (every 6h, keep 14 daily)...');
  startBackupScheduler();

  const httpServer = http.createServer(app);
  attachRustDeskWsProxy(httpServer);

  httpServer.listen(PORT, BIND_HOST, () => {
    console.log(`[server] automatiX server running on http://${BIND_HOST}:${PORT}`);
    if (BIND_HOST === '127.0.0.1') {
      console.log('[server] Bound to LOOPBACK only — reachable from THIS PC. For tablets/LAN clients set PROMIX_LAN=1 (or PROMIX_BIND_HOST=0.0.0.0); behind a proxy set PROMIX_TRUST_PROXY=1.');
    } else {
      console.log(`[server] Clients can connect using: http://<this-pc-ip>:${PORT}`);
      if (!TRUST_PROXY) logger.warn('[server] ⚠  Bound to ALL interfaces without a reverse proxy — exposed directly on the network. Ensure this host is on a trusted LAN, or put a TLS proxy in front.');
    }
    console.log(`[server] Lifecycle log (shutdown/crash): ${getServerLogPath()}`);
    if (CORS_ALLOW_ALL) logger.warn('[server] ⚠  CORS: PROMIX_ALLOWED_ORIGINS contains "*" — ALL origins allowed. Dev/diagnostic only; lock this down before production.');
    else if (ALLOWED_ORIGINS.length > 0) console.log(`[server] CORS allowlist: ${ALLOWED_ORIGINS.join(', ')} (+ loopback)`);
    else console.log('[server] CORS: strict (same-origin + loopback only). Set PROMIX_ALLOWED_ORIGINS for cross-origin web clients.');
    if (TRUST_PROXY) console.log('[server] Trust-proxy mode: ON (X-Forwarded-For honored)');
    logServerEvent('STARTUP', `server listening on ${BIND_HOST}:${PORT} (v${APP_VERSION})`);
  });

  
  
  
  
  
  
  if (
    process.env.PROMIX_RUN_DEMO === '1' &&
    process.env.PROMIX_DEMO !== '1' &&
    process.env.PROMIX_TENANT !== '1'
  ) {
    try {
      const fsMod = require('fs');
      const cp = require('child_process');
      const demoScript = path.join(process.cwd(), 'scripts', 'serve-demo.cjs');
      if (fsMod.existsSync(demoScript)) {
        const child = cp.spawn(process.execPath, [demoScript], {
          
          
          env: { ...process.env, PROMIX_PORT: '3600', PROMIX_DEMO: '1', PROMIX_RUN_DEMO: '0' },
          stdio: 'ignore',
          windowsHide: true,
        });
        child.on('error', (e: Error) => console.warn('[demo] auto-start failed:', e.message));
        console.log('[server] demo instance starting on :3600 (PROMIX_RUN_DEMO=1; login with the demo creds → demo)');
      } else {
        console.warn('[demo] auto-start skipped — scripts/serve-demo.cjs not found');
      }
    } catch (e) {
      console.warn('[demo] auto-start error:', e instanceof Error ? e.message : e);
    }
  }

  
  setInterval(() => {
    try { saveDatabase(); } catch {}
  }, 30000);

  
  
  
  process.on('SIGINT', () => {
    console.log('[server] Shutting down...');
    logServerEvent('SHUTDOWN', 'SIGINT received — graceful shutdown');
    try { flushDatabase(); } catch (e) { console.error('[server] flush on SIGINT failed:', e); logServerEvent('SHUTDOWN', 'flush on SIGINT failed', e); }
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    logServerEvent('SHUTDOWN', 'SIGTERM received — graceful shutdown');
    try { flushDatabase(); } catch (e) { console.error('[server] flush on SIGTERM failed:', e); logServerEvent('SHUTDOWN', 'flush on SIGTERM failed', e); }
    process.exit(0);
  });
  
  process.on('exit', (code) => {
    try { releaseInstanceLock(); } catch { /* best effort */ }
    logServerEvent('EXIT', `process exiting with code ${code}`);
  });

  
  
  
  
  
  
  process.on('uncaughtException', (err) => {
    logger.error('[server] uncaughtException (kept alive):', err);
    logServerEvent('CRASH', 'uncaughtException (kept alive)', err);
    captureException(err, { source: 'uncaughtException' });
    // Best-effort: persist in-memory writes before we risk a later hard exit.
    try { flushDatabase(); } catch (e) { console.error('[server] flush after uncaughtException failed:', e); }
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('[server] unhandledRejection (kept alive):', reason);
    logServerEvent('CRASH', 'unhandledRejection (kept alive)', reason);
    captureException(reason, { source: 'unhandledRejection' });
  });
}

main().catch((err) => {
  console.error('[server] Fatal error:', err);
  logServerEvent('FATAL', 'fatal error during startup — exiting', err);
  process.exit(1);
});
