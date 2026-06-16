import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import { HandoffService } from '../services/handoffService';
import { AiHandoffService } from '../services/aiHandoffService';
import { BriefingService } from '../services/briefingService';
import { type Authed } from '../commands/cmdArgs';

export function registerHandoffHandlers(): void {
  
  ipcRegister<Authed>('get_my_handoffs', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => HandoffService.listForUser(db, user));
  });

  ipcRegister<Authed & { project_id: number }>('get_project_handoffs', async (args) => {
    requirePositiveId(args?.project_id, 'project_id');
    return withAuthenticatedUser(args.token, (db, _user) => HandoffService.listForProject(db, args.project_id));
  });

  ipcRegister<Authed & { id: number }>('get_handoff', async (args) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args.token, (db, _user) => HandoffService.getById(db, args.id));
  });

  ipcRegister<Authed & { id: number }>('accept_handoff', async (args) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args.token, (db, user) => HandoffService.accept(db, user, args.id));
  });

  ipcRegister<Authed & { id: number; reason: string }>('reject_handoff', async (args) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args.token, (db, user) => HandoffService.reject(db, user, args.id, args?.reason));
  });

  ipcRegister<Authed & { id: number; reason: string }>('force_handoff', async (args) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args.token, (db, user) => HandoffService.force(db, user, args.id, args?.reason));
  });

  ipcRegister<Authed & { id: number; urgent?: boolean }>('set_handoff_urgent', async (args) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args.token, (db, user) => HandoffService.setUrgent(db, user, args.id, !!args?.urgent));
  });

  ipcRegister<Authed>('escalate_overdue_handoffs', async (args) => {
    return withAuthenticatedUser(args.token, (db, _user) => HandoffService.escalateOverdue(db));
  });

  
  ipcRegister<Authed & { handoff_id: number }>('generate_handoff_ai_summary', async (args) => {
    requirePositiveId(args?.handoff_id, 'handoff_id');
    return withAuthenticatedUser(args.token, (db, user) => AiHandoffService.generateHandoffSummary(db, user, args.handoff_id));
  });

  ipcRegister<Authed>('detect_anomalies', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => AiHandoffService.detectAnomalies(db, user));
  });

  ipcRegister<Authed & { include_acknowledged?: boolean }>('get_anomalies', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => AiHandoffService.getAnomalies(db, user, !!args?.include_acknowledged));
  });

  ipcRegister<Authed & { id: number }>('acknowledge_anomaly', async (args) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args.token, (db, user) => { AiHandoffService.acknowledgeAnomaly(db, user, args.id); return { success: true }; });
  });

  
  ipcRegister<Authed>('get_my_briefing', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => BriefingService.getMyBriefing(db, user));
  });

  ipcRegister<Authed>('refresh_my_briefing', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => BriefingService.refreshMyBriefing(db, user));
  });
}
