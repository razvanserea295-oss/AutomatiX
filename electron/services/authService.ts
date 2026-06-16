import type { Database } from 'sql.js';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../security/password';
import { CommandError } from '../middleware/errors';





export interface UserWithRole {
  id: number;
  username: string;
  email: string;
  password_hash?: string | null;
  full_name: string;
  role_id: number;
  role_name: string;
  role_description: string;
  active: boolean;
  last_login: string | null;
  custom_pages: string | null;
  must_change_password: boolean;
  dashboard_config?: string | null;
  
  job_title?: string | null;
  
  avatar_path?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: UserWithRole;
}


export interface LoginRequires2FA {
  requires_2fa: true;
  
  challenge: string;
}





function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function logAudit(db: Database, log: {
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string | null;
  ip_address: string | null;
}): void {
  try {
    db.run(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [log.user_id, log.action, log.entity_type, log.entity_id, log.details, log.ip_address]
    );
  } catch {
    
  }
}

function queryUser(db: Database, whereClause: string, params: any[]): UserWithRole {
  const stmt = db.prepare(
    `SELECT u.id, u.username, u.email, u.password_hash, u.full_name, u.role_id,
            r.name as role_name, r.description as role_description,
            u.active, u.last_login, u.custom_pages, u.must_change_password,
            u.job_title,
            u.created_at, u.updated_at, u.avatar_path
     FROM users u
     JOIN roles r ON u.role_id = r.id
     ${whereClause}`
  );
  stmt.bind(params);

  if (!stmt.step()) {
    stmt.free();
    throw CommandError.unauthorized('Username sau parolă incorectă');
  }

  const row = stmt.get();
  stmt.free();

  return {
    id: row[0] as number,
    username: row[1] as string,
    email: row[2] as string,
    password_hash: row[3] as string | null,
    full_name: row[4] as string,
    role_id: row[5] as number,
    role_name: row[6] as string,
    role_description: row[7] as string,
    active: !!(row[8]),
    last_login: row[9] as string | null,
    custom_pages: row[10] as string | null,
    must_change_password: !!(row[11]),
    job_title: row[12] as string | null,
    created_at: row[13] as string,
    updated_at: row[14] as string,
    avatar_path: row[15] as string | null,
  };
}






function normalizeIp(ip: string | null | undefined): string {
  if (!ip) return '127.0.0.1';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}






let DECOY_HASH_PROMISE: Promise<string> | null = null;
async function getDecoyHash(): Promise<string> {
  if (!DECOY_HASH_PROMISE) {
    DECOY_HASH_PROMISE = hashPassword('decoy-never-matches');
  }
  return DECOY_HASH_PROMISE;
}

export class AuthService {
  static async login(db: Database, username: string, password: string, clientIp?: string): Promise<LoginResponse> {
    if (!username || !password) {
      throw CommandError.badRequest('Username și parola sunt obligatorii');
    }
    const ip = normalizeIp(clientIp);

    
    
    
    let user: UserWithRole | null = null;
    try {
      user = queryUser(db, 'WHERE u.username = ? AND u.active = 1', [username]);
    } catch {
      user = null;
    }

    if (!user) {
      
      const decoy = await getDecoyHash();
      await verifyPassword(password, decoy);
      logAudit(db, {
        user_id: null,
        action: 'LOGIN_FAILED',
        entity_type: 'user',
        entity_id: null,
        details: JSON.stringify({ username, reason: 'unknown_user' }),
        ip_address: ip,
      });
      throw CommandError.unauthorized('Username sau parolă incorectă');
    }

    
    
    
    
    
    const LOCKOUT_THRESHOLD    = 5;
    const LOCKOUT_DURATION_MIN = 15;
    const lockedUntil = (user as any).locked_until as string | null;
    if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
      logAudit(db, {
        user_id: null, action: 'LOGIN_FAILED', entity_type: 'user',
        entity_id: user.id,
        details: JSON.stringify({ username, reason: 'locked', until: lockedUntil }),
        ip_address: ip,
      });
      throw CommandError.unauthorized(
        `Cont blocat temporar din cauza încercărilor eșuate. Încearcă mai târziu.`
      );
    }

    
    const passwordHash = user.password_hash;
    if (!passwordHash) {
      throw CommandError.unauthorized('Cont de utilizator invalid');
    }

    const valid = await verifyPassword(password, passwordHash);
    if (!valid) {
      
      const prev = ((user as any).failed_login_attempts as number | null) || 0;
      const next = prev + 1;
      let lockUntil: string | null = null;
      if (next >= LOCKOUT_THRESHOLD) {
        lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MIN * 60_000).toISOString();
      }
      db.run(
        `UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?`,
        [next, lockUntil, user.id],
      );
      logAudit(db, {
        user_id: null,
        action: lockUntil ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        entity_type: 'user',
        entity_id: user.id,
        details: JSON.stringify({ username, attempts: next, locked_until: lockUntil }),
        ip_address: ip,
      });
      throw CommandError.unauthorized('Username sau parolă incorectă');
    }

    
    if (((user as any).failed_login_attempts as number | null) || (user as any).locked_until) {
      db.run(
        `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`,
        [user.id],
      );
    }

    
    
    
    
    if ((user as any).totp_enabled) {
      const challenge = issue2FAChallenge(user.id, ip);
      const dummy: LoginRequires2FA = { requires_2fa: true, challenge };
      
      
      return dummy as unknown as LoginResponse;
    }

    
    const sessionId = uuidv4();
    const token = `${sessionId}:${uuidv4()}`;
    const tokenHash = sha256(token);

    
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    db.run(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, user.id, tokenHash, expiresAt, ip]
    );

    db.run(`UPDATE users SET last_login = datetime('now') WHERE id = ?`, [user.id]);

    logAudit(db, {
      user_id: user.id,
      action: 'LOGIN',
      entity_type: 'user',
      entity_id: user.id,
      details: null,
      ip_address: ip,
    });

    
    const { password_hash: _, ...safeUser } = user;
    return { token, user: safeUser as UserWithRole };
  }

  static logout(db: Database, token: string, clientIp?: string): void {
    const parts = token.split(':');
    if (parts.length < 2) throw CommandError.unauthorized('Token invalid');
    const ip = normalizeIp(clientIp);

    const sessionId = parts[0];
    const tokenHash = sha256(token);

    
    const stmt = db.prepare('SELECT user_id FROM sessions WHERE id = ? AND token_hash = ?');
    stmt.bind([sessionId, tokenHash]);
    const userId = stmt.step() ? (stmt.get()[0] as number | null) : null;
    stmt.free();

    db.run('DELETE FROM sessions WHERE id = ? AND token_hash = ?', [sessionId, tokenHash]);

    if (userId) {
      logAudit(db, {
        user_id: userId,
        action: 'LOGOUT',
        entity_type: 'user',
        entity_id: userId,
        details: null,
        ip_address: ip,
      });
    }
  }

  static validateSession(db: Database, token: string): UserWithRole {
    const parts = token.split(':');
    if (parts.length < 2) throw CommandError.unauthorized('Token invalid');

    const sessionId = parts[0];
    const tokenHash = sha256(token);

    let user: UserWithRole;
    try {
      user = queryUser(
        db,
        `JOIN sessions s ON u.id = s.user_id
         WHERE s.id = ? AND s.token_hash = ? AND datetime(s.expires_at) > datetime('now') AND u.active = 1`,
        [sessionId, tokenHash]
      );
    } catch {
      throw CommandError.unauthorized('Sesiune invalidă sau expirată');
    }

    const { password_hash: _, ...safeUser } = user;
    return safeUser as UserWithRole;
  }

  static async changePassword(
    db: Database,
    token: string,
    currentPassword: string,
    newPassword: string,
    clientIp?: string,
  ): Promise<UserWithRole> {
    const sessionUser = AuthService.validateSession(db, token);
    const ip = normalizeIp(clientIp);

    
    const full = queryUser(db, 'WHERE u.id = ? AND u.active = 1', [sessionUser.id]);
    if (!full.password_hash) throw CommandError.unauthorized('Cont de utilizator invalid');

    const ok = await verifyPassword(currentPassword, full.password_hash);
    if (!ok) {
      logAudit(db, {
        user_id: sessionUser.id,
        action: 'CHANGE_PASSWORD_FAILED',
        entity_type: 'user',
        entity_id: sessionUser.id,
        details: null,
        ip_address: ip,
      });
      throw CommandError.unauthorized('Parola curentă este incorectă');
    }

    if (newPassword === currentPassword) {
      throw CommandError.badRequest('Parola nouă trebuie să fie diferită de cea curentă');
    }

    try {
      validatePasswordStrength(newPassword);
    } catch (err) {
      throw CommandError.badRequest(err instanceof Error ? err.message : 'Parolă invalidă');
    }

    const newHash = await hashPassword(newPassword);
    db.run(
      `UPDATE users
          SET password_hash = ?, must_change_password = 0, updated_at = datetime('now')
        WHERE id = ?`,
      [newHash, sessionUser.id],
    );

    
    
    
    
    const tokenParts = token.split(':');
    const sessionId = tokenParts[0];
    db.run(
      `DELETE FROM sessions WHERE user_id = ? AND id != ?`,
      [sessionUser.id, sessionId],
    );

    logAudit(db, {
      user_id: sessionUser.id,
      action: 'CHANGE_PASSWORD',
      entity_type: 'user',
      entity_id: sessionUser.id,
      details: 'other sessions invalidated',
      ip_address: ip,
    });

    return AuthService.validateSession(db, token);
  }

  static cleanupExpiredSessions(db: Database): number {
    const stmt = db.prepare("SELECT COUNT(*) FROM sessions WHERE datetime(expires_at) < datetime('now')");
    stmt.step();
    const count = stmt.get()[0] as number;
    stmt.free();
    db.run("DELETE FROM sessions WHERE datetime(expires_at) < datetime('now')");
    return count;
  }

  
  
  

  





  static enable2FAStart(db: Database, token: string): { secret: string; otpauthUrl: string } {
    const user = AuthService.validateSession(db, token);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const OTPAuth = require('otpauth');
    const secret = new OTPAuth.Secret({ size: 20 });
    const issuer = 'PROMIX Automatix';
    const totp = new OTPAuth.TOTP({
      issuer,
      label: user.username,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    const secretBase32 = secret.base32;
    db.run('UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?', [secretBase32, user.id]);
    return { secret: secretBase32, otpauthUrl: totp.toString() };
  }

  




  static enable2FAConfirm(db: Database, token: string, code: string): { enabled: true } {
    const user = AuthService.validateSession(db, token);
    const stmt = db.prepare('SELECT totp_secret FROM users WHERE id = ?');
    stmt.bind([user.id]);
    if (!stmt.step()) { stmt.free(); throw CommandError.badRequest('Utilizator inexistent'); }
    const row = stmt.getAsObject() as any;
    stmt.free();
    const secretBase32 = row.totp_secret as string | null;
    if (!secretBase32) throw CommandError.badRequest('Trebuie să apelați enable_2fa_start mai întâi');
    if (!verifyTotp(secretBase32, code)) {
      throw CommandError.unauthorized('Cod 2FA invalid');
    }
    db.run('UPDATE users SET totp_enabled = 1 WHERE id = ?', [user.id]);
    logAudit(db, {
      user_id: user.id, action: 'ENABLE_2FA', entity_type: 'user',
      entity_id: user.id, details: null, ip_address: null,
    });
    return { enabled: true };
  }

  




  static disable2FA(db: Database, token: string, code: string): { enabled: false } {
    const user = AuthService.validateSession(db, token);
    const stmt = db.prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ?');
    stmt.bind([user.id]);
    if (!stmt.step()) { stmt.free(); throw CommandError.badRequest('Utilizator inexistent'); }
    const row = stmt.getAsObject() as any;
    stmt.free();
    if (!row.totp_enabled) throw CommandError.badRequest('2FA nu este activat');
    if (!row.totp_secret || !verifyTotp(row.totp_secret as string, code)) {
      throw CommandError.unauthorized('Cod 2FA invalid');
    }
    db.run('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?', [user.id]);
    logAudit(db, {
      user_id: user.id, action: 'DISABLE_2FA', entity_type: 'user',
      entity_id: user.id, details: null, ip_address: null,
    });
    return { enabled: false };
  }

  





  static async loginVerify2FA(
    db: Database,
    challenge: string,
    code: string,
    clientIp?: string,
  ): Promise<LoginResponse> {
    const ip = normalizeIp(clientIp);
    const userId = consume2FAChallenge(challenge, ip);
    if (!userId) throw CommandError.unauthorized('Challenge 2FA invalid sau expirat');

    const user = queryUser(db, 'WHERE u.id = ? AND u.active = 1', [userId]);
    if (!user) throw CommandError.unauthorized('Utilizator invalid');

    const secret = (user as any).totp_secret as string | null;
    if (!secret || !verifyTotp(secret, code)) {
      logAudit(db, {
        user_id: null, action: 'LOGIN_2FA_FAILED', entity_type: 'user',
        entity_id: user.id, details: null, ip_address: ip,
      });
      throw CommandError.unauthorized('Cod 2FA invalid');
    }

    const sessionId = uuidv4();
    const token = `${sessionId}:${uuidv4()}`;
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.run(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, ip_address) VALUES (?, ?, ?, ?, ?)`,
      [sessionId, user.id, tokenHash, expiresAt, ip],
    );
    db.run(`UPDATE users SET last_login = datetime('now') WHERE id = ?`, [user.id]);
    logAudit(db, {
      user_id: user.id, action: 'LOGIN_2FA', entity_type: 'user',
      entity_id: user.id, details: null, ip_address: ip,
    });

    const { password_hash: _, ...safeUser } = user as any;
    return { token, user: safeUser as UserWithRole };
  }
}





interface PendingChallenge { userId: number; ip: string | null; expiresAt: number; }
const pendingChallenges = new Map<string, PendingChallenge>();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function issue2FAChallenge(userId: number, ip: string | null): string {
  
  const now = Date.now();
  for (const [k, v] of pendingChallenges) {
    if (v.expiresAt < now) pendingChallenges.delete(k);
  }
  const challenge = crypto.randomBytes(32).toString('hex');
  pendingChallenges.set(challenge, { userId, ip, expiresAt: now + CHALLENGE_TTL_MS });
  return challenge;
}

function consume2FAChallenge(challenge: string, ip: string | null): number | null {
  const entry = pendingChallenges.get(challenge);
  if (!entry) return null;
  pendingChallenges.delete(challenge);                
  if (entry.expiresAt < Date.now()) return null;
  
  
  
  if (entry.ip && ip && entry.ip !== ip) return null;
  return entry.userId;
}

function verifyTotp(secretBase32: string, code: string): boolean {
  if (!code || !/^\d{6}$/.test(code)) return false;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const OTPAuth = require('otpauth');
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1', digits: 6, period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}
