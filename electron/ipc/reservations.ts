import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import { ReservationService } from '../services/reservationService';

export function registerReservationHandlers(): void {
  ipcRegister('get_reservations', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db) => ReservationService.getReservations(db));
  });

  ipcRegister('get_reservation', async (args: any) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args?.token, (db) => ReservationService.getReservation(db, args.id));
  });

  ipcRegister('create_reservation', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => ReservationService.createReservation(db, user, args.request || args));
  });

  ipcRegister('update_reservation', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => ReservationService.updateReservation(db, user, args.request || args));
  });

  ipcRegister('delete_reservation', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      requirePositiveId(args?.id, 'id');
      return ReservationService.deleteReservation(db, user, args.id);
    });
  });

  ipcRegister('set_reservation_status', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      requirePositiveId(args?.id, 'id');
      return ReservationService.setStatus(db, user, args.id, String(args.status || ''));
    });
  });
}
