






















import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import http from 'http';
import { initDatabaseForServer, getDb, saveDatabase, flushDatabase, isFreshDatabase } from './db';
import { ensureBlankTenant } from './tenantInit';
import { DeplasariService } from '../electron/services/deplasariService';
import { runMigrations } from '../electron/db/migrations';
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
import { logServerEvent, getServerLogPath } from './eventLog';
import { registerReleaseUpload } from './releaseUpload';
import { registerPartsTreeDownload } from './partsTreeDownload';
import { registerPartsTreeUpload } from './partsTreeUpload';
import { registerBriefingUpload } from './briefingUpload';
import { registerAvatarUpload } from './avatarUpload';
import { registerDownloads } from './downloads';
import { startBackupScheduler } from './backup';

const PORT = parseInt(process.env.PROMIX_PORT || '3500', 10);
const UPDATES_DIR = process.env.PROMIX_UPDATES_DIR || path.join(process.cwd(), 'updates');







const BODY_LIMIT = process.env.PROMIX_BODY_LIMIT || '500mb';
const TRUST_PROXY = process.env.PROMIX_TRUST_PROXY === '1';
const RATE_LIMIT_OFF = process.env.PROMIX_RATE_LIMIT_OFF === '1';



const ALLOWED_ORIGINS = (process.env.PROMIX_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);







const BIND_HOST = process.env.PROMIX_BIND_HOST
  || ((TRUST_PROXY || process.env.PROMIX_LAN === '1') ? '0.0.0.0' : '127.0.0.1');

const app = express();




if (TRUST_PROXY) app.set('trust proxy', 1);









app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      scriptSrc: ["'self'"],
      
      
      
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],   
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],                  
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

app.get('/api/health', (_req, res) => {


  res.json({
    status: 'ok',
    version: APP_VERSION,
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

app.use(express.static(DIST_DIR, { index: false })); 


app.get(['/m', '/m/'], (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(MOBILE_HTML);
});



app.get('/', (_req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html');
  const fs = require('fs') as typeof import('fs');
  if (fs.existsSync(indexPath)) {
    res.set('Cache-Control', 'no-store');
    res.sendFile(indexPath);
  } else {
    
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-store');
    res.send(MOBILE_HTML);
  }
});







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











registerReleaseUpload(app, UPDATES_DIR);



registerPartsTreeDownload(app);


// global express.json() body parser would matter (json parser skips



registerPartsTreeUpload(app);




registerBriefingUpload(app);


registerAvatarUpload(app);



registerDownloads(app);

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
        res.json({ tenant_slug: slug, ...data });
        return;
      }
      // 401 (wrong tenant / bad creds) or other → try the next firm.
    } catch { /* tenant instance unreachable → skip it */ }
  }
  // Generic message — never reveal which/whether a firm has the username.
  res.status(401).json({ code: 401, message: 'Username sau parolă incorectă' });
});


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

    
    
    // page or button can bypass it. (Demo-mode global read-only is handled in
    
    
    if (token && isMutatingCommand(command)) {
      try {
        const u = AuthService.validateSession(getServerDb(), token) as { role_name?: string } | null;
        if (u && String(u.role_name || '').toLowerCase() === 'viewer') {
          res.status(403).json({ code: 403, message: 'Rol „Vizitator" — doar vizualizare. Nu poți modifica date.' });
          return;
        }
      } catch {  }
    }

    try {
      const result = await handleCommand(command, args);
      res.json(result ?? null);
    } catch (err: any) {
      const hasCode = err && Number.isInteger(err.code) && err.code >= 100 && err.code < 600;
      if (hasCode) {
        
        console.error(`[server] ${command} failed (${err.code}): ${err.message}`);
        res.status(err.code).json({ code: err.code, message: err.message });
      } else {
        // Friendly mapping for raw sql.js constraint violations (UNIQUE / FK /
        // NOT NULL / CHECK) so the user sees an actionable message instead of a
        // generic 500. Anything else stays a safe generic 400/500 (no SQL leak).
        const dbErr = mapSqliteConstraintError(err);
        if (dbErr) {
          console.error(`[server] ${command} rejected (${dbErr.code} db-constraint):`, err instanceof Error ? err.message : err);
          res.status(dbErr.code).json({ code: dbErr.code, message: dbErr.message });
        } else {
          const isInput = typeof err === 'string' || err instanceof TypeError || err instanceof RangeError;
          const code = isInput ? 400 : 500;
          console.error(`[server] ${command} ${isInput ? 'rejected (400 bad input)' : 'crashed (500)'}:`, err);
          res.status(code).json({
            code,
            message: isInput ? 'Cerere invalidă: parametri lipsă sau incorecți.' : 'Eroare internă.',
          });
        }
      }
    }
  },
);






app.get(/^(?!\/api).*/, (_req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html');
  const fs = require('fs') as typeof import('fs');
  if (fs.existsSync(indexPath)) {
    res.set('Cache-Control', 'no-store');
    res.sendFile(indexPath);
  } else {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-store');
    res.send(MOBILE_HTML);
  }
});






app.use((err: any, _req: any, res: any, _next: any) => {
  const code = err?.code && Number.isInteger(err.code) && err.code >= 100 && err.code < 600
    ? err.code : 500;
  
  console.error(`[server] unhandled error (${code}):`, err?.message || err);
  if (res.headersSent) return;
  res.status(code).json({
    code,
    message: code === 500 ? 'Internal server error' : (err?.message || 'Error'),
  });
});


async function main() {
  console.log('[server] Initializing database...');
  const db = await initDatabaseForServer();
  runMigrations(db);

  
  
  
  
  
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

  app.listen(PORT, BIND_HOST, () => {
    console.log(`[server] automatiX server running on http://${BIND_HOST}:${PORT}`);
    if (BIND_HOST === '127.0.0.1') {
      console.log('[server] Bound to LOOPBACK only — reachable from THIS PC. For tablets/LAN clients set PROMIX_LAN=1 (or PROMIX_BIND_HOST=0.0.0.0); behind a proxy set PROMIX_TRUST_PROXY=1.');
    } else {
      console.log(`[server] Clients can connect using: http://<this-pc-ip>:${PORT}`);
      if (!TRUST_PROXY) console.warn('[server] ⚠  Bound to ALL interfaces without a reverse proxy — exposed directly on the network. Ensure this host is on a trusted LAN, or put a TLS proxy in front.');
    }
    console.log(`[server] Lifecycle log (shutdown/crash): ${getServerLogPath()}`);
    if (CORS_ALLOW_ALL) console.warn('[server] ⚠  CORS: PROMIX_ALLOWED_ORIGINS contains "*" — ALL origins allowed. Dev/diagnostic only; lock this down before production.');
    else if (ALLOWED_ORIGINS.length > 0) console.log(`[server] CORS allowlist: ${ALLOWED_ORIGINS.join(', ')} (+ loopback)`);
    else console.log('[server] CORS: strict (same-origin + loopback only). Set PROMIX_ALLOWED_ORIGINS for cross-origin web clients.');
    if (TRUST_PROXY) console.log('[server] Trust-proxy mode: ON (X-Forwarded-For honored)');
    logServerEvent('STARTUP', `server listening on ${BIND_HOST}:${PORT} (v${APP_VERSION})`);
  });

  
  
  
  
  
  
  if (
    process.env.PROMIX_DEMO !== '1' &&
    process.env.PROMIX_RUN_DEMO !== '0' &&
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
        console.log('[server] demo instance auto-starting on :3600 (login with the demo creds → demo; set PROMIX_RUN_DEMO=0 to disable)');
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
    logServerEvent('EXIT', `process exiting with code ${code}`);
  });

  
  
  
  
  
  
  process.on('uncaughtException', (err) => {
    console.error('[server] uncaughtException (kept alive):', err);
    logServerEvent('CRASH', 'uncaughtException (kept alive)', err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[server] unhandledRejection (kept alive):', reason);
    logServerEvent('CRASH', 'unhandledRejection (kept alive)', reason);
  });
}

main().catch((err) => {
  console.error('[server] Fatal error:', err);
  logServerEvent('FATAL', 'fatal error during startup — exiting', err);
  process.exit(1);
});
