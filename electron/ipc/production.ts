import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { requirePositiveId } from '../middleware/auth';
import { ProductionService } from '../services/productionService';

export function registerProductionHandlers(): void {
  ipcRegister('get_production_board', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => {
      return ProductionService.getBoardData(db);
    });
  });

  ipcRegister('get_stage_transitions', async (args: any) => {
    requirePositiveId(args?.project_id, 'project_id');
    return withAuthenticatedUser(args?.token, (db, _user) => {
      return ProductionService.getStageTransitions(db, args.project_id);
    });
  });

  ipcRegister('move_project_to_stage', async (args: any) => {
    requirePositiveId(args?.project_id, 'project_id');
    requirePositiveId(args?.new_stage_id, 'new_stage_id');
    if (args?.notes && args.notes.length > 8000) {
      throw new Error('Notițele depășesc lungimea maximă');
    }
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ProductionService.moveProjectToStage(db, args.project_id, args.new_stage_id, user, args.notes ?? null);
    });
  });
}
