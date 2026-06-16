import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { CalendarService } from '../services/calendarService';

export function registerCalendarHandlers(): void {
  ipcRegister('get_calendar_events', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      CalendarService.getEvents(db, user, { from: args.from, to: args.to, types: args.types }),
    ),
  );

  ipcRegister('reschedule_calendar_event', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      CalendarService.reschedule(db, user, args.event_id, args.new_date),
    ),
  );

  ipcRegister('build_calendar_ical', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => ({
      ical: CalendarService.buildICal(db, user, { from: args.from, to: args.to, types: args.types }),
    })),
  );

  
  ipcRegister('create_personal_calendar_event', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      CalendarService.createPersonal(db, user, args?.request || args),
    ),
  );

  ipcRegister('update_personal_calendar_event', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      CalendarService.updatePersonal(db, user, args?.request || args),
    ),
  );

  ipcRegister('delete_personal_calendar_event', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      CalendarService.deletePersonal(db, user, args?.id),
    ),
  );
}
