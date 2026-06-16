import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, withAdminUser, requirePositiveId } from '../middleware/auth';
import { UserService } from '../services/userService';
import { logAudit } from '../db/audit';

export function registerUserHandlers(): void {
  ipcRegister('get_users', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => UserService.getAll(db, user));
  });

  ipcRegister('get_user', async (args: any) => {
    requirePositiveId(args?.user_id, 'user_id');
    return withAuthenticatedUser(args?.token, (db, user) => UserService.getById(db, args.user_id, user));
  });

  
  
  
  
  ipcRegister('create_user', async (args: any) => {
    return withAdminUser(args?.token, (db, actor) => {
      const result = UserService.create(db, args.request, actor);
      const resultId = (result as { id?: number })?.id;
      logAudit({ userId: actor.id, username: actor.username }, 'create', 'user', resultId, null, args.request);
      return result;
    });
  });

  ipcRegister('update_user', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, actor) => {
      const requestId = (args.request as { id?: number })?.id;
      const before = requestId ? UserService.getById(db, requestId, actor) : null;
      const result = UserService.update(db, args.request, actor);
      logAudit(
        { userId: actor.id, username: actor.username },
        'update',
        'user',
        requestId,
        before as Record<string, unknown> | null,
        args.request,
      );
      return result;
    });
  });

  
  
  ipcRegister('delete_user', async (args: any) => {
    return withAdminUser(args?.token, (db, actor) => {
      const id = args.request?.id;
      const before = id ? UserService.getById(db, id, actor) : null;
      const result = UserService.delete(db, id, actor);
      logAudit({ userId: actor.id, username: actor.username }, 'delete', 'user', id, before as Record<string, unknown> | null, null);
      return result;
    });
  });

  ipcRegister('get_roles', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => UserService.getRoles(db));
  });

  ipcRegister('update_user_pages', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      UserService.updateUserPages(db, user, args.user_id, args.pages);
    });
  });

  ipcRegister('update_user_dashboard_config', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      UserService.updateUserDashboardConfig(db, user, args.user_id, args.config);
    });
  });
}
