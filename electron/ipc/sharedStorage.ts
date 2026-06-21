import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { SharedStoragePool, type CreateSharedFileRequest } from '../services/sharedStorageService';

export function registerSharedStorageHandlers(): void {
  // List all files in the shared storage pool (global access)
  ipcRegister('list_shared_files', async (args) => {
    return withAuthenticatedUser(args.token, (_db, _user) => {
      return SharedStoragePool.list(_db);
    });
  });

  // Get a specific file by ID
  ipcRegister('get_shared_file', async (args) => {
    const id = Number(args?.id ?? args?.request?.id);
    if (!Number.isFinite(id)) throw new Error('ID obligatoriu');
    return withAuthenticatedUser(args.token, (_db, _user) => {
      return SharedStoragePool.getById(_db, id);
    });
  });

  // Upload a file to the shared pool
  ipcRegister('upload_shared_file', async (args) => {
    const req = (args.request ?? args) as CreateSharedFileRequest;
    const userId = args?.user_id;
    if (!req.filename || !req.mime_type || !Number.isFinite(req.size_bytes)) {
      throw new Error('Date învalide pentru încărcarea fișierului');
    }
    return withAuthenticatedUser(args.token, (db, user) => {
      return SharedStoragePool.create(db, user.id, req.filename, req);
    });
  });

  // Delete a file from the shared pool
  ipcRegister('delete_shared_file', async (args) => {
    const id = Number(args?.id ?? args?.request?.id);
    if (!Number.isFinite(id)) throw new Error('ID obligatoriu');
    return withAuthenticatedUser(args.token, (db, user) => {
      return SharedStoragePool.delete(db, user.id, id);
    });
  });
}