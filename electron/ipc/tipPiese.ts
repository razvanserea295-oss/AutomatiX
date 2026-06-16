import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { TipPieseService, type OperatieConfig } from '../services/tipPieseService';

export function registerTipPieseHandlers(): void {
  ipcRegister('get_tip_piese', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db) => TipPieseService.getTipPiese(db));
  });

  ipcRegister('get_operatii_config', async (args: any) => {
    const tipId: number = Number(args?.tip_piesa_id || 0);
    return withAuthenticatedUser(args?.token, (db) => TipPieseService.getOperatiiConfig(db, tipId));
  });

  ipcRegister('save_operatii_config', async (args: any) => {
    const tipId: number = Number(args?.tip_piesa_id || 0);
    const operatii: OperatieConfig[] = Array.isArray(args?.operatii) ? args.operatii : [];
    return withAuthenticatedUser(args?.token, (db) => TipPieseService.saveOperatiiConfig(db, tipId, operatii));
  });
}
