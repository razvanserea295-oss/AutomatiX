import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { FisaTemplatesService } from '../services/fisaTemplatesService';

export function registerFisaTemplateHandlers(): void {
  ipcRegister('get_fisa_templates', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      FisaTemplatesService.list(db, user, !!args?.include_inactive),
    ),
  );

  ipcRegister('get_fisa_template', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      FisaTemplatesService.get(db, user, args?.id),
    ),
  );

  ipcRegister('create_fisa_template', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      FisaTemplatesService.create(db, user, args?.request || args),
    ),
  );

  ipcRegister('update_fisa_template', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      FisaTemplatesService.update(db, user, args?.request || args),
    ),
  );

  ipcRegister('delete_fisa_template', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      FisaTemplatesService.delete(db, user, args?.id),
    ),
  );

  ipcRegister('clone_fisa_template', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      FisaTemplatesService.clone(db, user, args?.id, args?.new_name),
    ),
  );
}
