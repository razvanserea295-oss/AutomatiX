import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { EngineeringService } from '../services/engineeringService';

export function registerEngineeringHandlers(): void {
  ipcRegister('get_engineering_tree', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => EngineeringService.getTree(db, args.project_id));
  });

  ipcRegister('create_engineering_node', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => EngineeringService.createNode(db, args.request || args));
  });

  ipcRegister('update_engineering_node', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => EngineeringService.updateNode(db, args.request || args));
  });

  ipcRegister('delete_engineering_node', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => EngineeringService.deleteNode(db, args.node_id));
  });

  ipcRegister('move_engineering_node', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => EngineeringService.moveNode(db, args.request || args));
  });

  ipcRegister('release_engineering_tree', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => EngineeringService.releaseTree(db, args.project_id));
  });

  ipcRegister('get_engineering_bom', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => EngineeringService.getBom(db, args.project_id));
  });

  ipcRegister('add_engineering_bom_item', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => EngineeringService.addBomItem(db, args.request || args));
  });

  ipcRegister('delete_engineering_bom_item', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => EngineeringService.deleteBomItem(db, args.bom_id));
  });

  ipcRegister('get_material_needs', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => EngineeringService.getMaterialNeeds(db, args.project_id));
  });
}
