import type { Database } from 'sql.js';
import { queryOne } from './sqlHelpers';





export function getRolePermissions(db: Database, roleId: number): string[] {
  const raw = queryOne(
    db,
    'SELECT permissions FROM roles WHERE id = ?',
    [roleId],
    r => r.permissions as string,
  );
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}






export function roleHasAny(
  db: Database,
  roleId: number,
  expected: readonly string[],
): boolean {
  const perms = getRolePermissions(db, roleId);
  return perms.some(p => expected.includes(p));
}







export function getCustomPagesMap(customPagesJson: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!customPagesJson) return out;
  try {
    const parsed = JSON.parse(customPagesJson);
    if (Array.isArray(parsed)) {
      for (const p of parsed) if (typeof p === 'string') out[p] = 'full';
    } else if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') out[k] = v;
      }
    }
  } catch {  }
  return out;
}














export function userHasAny(
  db: Database,
  user: { role_id: number; custom_pages?: string | null },
  expected: readonly string[],
  grantingPages?: readonly string[],
): boolean {
  const cp = getCustomPagesMap(user.custom_pages ?? null);

  
  
  if (grantingPages) {
    for (const p of grantingPages) {
      if (cp[p] === 'denied') return false;
    }
  }

  if (roleHasAny(db, user.role_id, expected)) return true;
  if (!grantingPages || grantingPages.length === 0) return false;

  
  return grantingPages.some(p => p in cp && cp[p] !== 'denied');
}
