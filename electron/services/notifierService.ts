














import type { Database } from 'sql.js';
import { decryptCredential } from '../security/emailCrypto';

interface SystemAccount {
  id: number;
  user_id: number;
  email_address: string;
  display_name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_use_tls: number;
  smtp_username: string;
  smtp_password_enc: string;
}

let cachedAccount: SystemAccount | null = null;
let cacheStamp = 0;
const CACHE_MS = 5 * 60 * 1000;

function pickSystemAccount(db: Database): SystemAccount | null {
  if (cachedAccount && Date.now() - cacheStamp < CACHE_MS) return cachedAccount;

  
  const stmt = db.prepare(
    `SELECT a.id, a.user_id, a.email_address, a.display_name,
            a.smtp_host, a.smtp_port, a.smtp_use_tls, a.smtp_username, a.smtp_password_enc
       FROM email_accounts a
       JOIN users u ON u.id = a.user_id
       JOIN roles r ON r.id = u.role_id
      WHERE a.enabled = 1
        AND LOWER(r.name) IN ('admin', 'manager')
      ORDER BY (LOWER(r.name) = 'admin') DESC, a.id ASC
      LIMIT 1`
  );
  let acc: SystemAccount | null = null;
  if (stmt.step()) acc = stmt.getAsObject() as unknown as SystemAccount;
  stmt.free();
  cachedAccount = acc;
  cacheStamp = Date.now();
  return acc;
}


function resolveEmails(db: Database, userIds: number[]): string[] {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT email FROM users WHERE id IN (${placeholders}) AND active = 1`);
  stmt.bind(userIds);
  const seen = new Set<string>();
  while (stmt.step()) {
    const e = (stmt.getAsObject().email as string | null)?.trim();
    if (e) seen.add(e);
  }
  stmt.free();
  return Array.from(seen);
}

let warnedNoAccount = false;

export interface SendArgs {
  to: string[] | { userIds: number[] };
  subject: string;
  text: string;
  
  html?: string;
}

export class NotifierService {
  



  static async send(db: Database, args: SendArgs): Promise<{ sent: number; reason?: string }> {
    const acc = pickSystemAccount(db);
    if (!acc) {
      if (!warnedNoAccount) {
        console.warn('[notifier] No admin/manager email_account configured — outbound notifications disabled');
        warnedNoAccount = true;
      }
      return { sent: 0, reason: 'no system account' };
    }

    const recipients = Array.isArray(args.to) ? args.to : resolveEmails(db, args.to.userIds);
    if (recipients.length === 0) return { sent: 0, reason: 'no recipients' };

    try {
      
      const nodemailer = require('nodemailer');
      
      
      
      const tlsInsecure = process.env.PROMIX_EMAIL_TLS_INSECURE === '1';
      const transport = nodemailer.createTransport({
        host: acc.smtp_host,
        port: acc.smtp_port || 587,
        secure: (acc.smtp_port || 587) === 465,
        auth: { user: acc.smtp_username, pass: decryptCredential(acc.smtp_password_enc || '') },
        tls: { rejectUnauthorized: !tlsInsecure },
      });
      await transport.sendMail({
        from: `"${acc.display_name}" <${acc.email_address}>`,
        to: recipients.join(', '),
        subject: args.subject,
        text: args.text,
        html: args.html ?? `<pre style="font-family:system-ui,sans-serif;font-size:13px;white-space:pre-wrap">${args.text}</pre>`,
      });
      transport.close();
      return { sent: recipients.length };
    } catch (e) {
      console.error('[notifier] sendMail failed:', e instanceof Error ? e.message : e);
      return { sent: 0, reason: 'smtp error' };
    }
  }
}
