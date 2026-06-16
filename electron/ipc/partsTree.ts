import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { PartsTreeService } from '../services/partsTreeService';
import { saveDatabase } from '../db/connection';

export function registerPartsTreeHandlers(): void {
  ipcRegister('scan_parts_folder', async (args: any) => {
    return withAuthenticatedUser(args?.token, () => {
      return PartsTreeService.scanFolder(args.folder_path);
    });
  });

  ipcRegister('get_project_parts_tree', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db) => {
      return PartsTreeService.getProjectTree(db, args.project_id);
    });
  });

  ipcRegister('import_scanned_parts', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db) => {
      PartsTreeService.importScanned(db, args.project_id, args.tree);
      saveDatabase();
    });
  });

  ipcRegister('delete_parts_tree_node', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db) => {
      PartsTreeService.deleteNode(db, args.piece_id);
      saveDatabase();
    });
  });

  
  
  
  
  
  
  
  
  
  ipcRegister('wipe_project_parts_tree', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db) => {
      const result = PartsTreeService.wipeScanned(db, Number(args?.project_id));
      saveDatabase();
      return result;
    });
  });
}
