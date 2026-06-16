import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { ProjectBriefingService } from '../services/projectBriefingService';

export function registerProjectBriefingHandlers(): void {
  ipcRegister('get_project_briefings', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ProjectBriefingService.list(db, user, args?.mode || 'inbox', args?.status),
    ),
  );

  ipcRegister('get_project_briefing', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ProjectBriefingService.get(db, user, args?.id),
    ),
  );

  ipcRegister('create_project_briefing', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ProjectBriefingService.create(db, user, args?.request || args),
    ),
  );

  ipcRegister('update_project_briefing', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ProjectBriefingService.update(db, user, args?.request || args),
    ),
  );

  ipcRegister('update_project_briefing_status', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ProjectBriefingService.updateStatus(db, user, args?.request || args),
    ),
  );

  ipcRegister('list_briefing_clarifications', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ProjectBriefingService.listClarifications(db, user, args?.briefing_id),
    ),
  );

  ipcRegister('ask_briefing_clarification', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ProjectBriefingService.askClarification(db, user, args?.request || args),
    ),
  );

  ipcRegister('answer_briefing_clarification', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ProjectBriefingService.answerClarification(db, user, args?.request || args),
    ),
  );

  ipcRegister('reopen_briefing_clarification', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ProjectBriefingService.reopenClarification(db, user, args?.id),
    ),
  );

  
  
  
  ipcRegister('delete_project_briefing', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ProjectBriefingService.delete(db, user, Number(args?.id ?? args?.briefing_id)),
    ),
  );

  
  ipcRegister('list_briefing_attachments', async (args: any) =>
    withAuthenticatedUser(args?.token, (db) =>
      ProjectBriefingService.listAttachments(db, Number(args?.briefing_id)),
    ),
  );

  ipcRegister('add_briefing_attachment', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ProjectBriefingService.addAttachment(db, user, args?.request || args),
    ),
  );

  ipcRegister('get_briefing_attachment', async (args: any) =>
    withAuthenticatedUser(args?.token, (db) =>
      ProjectBriefingService.getAttachment(db, Number(args?.id)),
    ),
  );

  ipcRegister('update_briefing_attachment_note', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ProjectBriefingService.updateAttachmentNote(db, user, Number(args?.id), args?.annotation ?? null),
    ),
  );

  ipcRegister('delete_briefing_attachment', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ProjectBriefingService.deleteAttachment(db, user, Number(args?.id)),
    ),
  );
}
