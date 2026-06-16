import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import { DocumentService } from '../services/documentService';

export function registerDocumentHandlers(): void {
  ipcRegister('get_documents', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => DocumentService.getAll(db, user));
  });

  ipcRegister('get_document_file', async (args: any) => {
    requirePositiveId(args?.id, 'id');
    
    
    return withAuthenticatedUser(args?.token, (db, user) => {
      DocumentService.getById(db, user, args.id);
      return DocumentService.getFileData(db, args.id);
    });
  });

  ipcRegister('get_project_documents', async (args: any) => {
    requirePositiveId(args?.project_id, 'project_id');
    return withAuthenticatedUser(args?.token, (db, user) => DocumentService.getByProject(db, user, args.project_id));
  });

  ipcRegister('create_document', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => DocumentService.create(db, args.request, user));
  });

  ipcRegister('update_document', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => DocumentService.update(db, args.request, user));
  });

  ipcRegister('delete_document', async (args: any) => {
    requirePositiveId(args?.document_id, 'document_id');
    return withAuthenticatedUser(args?.token, (db, user) => DocumentService.delete(db, args.document_id, user));
  });

  ipcRegister('get_document_categories', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => DocumentService.getCategories(db));
  });

  ipcRegister('create_document_category', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => DocumentService.createCategory(db, args.request, user));
  });

  ipcRegister('update_document_category', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => DocumentService.updateCategory(db, args.request, user));
  });

  ipcRegister('update_document_categories_order', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => DocumentService.updateCategoriesOrder(db, user, args?.ids ?? []));
  });
}
