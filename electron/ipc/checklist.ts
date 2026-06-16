import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { ChecklistService } from '../services/checklistService';

export function registerChecklistHandlers(): void {
  ipcRegister('get_checklists', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => ChecklistService.getAll(db, user));
  });

  ipcRegister('get_checklist_by_project', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => ChecklistService.getByProject(db, args.project_id));
  });

  ipcRegister('create_checklist', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => ChecklistService.create(db, user, args.request || args));
  });

  ipcRegister('update_checklist', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => ChecklistService.update(db, user, args.request || args));
  });
}
