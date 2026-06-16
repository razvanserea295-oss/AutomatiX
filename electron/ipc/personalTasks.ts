import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { PersonalTasksService } from '../services/personalTasksService';
import { type Authed, type Cmd, payload } from '../commands/cmdArgs';


type CreateTaskArgs = Parameters<typeof PersonalTasksService.create>[2];
type UpdateTaskArgs = Parameters<typeof PersonalTasksService.update>[2];
type AssignTaskArgs = Parameters<typeof PersonalTasksService.assignTo>[2];
type RequestClarificationArgs = Parameters<typeof PersonalTasksService.requestClarification>[2];
type ReopenTaskArgs = Parameters<typeof PersonalTasksService.reopen>[2];

export function registerPersonalTasksHandlers(): void {
  ipcRegister<Authed & { include_done?: boolean }>('list_personal_tasks', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      PersonalTasksService.list(db, user, args?.include_done),
    ),
  );

  ipcRegister<Authed & { id: number }>('get_personal_task', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      PersonalTasksService.getById(db, user, args.id),
    ),
  );

  ipcRegister<Cmd<CreateTaskArgs>>('create_personal_task', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      PersonalTasksService.create(db, user, payload(args)),
    ),
  );

  ipcRegister<Cmd<UpdateTaskArgs>>('update_personal_task', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      PersonalTasksService.update(db, user, payload(args)),
    ),
  );

  ipcRegister<Authed & { id: number }>('delete_personal_task', async (args) =>
    withAuthenticatedUser(args.token, (db, user) => {
      PersonalTasksService.delete(db, user, args.id);
      return { ok: true };
    }),
  );

  ipcRegister<Cmd<AssignTaskArgs>>('assign_task_to_user', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      PersonalTasksService.assignTo(db, user, payload(args)),
    ),
  );

  ipcRegister<Authed & { include_done?: boolean }>('list_tasks_assigned_by_me', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      PersonalTasksService.listAssignedByMe(db, user, args?.include_done),
    ),
  );

  ipcRegister<Cmd<RequestClarificationArgs>>('request_task_clarification', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      PersonalTasksService.requestClarification(db, user, payload(args)),
    ),
  );

  ipcRegister<Cmd<ReopenTaskArgs>>('reopen_personal_task', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      PersonalTasksService.reopen(db, user, payload(args)),
    ),
  );

  
  
  ipcRegister<Authed>('list_assignable_users', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      PersonalTasksService.listAssignableUsers(db, user),
    ),
  );

  ipcRegister<Authed & { only_unread?: boolean }>('list_mentions', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      PersonalTasksService.listMentions(db, user, args?.only_unread),
    ),
  );

  ipcRegister<Authed & { mention_id: number }>('mark_mention_read', async (args) =>
    withAuthenticatedUser(args.token, (db, user) => {
      PersonalTasksService.markMentionRead(db, user, args.mention_id);
      return { ok: true };
    }),
  );

  ipcRegister<Authed>('mark_all_mentions_read', async (args) =>
    withAuthenticatedUser(args.token, (db, user) => {
      PersonalTasksService.markAllMentionsRead(db, user);
      return { ok: true };
    }),
  );

  ipcRegister<Authed>('get_unread_mention_count', async (args) =>
    withAuthenticatedUser(args.token, (db, user) => ({
      count: PersonalTasksService.unreadMentionCount(db, user),
    })),
  );
}
