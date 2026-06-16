import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { AnafService } from '../services/anafService';

export function registerAnafHandlers(): void {
  ipcRegister('anaf_lookup_cui', async (args: any) =>
    withAuthenticatedUser(args?.token, async (_db, _user) =>
      AnafService.lookup(args.cui),
    ),
  );
}
