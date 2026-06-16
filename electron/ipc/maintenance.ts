import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import { MaintenanceService } from '../services/maintenanceService';

export function registerMaintenanceHandlers(): void {
  ipcRegister('list_piece_services', async (args: any) => {
    const projectId = args?.project_id ? Number(args.project_id) : null;
    return withAuthenticatedUser(args?.token, (db, user) => MaintenanceService.list(db, user, projectId));
  });

  ipcRegister('get_piece_service', async (args: any) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args?.token, (db, _user) => MaintenanceService.getById(db, args.id));
  });

  ipcRegister('create_piece_service', async (args: any) => {
    const req = args?.request ?? args;
    return withAuthenticatedUser(args?.token, (db, user) => MaintenanceService.create(db, user, req));
  });

  ipcRegister('update_piece_service', async (args: any) => {
    const req = args?.request ?? args;
    requirePositiveId(req?.id, 'id');
    return withAuthenticatedUser(args?.token, (db, user) => MaintenanceService.update(db, user, req));
  });

  ipcRegister('delete_piece_service', async (args: any) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args?.token, (db, user) => MaintenanceService.delete(db, user, args.id));
  });
}
