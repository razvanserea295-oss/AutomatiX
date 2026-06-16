










import type { Database } from 'sql.js';
import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, withAdminUser } from '../middleware/auth';
import { logAudit } from '../db/audit';

const DEFAULT_MESSAGE =
  'Aplicația este momentan în mentenanță. Revenim cât mai curând — mulțumim pentru răbdare.';

export interface MaintenanceStatus {
  enabled: boolean;
  message: string;
  eta: string | null;
  updated_at: string | null;
}

function readStatus(db: Database): MaintenanceStatus {
  const stmt = db.prepare(
    'SELECT maintenance_mode, maintenance_message, maintenance_eta, maintenance_updated_at FROM company_settings WHERE id = 1',
  );
  let res: MaintenanceStatus = { enabled: false, message: DEFAULT_MESSAGE, eta: null, updated_at: null };
  if (stmt.step()) {
    const r = stmt.getAsObject();
    res = {
      enabled: !!(r.maintenance_mode as number),
      message: (r.maintenance_message as string | null) || DEFAULT_MESSAGE,
      eta: (r.maintenance_eta as string | null) ?? null,
      updated_at: (r.maintenance_updated_at as string | null) ?? null,
    };
  }
  stmt.free();
  return res;
}

export function registerAppMaintenanceHandlers(): void {
  
  ipcRegister('get_maintenance_mode', async (args: any) =>
    withAuthenticatedUser(args?.token, (db) => readStatus(db)),
  );

  
  ipcRegister('set_maintenance_mode', async (args: any) =>
    withAdminUser(args?.token, (db, user) => {
      const req = args?.request ?? args ?? {};
      
      const enabled = !!(req.enabled ?? req.active);
      const message = (req.message ?? null) as string | null;
      const eta = (req.eta ?? null) as string | null;
      const before = readStatus(db);
      db.run(
        `UPDATE company_settings
            SET maintenance_mode = ?, maintenance_message = ?, maintenance_eta = ?, maintenance_updated_at = datetime('now')
          WHERE id = 1`,
        [enabled ? 1 : 0, message, eta],
      );
      const after = readStatus(db);
      logAudit(
        { userId: user.id, username: user.username },
        'update',
        'maintenance_mode',
        1,
        { enabled: before.enabled, message: before.message, eta: before.eta },
        { enabled: after.enabled, message: after.message, eta: after.eta },
      );
      return after;
    }),
  );
}
