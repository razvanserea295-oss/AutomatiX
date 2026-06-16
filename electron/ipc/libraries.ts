import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { LibraryService } from '../services/libraryService';

export function registerLibraryHandlers(): void {
  ipcRegister('get_standard_parts', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => LibraryService.getStandardParts(db, args?.category));
  });

  ipcRegister('create_standard_part', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => LibraryService.createStandardPart(db, args.request || args));
  });

  ipcRegister('update_standard_part', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => LibraryService.updateStandardPart(db, args.request || args));
  });

  ipcRegister('delete_standard_part', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => LibraryService.deleteStandardPart(db, args.id));
  });

  ipcRegister('get_custom_parts', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => LibraryService.getCustomParts(db, args?.project_id));
  });

  ipcRegister('create_custom_part', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => LibraryService.createCustomPart(db, args.request || args));
  });

  ipcRegister('update_custom_part', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => LibraryService.updateCustomPart(db, args.request || args));
  });

  ipcRegister('delete_custom_part', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => LibraryService.deleteCustomPart(db, args.id));
  });

  ipcRegister('promote_to_standard', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => LibraryService.promoteToStandard(db, args.custom_id));
  });
}
