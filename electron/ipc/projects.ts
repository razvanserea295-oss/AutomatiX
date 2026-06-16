import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import {
  ProjectService,
  type CreateProjectRequest,
  type UpdateProjectRequest,
  type CreateClientRequest,
  type UpdateClientRequest,
} from '../services/projectService';
import { type Authed, type Cmd, payload } from '../commands/cmdArgs';


type AddCommentArgs = Parameters<typeof ProjectService.addComment>[1];

export function registerProjectHandlers(): void {
  ipcRegister<Authed>('get_projects', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return ProjectService.getAll(db, user);
    });
  });

  ipcRegister<Authed & { project_id: number }>('get_project', async (args) => {
    requirePositiveId(args.project_id, 'project_id');
    return withAuthenticatedUser(args.token, (db, user) => {
      return ProjectService.getById(db, args.project_id, user);
    });
  });

  ipcRegister<Cmd<CreateProjectRequest>>('create_project', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return ProjectService.create(db, payload(args), user);
    });
  });

  ipcRegister<Cmd<UpdateProjectRequest>>('update_project', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      
      return ProjectService.update(db, payload(args), user);
    });
  });

  ipcRegister<Authed & { project_id?: number; id?: number }>('delete_project', async (args) => {
    
    
    const projectId = Number(args.project_id ?? args.id);
    requirePositiveId(projectId, 'project_id');
    return withAuthenticatedUser(args.token, (db, user) => {
      return ProjectService.delete(db, projectId, user);
    });
  });

  ipcRegister<Authed>('get_project_stages', async (args) => {
    return withAuthenticatedUser(args.token, (db, _user) => {
      return ProjectService.getStages(db);
    });
  });

  ipcRegister<Authed>('get_clients', async (args) => {
    return withAuthenticatedUser(args.token, (db, _user) => {
      return ProjectService.getClients(db);
    });
  });

  ipcRegister<Cmd<CreateClientRequest>>('create_client', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return ProjectService.createClient(db, payload(args), user);
    });
  });

  ipcRegister<Cmd<UpdateClientRequest>>('update_client', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return ProjectService.updateClient(db, payload(args), user);
    });
  });

  ipcRegister<Authed & { id: number }>('delete_client', async (args) => {
    requirePositiveId(args.id, 'id');
    return withAuthenticatedUser(args.token, (db, user) => {
      return ProjectService.deleteClient(db, user, args.id);
    });
  });

  ipcRegister<Authed & { project_id: number }>('get_project_comments', async (args) => {
    requirePositiveId(args.project_id, 'project_id');
    return withAuthenticatedUser(args.token, (db, user) => {
      return ProjectService.getComments(db, args.project_id, user);
    });
  });

  ipcRegister<Authed & { request: AddCommentArgs }>('add_project_comment', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return ProjectService.addComment(db, args.request, user);
    });
  });

  ipcRegister<Authed & { project_id: number }>('get_project_history', async (args) => {
    requirePositiveId(args.project_id, 'project_id');
    return withAuthenticatedUser(args.token, (db, user) => {
      return ProjectService.getHistory(db, args.project_id, user);
    });
  });

  ipcRegister<Authed>('get_project_stats', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return ProjectService.getStats(db, user);
    });
  });

  ipcRegister<Authed & { project_id: number; stage_id: number }>('update_project_stage', async (args) => {
    requirePositiveId(args.project_id, 'project_id');
    requirePositiveId(args.stage_id, 'stage_id');
    return withAuthenticatedUser(args.token, (db, user) => {
      return ProjectService.updateStage(db, args.project_id, args.stage_id, user);
    });
  });
}
