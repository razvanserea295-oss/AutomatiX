import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import { MenuService } from '../services/menuService';

export function registerMenuHandlers(): void {
  ipcRegister('get_menu_items', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => MenuService.getMenuItems(db));
  });

  ipcRegister('get_menu_item', async (args: any) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args?.token, (db, _user) => MenuService.getMenuItem(db, args.id));
  });

  ipcRegister('create_menu_item', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => MenuService.createMenuItem(db, user, args.request || args));
  });

  ipcRegister('update_menu_item', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => MenuService.updateMenuItem(db, user, args.request || args));
  });

  ipcRegister('delete_menu_item', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      requirePositiveId(args?.id, 'id');
      return MenuService.deleteMenuItem(db, user, args.id);
    });
  });

  ipcRegister('set_menu_item_availability', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      requirePositiveId(args?.id, 'id');
      return MenuService.setAvailability(db, user, args.id, !!args.available);
    });
  });
}
