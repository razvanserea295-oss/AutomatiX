import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import { OrderService } from '../services/orderService';

export function registerOrderHandlers(): void {
  ipcRegister('get_restaurant_orders', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => OrderService.getOrders(db));
  });

  ipcRegister('get_restaurant_order', async (args: any) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args?.token, (db, _user) => OrderService.getOrder(db, args.id));
  });

  ipcRegister('create_restaurant_order', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => OrderService.createOrder(db, user, args.request || args));
  });

  ipcRegister('update_restaurant_order_status', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      requirePositiveId(args?.id, 'id');
      return OrderService.updateOrderStatus(db, user, args.id, String(args.status || ''));
    });
  });

  ipcRegister('delete_restaurant_order', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      requirePositiveId(args?.id, 'id');
      return OrderService.deleteOrder(db, user, args.id);
    });
  });
}
