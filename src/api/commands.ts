




import { logger } from '@/core/logger';
import { CommandError, AppError } from '@/core/types';
import { STORAGE_KEYS, getStorage } from '@/config/localStorage';
import { getServerUrl } from '@/config/server';
import { notifySessionExpired } from '@/store/sessionEvents';
import { isElectronRuntime, isTauriRuntime } from '@/lib/runtime';





export const ElectronEnvironment = {
  isElectron: isElectronRuntime,
};


export const TauriEnvironment = {
  isTauri: isTauriRuntime,
};





export function extractCommandError(err: unknown): CommandError | null {
  if (err == null || typeof err !== 'object') return null;

  const o = err as Record<string, unknown>;

  if (typeof o.code === 'number' && typeof o.message === 'string') {
    return { code: o.code, message: o.message };
  }

  if (typeof o.message === 'string') {
    try {
      const parsed = JSON.parse(o.message) as Record<string, unknown>;
      if (typeof parsed.code === 'number' && typeof parsed.message === 'string') {
        return { code: parsed.code, message: parsed.message };
      }
    } catch {
      
    }
  }

  return null;
}





function getRequestContext(): { token: string } {
  const token = getStorage(STORAGE_KEYS.TOKEN);
  if (!token) {
    logger.warn('No authentication token found');
  }
  return { token };
}









const REQUEST_WRAPPED_COMMANDS = new Set([
  'create_project', 'update_project',
  'create_client', 'update_client',
  'create_material', 'update_material',
  'create_document', 'update_document',
  'create_document_category', 'update_document_category',
  'create_alert',
  'create_supplier', 'update_supplier',
  'create_purchase_order',
  'receive_purchase_line',
  'create_finance_invoice', 'update_invoice_status', 'record_invoice_payment',
  'create_project_expense', 'update_project_expense',
  'create_project_revenue',
  'upsert_finance_override',
  'create_compliance_task', 'update_compliance_task',
  'update_company_settings',
  'create_contract', 'update_contract',
  'create_engineering_node', 'update_engineering_node',
  'add_engineering_bom_item',
  'create_standard_part', 'update_standard_part',
  'create_custom_part',
  'create_project_piece', 'update_project_piece',
  'create_piece_material_requirement',
  'create_station', 'update_station',
  'create_intervention',
  'create_station_maintenance_plan', 'create_station_parts_request', 'create_station_change_request',
  'create_sales_lead', 'update_sales_lead', 'convert_sales_lead',
  'add_sales_lead_note',
  'create_deplasare', 'update_deplasare',
  'create_finance_invoice', 'update_invoice_status', 'record_invoice_payment',
  'create_checklist', 'update_checklist',
  'create_bon_consum', 'create_aviz', 'create_invoice',
  'record_stock_movement', 'create_stock_reservation',
  'create_user', 'update_user', 'delete_user',
  'update_workspace_profile',
  'email_save_account', 'email_send', 'email_save_draft',
  'send_chat_message',
  'create_moderation_report',
  'create_warehouse_location',
  'create_material_consumption',
  'create_personal_calendar_event', 'update_personal_calendar_event',
  'create_project_briefing', 'update_project_briefing', 'update_project_briefing_status',
  'ask_briefing_clarification', 'answer_briefing_clarification',
  'create_fisa_template', 'update_fisa_template',
]);

function wrapIfNeeded(command: string, body?: Record<string, unknown>): Record<string, unknown> {
  if (!body || !REQUEST_WRAPPED_COMMANDS.has(command)) return body ?? {};
  
  if ('request' in body) return body;
  return { request: body };
}






export async function apiCommand<T>(
  command: string,
  requestBody?: Record<string, unknown>
): Promise<T> {
  const serverUrl = getServerUrl();

  
  if (serverUrl) {
    const token = getStorage(STORAGE_KEYS.TOKEN);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const wrappedBody = wrapIfNeeded(command, requestBody);

    try {
      const res = await fetch(`${serverUrl}/api/cmd/${command}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(wrappedBody),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ code: res.status, message: res.statusText }));
        const cmdError: CommandError = {
          code: errBody.code ?? res.status,
          message: errBody.message ?? res.statusText,
        };
        
        if (res.status === 401 && command !== 'login') {
          notifySessionExpired();
        }
        throw AppError.fromCommand(cmdError);
      }

      const result = await res.json() as T;
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const appError = AppError.fromUnknown(error, `Server command "${command}" failed`);
      logger.error(`HTTP error: ${command}`, appError);
      throw appError;
    }
  }

  
  if (!ElectronEnvironment.isElectron()) {
    const msg = `Command "${command}" requires Electron desktop environment or server connection`;
    logger.error(msg, new Error(msg));
    throw new AppError(msg, 400);
  }

  const context = getRequestContext();
  const wrappedIpc = wrapIfNeeded(command, requestBody);
  const args = { ...context, ...wrappedIpc };

  try {
    const result = await window.electron.invoke(command, args) as T;
    return result;
  } catch (error) {
    const cmdError = extractCommandError(error);

    if (cmdError) {
      const appError = AppError.fromCommand(cmdError);
      logger.error(`Command failed: ${command}`, appError, { originalError: error });
      throw appError;
    }

    const appError = AppError.fromUnknown(
      error,
      `Command "${command}" failed unexpectedly`
    );
    logger.error(`Command error: ${command}`, appError, { originalError: error });
    throw appError;
  }
}





export async function trackApiCall<T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  return logger.trackAsync(operationName, fn);
}





export function isSessionExpired(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code === 401;
  }
  return false;
}





export type { CommandError } from '@/core/types';
