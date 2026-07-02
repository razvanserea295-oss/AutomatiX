// Lead capture for the marketing landing — "Cere acces" / "Cere o demonstrație".
//
// Public POST /api/lead stores a row in `leads` (host instance) and best-effort
// emails the admins (reusing NotifierService). Admin commands list/triage leads.
// Keeps the manual-license model: a lead → you generate + send a key, as before.

import type { Express, Request, Response } from 'express';
import type { Database } from 'sql.js';
import rateLimit from 'express-rate-limit';
import { getDb, saveDatabase } from './db';
import { ipcRegister } from '../electron/commands/registry';
import { withAdminUser } from '../electron/middleware/auth';
import { CommandError } from '../electron/middleware/errors';
import { NotifierService } from '../electron/services/notifierService';

function adminUserIds(db: Database): number[] {
  const ids: number[] = [];
  const stmt = db.prepare(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.active = 1 AND LOWER(r.name) IN ('admin','manager')`,
  );
  try { while (stmt.step()) ids.push(stmt.getAsObject().id as number); } finally { stmt.free(); }
  return ids;
}

function clean(v: unknown, max = 2000): string {
  return String(v ?? '').trim().slice(0, max);
}

const leadLimiter = rateLimit({
  windowMs: 60_000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: 'Prea multe cereri. Așteaptă un minut.' },
});

export function registerLeads(app: Express): void {
  // Public lead intake.
  app.post('/api/lead', leadLimiter, async (req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    const body = req.body || {};
    // Honeypot: bots fill hidden fields — silently accept & drop.
    if (clean(body.website, 200)) { res.json({ ok: true }); return; }

    const type = clean(body.type, 16).toLowerCase() === 'demo' ? 'demo' : 'access';
    const name = clean(body.name, 120);
    const company = clean(body.company, 160);
    const email = clean(body.email, 200);
    const phone = clean(body.phone, 60);
    const message = clean(body.message, 4000);

    if (!name) { res.status(400).json({ ok: false, error: 'name', message: 'Numele este obligatoriu.' }); return; }
    if (!email && !phone) { res.status(400).json({ ok: false, error: 'contact', message: 'Lasă un email sau un telefon.' }); return; }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      res.status(400).json({ ok: false, error: 'email', message: 'Email invalid.' }); return;
    }

    const db = getDb();
    try {
      db.run(
        `INSERT INTO leads (type, name, company, email, phone, message, source, ip)
         VALUES (?, ?, ?, ?, ?, ?, 'landing', ?)`,
        [type, name, company, email, phone, message, clean(req.ip, 64)],
      );
      saveDatabase();
    } catch (e) {
      console.error('[leads] insert failed:', e instanceof Error ? e.message : e);
      res.status(500).json({ ok: false, message: 'Eroare internă.' }); return;
    }

    // Best-effort email notification to admins/managers (never blocks the reply).
    try {
      const ids = adminUserIds(db);
      if (ids.length) {
        const label = type === 'demo' ? 'Cerere de DEMONSTRAȚIE' : 'Cerere de ACCES';
        const text =
          `${label} de pe automatix.online\n\n` +
          `Nume:    ${name}\n` +
          `Firmă:   ${company || '—'}\n` +
          `Email:   ${email || '—'}\n` +
          `Telefon: ${phone || '—'}\n\n` +
          `Mesaj:\n${message || '—'}\n`;
        await NotifierService.send(db, { to: { userIds: ids }, subject: `Automatix — ${label}: ${company || name}`, text });
      }
    } catch (e) {
      console.warn('[leads] notify failed (lead saved anyway):', e instanceof Error ? e.message : e);
    }

    res.json({ ok: true });
  });

  // Admin: list leads (read — non-mutating name).
  ipcRegister('list_leads', async (args: { token?: string; status?: string } | undefined) =>
    withAdminUser(args?.token || '', (db) => {
      const rows: Record<string, unknown>[] = [];
      const stmt = db.prepare(
        `SELECT id, type, name, company, email, phone, message, source, status, created_at
           FROM leads ORDER BY datetime(created_at) DESC LIMIT 500`,
      );
      try { while (stmt.step()) rows.push(stmt.getAsObject()); } finally { stmt.free(); }
      return { leads: rows };
    }),
  );

  // Admin: triage a lead.
  ipcRegister('update_lead_status', async (args: { token?: string; id?: number; status?: string } | undefined) =>
    withAdminUser(args?.token || '', (db) => {
      const id = Number(args?.id || 0);
      const status = clean(args?.status, 16);
      if (!id || !['new', 'contacted', 'converted', 'rejected'].includes(status)) {
        throw CommandError.badRequest('id sau status invalid');
      }
      db.run('UPDATE leads SET status = ? WHERE id = ?', [status, id]);
      return { ok: true };
    }),
  );
}
