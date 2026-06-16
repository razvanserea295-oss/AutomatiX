import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { AiService } from '../services/aiService';

export function registerAiHandlers(): void {
  ipcRegister('ai_ask', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      const req = args.request || args;
      return AiService.ask(db, user, req.question);
    });
  });

  ipcRegister('ai_search_documents', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      const req = args.request || args;
      return AiService.searchDocuments(db, user, req.query ?? args?.query);
    });
  });
}
