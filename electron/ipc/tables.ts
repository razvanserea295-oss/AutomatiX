import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import { TableService } from '../services/tableService';

export function registerTableHandlers(): void {
  ipcRegister('get_restaurant_tables', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db) => TableService.getTables(db));
  });

  ipcRegister('get_restaurant_table', async (args: any) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args?.token, (db) => TableService.getTable(db, args.id));
  });

  ipcRegister('create_restaurant_table', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => TableService.createTable(db, user, args.request || args));
  });

  ipcRegister('update_restaurant_table', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => TableService.updateTable(db, user, args.request || args));
  });

  ipcRegister('delete_restaurant_table', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      requirePositiveId(args?.id, 'id');
      return TableService.deleteTable(db, user, args.id);
    });
  });

  ipcRegister('set_restaurant_table_status', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      requirePositiveId(args?.id, 'id');
      return TableService.setStatus(db, user, args.id, String(args.status || ''));
    });
  });
}
