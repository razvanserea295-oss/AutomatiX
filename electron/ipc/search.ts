import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { SearchService } from '../services/searchService';

export function registerSearchHandlers(): void {
  ipcRegister('global_search', async (args: any) => {
    const query: string = String(args?.query || '').trim();
    const limit: number = Math.max(1, Math.min(50, Number(args?.limit) || 10));
    return withAuthenticatedUser(args?.token, (db) => SearchService.search(db, query, limit));
  });
}
