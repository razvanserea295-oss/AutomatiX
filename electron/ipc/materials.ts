import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { MaterialService } from '../services/materialService';
import { requirePositiveId } from '../middleware/auth';

export function registerMaterialHandlers(): void {
  ipcRegister('get_materials', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => {
      return MaterialService.getMaterials(db);
    });
  });

  ipcRegister('create_material', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return MaterialService.createMaterial(db, user, args.request || args);
    });
  });

  ipcRegister('update_material', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return MaterialService.updateMaterial(db, user, args.request || args);
    });
  });

  ipcRegister('delete_material', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      requirePositiveId(args.id, 'id');
      return MaterialService.deleteMaterial(db, user, args.id);
    });
  });

  ipcRegister('get_material_consumptions', async (args: any) => {
    if (args?.project_id != null) {
      requirePositiveId(args.project_id, 'project_id');
    }
    return withAuthenticatedUser(args?.token, (db, _user) => {
      return MaterialService.getConsumptions(db, args?.project_id ?? null);
    });
  });

  ipcRegister('create_material_consumption', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return MaterialService.createConsumption(db, user, args.request || args);
    });
  });
}
