











import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, withAdminUser } from '../middleware/auth';
import { DemoSeedService } from '../services/demoSeedService';

export function registerDemoSeedHandlers(): void {
  ipcRegister('get_demo_step6_status', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => DemoSeedService.status(db, user)),
  );

  // Destructive demo seeding/clearing — RBAC enforced at the IPC boundary
  // (withAdminUser) rather than only inside the service.
  ipcRegister('seed_demo_step6', async (args: any) =>
    withAdminUser(args?.token, async (db, user) =>
      DemoSeedService.seedStep6Demo(db, user),
    ),
  );

  ipcRegister('clear_demo_step6', async (args: any) =>
    withAdminUser(args?.token, (db, user) => DemoSeedService.clearStep6Demo(db, user)),
  );
}
