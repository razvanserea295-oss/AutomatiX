import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { WarehouseService } from '../services/warehouseService';

export function registerWarehouseHandlers(): void {
  ipcRegister('get_warehouse_locations', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => WarehouseService.getLocations(db));
  });

  ipcRegister('create_warehouse_location', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => WarehouseService.createLocation(db, args.request || args));
  });

  ipcRegister('get_stock_movements', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => WarehouseService.getMovements(db, args?.material_id));
  });

  ipcRegister('record_stock_movement', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => WarehouseService.recordMovement(db, user, args.request || args));
  });

  ipcRegister('get_stock_reservations', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => WarehouseService.getReservations(db, args?.project_id));
  });

  ipcRegister('create_stock_reservation', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => WarehouseService.createReservation(db, args.request || args));
  });

  ipcRegister('issue_stock_reservation', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return WarehouseService.issueReserved(db, user, args.reservation_id, args.quantity);
    });
  });
}
