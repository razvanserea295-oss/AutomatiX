import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import { PieceService } from '../services/pieceService';

export function registerPieceHandlers(): void {
  ipcRegister('get_project_stages_custom', async (args: any) => {
    requirePositiveId(args?.project_id, 'project_id');
    return withAuthenticatedUser(args?.token, (db, _user) => PieceService.getProjectStages(db, args.project_id));
  });

  ipcRegister('create_project_stage_custom', async (args: any) => {
    requirePositiveId(args?.request?.project_id, 'project_id');
    return withAuthenticatedUser(args?.token, (db, user) => PieceService.createProjectStage(db, user, args.request || args));
  });

  ipcRegister('update_project_stage_custom', async (args: any) => {
    requirePositiveId(args?.request?.id, 'id');
    return withAuthenticatedUser(args?.token, (db, user) => PieceService.updateProjectStage(db, user, args.request || args));
  });

  ipcRegister('get_project_pieces', async (args: any) => {
    requirePositiveId(args?.project_id, 'project_id');
    return withAuthenticatedUser(args?.token, (db, _user) => PieceService.getProjectPieces(db, args.project_id));
  });

  ipcRegister('delete_project_piece', async (args: any) => {
    const id = Number(args?.id ?? args?.request?.id);
    requirePositiveId(id, 'id');
    return withAuthenticatedUser(args?.token, (db, user) => {
      PieceService.deleteProjectPiece(db, user, id);
      return { ok: true };
    });
  });

  ipcRegister('create_project_piece', async (args: any) => {
    const req = args?.request ?? args;
    requirePositiveId(req?.project_id, 'project_id');
    requirePositiveId(req?.stage_id, 'stage_id');
    return withAuthenticatedUser(args?.token, (db, user) => PieceService.createProjectPiece(db, user, req));
  });

  ipcRegister('update_project_piece', async (args: any) => {
    const req = args?.request ?? args;
    requirePositiveId(req?.id, 'id');
    return withAuthenticatedUser(args?.token, (db, user) => PieceService.updateProjectPiece(db, user, req));
  });

  ipcRegister('bulk_import_project_pieces', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => PieceService.bulkImportProjectPieces(db, user, args.request || args));
  });

  ipcRegister('list_piece_material_requirements', async (args: any) => {
    requirePositiveId(args?.project_piece_id, 'project_piece_id');
    return withAuthenticatedUser(args?.token, (db, _user) => PieceService.listPieceMaterialRequirements(db, args.project_piece_id));
  });

  ipcRegister('create_piece_material_requirement', async (args: any) => {
    requirePositiveId(args?.request?.project_piece_id, 'project_piece_id');
    requirePositiveId(args?.request?.material_id, 'material_id');
    return withAuthenticatedUser(args?.token, (db, user) => PieceService.createPieceMaterialRequirement(db, user, args.request || args));
  });

  ipcRegister('delete_piece_material_requirement', async (args: any) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args?.token, (db, user) => PieceService.deletePieceMaterialRequirement(db, user, args.id));
  });
}
