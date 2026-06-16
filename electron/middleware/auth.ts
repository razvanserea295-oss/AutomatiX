import type { Database } from 'sql.js';
import { getDb, saveDatabase } from '../db/connection';
import { CommandError } from './errors';
import { AuthService, type UserWithRole } from '../services/authService';




export function requireTokenShape(token: string): void {
  const t = token?.trim();
  if (!t) throw CommandError.unauthorized('Token de sesiune lipsă');
  const parts = t.split(':');
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw CommandError.unauthorized('Token de sesiune invalid');
  }
}










export async function withAuthenticatedUser<T>(
  token: string,
  fn: (db: Database, user: UserWithRole) => T | Promise<T>
): Promise<T> {
  requireTokenShape(token);
  const db = getDb();
  const user = AuthService.validateSession(db, token);
  const result = await fn(db, user);
  saveDatabase();
  return result;
}





export async function withAdminUser<T>(
  token: string,
  fn: (db: Database, user: UserWithRole) => T | Promise<T>
): Promise<T> {
  return withAuthenticatedUser(token, async (db, user) => {
    if (user.role_name !== 'admin') {
      throw CommandError.forbidden('Necesită drepturi de administrator');
    }
    return fn(db, user);
  });
}








export async function withConnection<T>(
  fn: (db: Database) => T | Promise<T>
): Promise<T> {
  const db = getDb();
  const result = await fn(db);
  saveDatabase();
  return result;
}




export function requirePositiveId(id: number, field: string): void {
  if (!id || id <= 0) {
    throw CommandError.badRequest(`Identificator invalid pentru ${field} (trebuie > 0)`);
  }
}
