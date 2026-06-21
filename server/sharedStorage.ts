












import type { Express, Request, Response } from 'express';
import { AuthService } from '../electron/services/authService';
import { getDb, saveDatabase } from './db';

type Scope = 'user' | 'company' | 'global';
const SCOPES: Scope[] = ['user', 'company', 'global'];

const MAX_VALUE_BYTES = 512 * 1024;
const MAX_KEY_LEN = 256;

function authUser(req: Request) {
  const header = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const token = header || (req.query.token as string) || '';
  if (!token) return null;
  try { return AuthService.validateSession(getDb(), token) || null; } catch { return null; }
}

function parseScope(raw: string): Scope | null {
  return (SCOPES as string[]).includes(raw) ? (raw as Scope) : null;
}

function ownerFor(scope: Scope, userId: number): number {
  return scope === 'user' ? userId : 0;
}

function safeParse(json: string): unknown {
  try { return JSON.parse(json); } catch { return null; }
}

export function registerSharedStorage(app: Express): void {
  app.get('/api/shared-storage/:scope', (req: Request, res: Response) => {
    const user = authUser(req);
    if (!user) { res.status(401).json({ message: 'token required' }); return; }
    const scope = parseScope(String(req.params.scope));
    if (!scope) { res.status(400).json({ message: 'scope invalid' }); return; }

    const owner = ownerFor(scope, user.id);
    const items: Array<{ key: string; value: unknown; updatedAt: string; scope: Scope }> = [];
    try {
      const stmt = getDb().prepare(
        'SELECT key, value, updated_at FROM shared_storage WHERE scope = ? AND owner_id = ? ORDER BY key',
      );
      stmt.bind([scope, owner]);
      while (stmt.step()) {
        const row = stmt.getAsObject() as { key: string; value: string; updated_at: string };
        items.push({ key: row.key, value: safeParse(row.value), updatedAt: row.updated_at, scope });
      }
      stmt.free();
    } catch (e) {
      console.error('[shared-storage] list failed:', e instanceof Error ? e.message : e);
      res.status(500).json({ message: 'list failed' });
      return;
    }
    res.json(items);
  });

  app.get('/api/shared-storage/:scope/:key', (req: Request, res: Response) => {
    const user = authUser(req);
    if (!user) { res.status(401).json({ message: 'token required' }); return; }
    const scope = parseScope(String(req.params.scope));
    if (!scope) { res.status(400).json({ message: 'scope invalid' }); return; }
    const key = String(req.params.key);

    const owner = ownerFor(scope, user.id);
    let row: { value: string; updated_at: string } | null = null;
    try {
      const stmt = getDb().prepare(
        'SELECT value, updated_at FROM shared_storage WHERE scope = ? AND owner_id = ? AND key = ?',
      );
      stmt.bind([scope, owner, key]);
      if (stmt.step()) row = stmt.getAsObject() as { value: string; updated_at: string };
      stmt.free();
    } catch (e) {
      console.error('[shared-storage] get failed:', e instanceof Error ? e.message : e);
      res.status(500).json({ message: 'get failed' });
      return;
    }
    if (!row) { res.status(404).json({ message: 'not found' }); return; }
    res.json({ key, value: safeParse(row.value), updatedAt: row.updated_at, scope });
  });

  app.post('/api/shared-storage/:scope/:key', (req: Request, res: Response) => {
    const user = authUser(req);
    if (!user) { res.status(401).json({ message: 'token required' }); return; }
    const scope = parseScope(String(req.params.scope));
    if (!scope) { res.status(400).json({ message: 'scope invalid' }); return; }
    const key = String(req.params.key);
    if (!key || key.length > MAX_KEY_LEN) { res.status(400).json({ message: 'key invalid' }); return; }

    const value = (req.body && 'value' in req.body) ? req.body.value : null;
    let json: string;
    try { json = JSON.stringify(value ?? null); } catch { res.status(400).json({ message: 'value not serializable' }); return; }
    if (Buffer.byteLength(json, 'utf8') > MAX_VALUE_BYTES) {
      res.status(413).json({ message: 'value too large' });
      return;
    }

    const owner = ownerFor(scope, user.id);
    try {
      getDb().run(
        `INSERT INTO shared_storage (scope, owner_id, key, value, updated_at, updated_by)
         VALUES (?, ?, ?, ?, datetime('now'), ?)
         ON CONFLICT(scope, owner_id, key)
         DO UPDATE SET value = excluded.value, updated_at = datetime('now'), updated_by = excluded.updated_by`,
        [scope, owner, key, json, user.id],
      );
      saveDatabase();
    } catch (e) {
      console.error('[shared-storage] set failed:', e instanceof Error ? e.message : e);
      res.status(500).json({ message: 'set failed' });
      return;
    }
    res.json({ ok: true });
  });

  app.delete('/api/shared-storage/:scope/:key', (req: Request, res: Response) => {
    const user = authUser(req);
    if (!user) { res.status(401).json({ message: 'token required' }); return; }
    const scope = parseScope(String(req.params.scope));
    if (!scope) { res.status(400).json({ message: 'scope invalid' }); return; }
    const key = String(req.params.key);

    const owner = ownerFor(scope, user.id);
    try {
      getDb().run('DELETE FROM shared_storage WHERE scope = ? AND owner_id = ? AND key = ?', [scope, owner, key]);
      saveDatabase();
    } catch (e) {
      console.error('[shared-storage] delete failed:', e instanceof Error ? e.message : e);
      res.status(500).json({ message: 'delete failed' });
      return;
    }
    res.json({ ok: true });
  });
}
