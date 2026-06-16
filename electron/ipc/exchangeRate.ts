import { ipcRegister } from '../commands/registry';
import { withAdminUser, withAuthenticatedUser } from '../middleware/auth';
import { ExchangeRateService } from '../services/exchangeRateService';

export function registerExchangeRateHandlers(): void {
  
  
  
  ipcRegister('refresh_exchange_rate', async (args: any) =>
    withAdminUser(args?.token, (db) => ExchangeRateService.refreshRate(db)),
  );

  
  
  ipcRegister('get_bnr_rate_history', async (args: any) =>
    withAuthenticatedUser(args?.token, (db) =>
      ExchangeRateService.getHistory(db, { currency: args?.currency, limit: args?.limit }),
    ),
  );
}
