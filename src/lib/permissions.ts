import { normalizeRole } from './access';

export const R = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  PROJECT_MANAGER: 'project_manager',
  HALA: 'hala',
  MUNCITOR: 'muncitor',
  FINANCIAR: 'financiar',
  LOGISTICA: 'logistica',
  SERVICE: 'service',
  VIEWER: 'viewer',
  MODERATOR: 'moderator',
} as const;

export function roleIn(role: string | undefined | null, allowed: readonly string[]): boolean {
  const r = normalizeRole(role);
  return allowed.includes(r);
}
