

let ipcMain: any = undefined;
try {
  const _e = require('electron');
  if (_e && typeof _e === 'object') { ipcMain = _e.ipcMain; }
} catch {  }
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import os from 'os';
import { getCommand, commandCount } from '../commands/registry';
import { PortalService } from '../services/portalService';
import { RfqService } from '../services/rfqService';
import { getDb, saveDatabase } from '../db/connection';






const inElectron = !!ipcMain && typeof (ipcMain as any).handle === 'function';

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

let httpServer: http.Server | null = null;
let serverPort = 3500;

export function registerServerControlHandlers(): void {
  if (!inElectron) return;
  ipcMain.handle('server_start', async (_e: any, args: any) => {
    if (httpServer) return { running: true, port: serverPort, message: 'Server deja pornit' };

    serverPort = args?.port || 3500;

    const app = express();

    
    
    
    
    
    app.set('trust proxy', 1);

    
    
    
    
    app.use(helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'blob:'],
          'connect-src': ["'self'", 'https:', 'http://localhost:*', 'ws:', 'wss:'],
          'font-src': ["'self'", 'data:'],
          'frame-ancestors': ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    
    
    const allowedOrigins = [
      'https://automatix.online',
      'http://localhost:3500',
      'http://127.0.0.1:3500',
      
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ];
    app.use(cors({
      origin: (origin, cb) => {
        
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: false,
    }));

    
    
    
    const loginLimiter = rateLimit({
      windowMs: 60 * 1000,        
      limit: 10,                  
      standardHeaders: true,
      legacyHeaders: false,
      message: { code: 429, message: 'Prea multe încercări de autentificare. Încearcă din nou peste 1 minut.' },
    });
    const cmdLimiter = rateLimit({
      windowMs: 60 * 1000,
      limit: 300,                 
      standardHeaders: true,
      legacyHeaders: false,
      message: { code: 429, message: 'Prea multe cereri. Încearcă din nou peste 1 minut.' },
    });
    const tokenLimiter = rateLimit({
      windowMs: 60 * 1000,
      limit: 60,                  
      standardHeaders: true,
      legacyHeaders: false,
      message: { code: 429, message: 'Prea multe cereri pe token.' },
    });

    
    
    
    app.use(express.json({ limit: '2gb' }));

    app.get('/api/health', (_req, res) => {
      const version = (() => {
        try { return require('electron').app.getVersion(); }
        catch { return '0.0.0'; }
      })();
      res.json({ status: 'ok', version, mode: 'embedded-server' });
    });

    
    const asStr = (v: unknown): string =>
      typeof v === 'string' ? v : (Array.isArray(v) ? String(v[0] ?? '') : String(v ?? ''));

    
    app.get('/api/rfq/:token', tokenLimiter, (req, res) => {
      try {
        const view = RfqService.getByPublicToken(getDb(), asStr(req.params.token));
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
        const result = RfqService.submitPublicResponse(getDb(), asStr(req.params.token), req.body);
        saveDatabase();
        res.json(result);
      } catch (err: any) {
        const code = err?.code && err.code >= 100 && err.code < 600 ? err.code : 500;
        res.status(code).json({ message: err?.message || 'rfq submit error' });
      }
    });

    
    app.get('/api/portal/:token', tokenLimiter, (req, res) => {
      try {
        const view = PortalService.viewByToken(getDb(), asStr(req.params.token));
        saveDatabase();
        res.set('Cache-Control', 'no-store');
        res.json(view);
      } catch (err: any) {
        const code = err?.code && err.code >= 100 && err.code < 600 ? err.code : 500;
        res.status(code).json({ message: err?.message || 'portal error' });
      }
    });

    app.post('/api/cmd/:command', async (req, res, next) => {
      
      
      
      const cmd = asStr(req.params.command);
      const isLogin = cmd === 'login_user' || cmd === 'login';
      const limiter = isLogin ? loginLimiter : cmdLimiter;
      
      
      limiter(req, res, () => {
        
        runCmdHandler(req, res).catch(next);
      });
    });

    async function runCmdHandler(req: express.Request, res: express.Response) {
      const command = asStr(req.params.command);
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      
      
      
      
      const clientIp = req.ip || req.socket?.remoteAddress || null;
      const cmdArgs = { ...req.body, token, clientIp };

      const handler = getCommand(command);
      if (!handler) {
        return res.status(404).json({ code: 404, message: `Command '${command}' not found` });
      }

      try {
        const result = await handler(cmdArgs);
        res.json(result ?? null);
      } catch (err: any) {
        const code = err.code || 500;
        
        
        
        
        const safeMsg = code >= 500
          ? 'Server error'
          : (err.message || 'Eroare');
        res.status(code >= 100 && code < 600 ? code : 500).json({ code, message: safeMsg });
        if (code >= 500) {
          
          console.error(`[embedded-server] ${command} failed (${code}):`, err);
        }
      }
    }

    console.log(`[embedded-server] ${commandCount()} commands registered`);

    return new Promise((resolve) => {
      httpServer = app.listen(serverPort, '0.0.0.0', () => {
        console.log(`[embedded-server] Running on http://0.0.0.0:${serverPort}`);
        resolve({ running: true, port: serverPort, message: `Server pornit pe port ${serverPort}` });
      });

      httpServer.on('error', (err: any) => {
        httpServer = null;
        resolve({ running: false, port: serverPort, message: `Eroare: ${err.message}` });
      });
    });
  });

  ipcMain.handle('server_stop', async () => {
    if (!httpServer) return { running: false, message: 'Serverul nu era pornit' };

    return new Promise((resolve) => {
      httpServer!.close(() => {
        httpServer = null;
        console.log('[embedded-server] Stopped');
        resolve({ running: false, message: 'Server oprit' });
      });
    });
  });

  ipcMain.handle('server_status', async () => {
    return {
      running: !!httpServer,
      port: serverPort,
      localIp: getLocalIp(),
    };
  });

  ipcMain.handle('get_local_ip', async () => {
    return getLocalIp();
  });
}
