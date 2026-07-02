

let ipcMain: any = undefined;
try {
  const _e = require('electron');
  if (_e && typeof _e === 'object') { ipcMain = _e.ipcMain; }
} catch {  }







import { registerAuthHandlers } from './auth';
import { registerDashboardHandlers } from './dashboard';
import { registerProjectHandlers } from './projects';
import { registerSharedStorageHandlers } from './sharedStorage';
import { registerMaterialHandlers } from './materials';
import { registerMenuHandlers } from './menu';
import { registerOrderHandlers } from './orders';
import { registerRecipeHandlers } from './recipes';
import { registerReservationHandlers } from './reservations';
import { registerTableHandlers } from './tables';
import { registerFinanceHandlers } from './finance';
import { registerExchangeRateHandlers } from './exchangeRate';
import { registerChatHandlers } from './chat';
import { registerSalesHandlers } from './sales';
import { registerProductionHandlers } from './production';
import { registerProcurementHandlers } from './procurement';
import { registerAlertHandlers } from './alerts';
import { registerDocumentHandlers } from './documents';
import { registerUserHandlers } from './users';
import { registerStationHandlers } from './stations';
import { registerWarehouseHandlers } from './warehouse';
import { registerContractHandlers } from './contracts';
import { registerEngineeringHandlers } from './engineering';
import { registerDeplasariHandlers } from './deplasari';
import { registerChecklistHandlers } from './checklist';
import { registerLibraryHandlers } from './libraries';
import { registerPieceHandlers } from './pieces';
import { registerProductionDocsHandlers } from './productionDocs';
import { registerWorkspaceHandlers } from './workspace';
import { registerSystemHandlers } from './system';
import { registerPartsTreeHandlers } from './partsTree';
import { registerSupplierCodeHandlers } from './supplierCodes';
import { registerPiecesOrderingHandlers } from './piecesOrdering';
import { registerProjectBriefingHandlers } from './projectBriefings';
import { registerFisaTemplateHandlers } from './fisaTemplates';
import { registerEmailHandlers } from './email';
import { registerAiHandlers } from './ai';
import { registerBomImportHandlers } from './bomImport';
import { registerServerControlHandlers } from './serverControl';
import { registerTipPieseHandlers } from './tipPiese';
import { registerSearchHandlers } from './search';
import { registerMaintenanceHandlers } from './maintenance';
import { registerAppMaintenanceHandlers } from './appMaintenance';
import { registerHandoffHandlers } from './handoffs';
import { registerPdfHandlers } from './pdf';
import { registerQuotationHandlers } from './quotations';
import { registerCalendarHandlers } from './calendar';
import { registerTimeTrackingHandlers } from './timeTracking';
import { registerServiceTicketHandlers } from './serviceTickets';
import { registerPortalHandlers } from './portal';
import { registerThreeWayMatchHandlers } from './threeWayMatch';
import { registerRfqHandlers } from './rfq';
import { registerNotificationPrefsHandlers } from './notificationPrefs';
import { registerNotificationsHandlers } from './notifications';
import { registerDemoSeedHandlers } from './demoSeed';
import { registerAnafHandlers } from './anaf';
import { registerSignatureHandlers } from './signatures';
import { registerReportsHandlers } from './reports';
import { registerPersonalTasksHandlers } from './personalTasks';
import { registerGoodsReceiptHandlers } from './goodsReceipts';
import { registerUserSessionsHandlers } from './userSessions';
import { registerBroadcastHandlers } from './broadcasts';
import { registerActivityLogHandlers } from './activityLog';
import { registerSetupHandlers } from './setup';
import { registerPdfExportHandlers } from './pdfExport';
import { registerPrintingHandlers } from './printing';
import { registerRemoteSupportHandlers } from './remoteSupport';










const REGISTRARS: ReadonlyArray<[string, () => void]> = [
  
  ['system', registerSystemHandlers],
  
  ['auth', registerAuthHandlers],
  ['dashboard', registerDashboardHandlers],
  ['users', registerUserHandlers],
  ['workspace', registerWorkspaceHandlers],
  
  ['projects', registerProjectHandlers],
  ['production', registerProductionHandlers],
  ['pieces', registerPieceHandlers],
  ['productionDocs', registerProductionDocsHandlers],
  
  ['materials', registerMaterialHandlers],
  ['menu', registerMenuHandlers],
  ['orders', registerOrderHandlers],
  ['recipes', registerRecipeHandlers],
  ['reservations', registerReservationHandlers],
  ['tables', registerTableHandlers],
  ['procurement', registerProcurementHandlers],
  ['warehouse', registerWarehouseHandlers],
  
  ['finance', registerFinanceHandlers],
  ['exchangeRate', registerExchangeRateHandlers],
  ['appMaintenance', registerAppMaintenanceHandlers],
  ['documents', registerDocumentHandlers],
  ['contracts', registerContractHandlers],
  
  ['chat', registerChatHandlers],
  ['email', registerEmailHandlers],
  ['alerts', registerAlertHandlers],
  
  ['partsTree', registerPartsTreeHandlers],
  ['supplierCodes', registerSupplierCodeHandlers],
  ['piecesOrdering', registerPiecesOrderingHandlers],
  ['projectBriefings', registerProjectBriefingHandlers],
  ['fisaTemplates', registerFisaTemplateHandlers],
  ['stations', registerStationHandlers],
  ['engineering', registerEngineeringHandlers],
  ['libraries', registerLibraryHandlers],
  ['sales', registerSalesHandlers],
  ['deplasari', registerDeplasariHandlers],
  ['checklist', registerChecklistHandlers],
  ['ai', registerAiHandlers],
  ['bomImport', registerBomImportHandlers],
  ['serverControl', registerServerControlHandlers],
  ['tipPiese', registerTipPieseHandlers],
  ['search', registerSearchHandlers],
  ['maintenance', registerMaintenanceHandlers],
  ['handoffs', registerHandoffHandlers],
  ['pdf', registerPdfHandlers],
  ['quotations', registerQuotationHandlers],
  ['calendar', registerCalendarHandlers],
  ['timeTracking', registerTimeTrackingHandlers],
  ['serviceTickets', registerServiceTicketHandlers],
  ['portal', registerPortalHandlers],
  ['threeWayMatch', registerThreeWayMatchHandlers],
  ['rfq', registerRfqHandlers],
  ['notificationPrefs', registerNotificationPrefsHandlers],
  ['notifications', registerNotificationsHandlers],
  ['demoSeed', registerDemoSeedHandlers],
  ['anaf', registerAnafHandlers],
  ['signatures', registerSignatureHandlers],
  ['reports', registerReportsHandlers],
  ['personalTasks', registerPersonalTasksHandlers],
  ['goodsReceipts', registerGoodsReceiptHandlers],
  ['userSessions', registerUserSessionsHandlers],
  ['broadcasts', registerBroadcastHandlers],
  ['activityLog', registerActivityLogHandlers],
  ['setup', registerSetupHandlers],
  ['pdfExport', registerPdfExportHandlers],
  ['printing', registerPrintingHandlers],
  ['sharedStorage', registerSharedStorageHandlers],
  ['remoteSupport', registerRemoteSupportHandlers],
];

export function registerAllHandlers(): void {
  
  
  
  
  const failed: string[] = [];
  for (const [label, fn] of REGISTRARS) {
    try {
      fn();
    } catch (e) {
      failed.push(label);
      console.error(`[ipc] registrar '${label}' FAILED — its commands are NOT registered:`, e);
    }
  }

  if (failed.length > 0) {
    console.error(
      `[ipc] Handler registration completed WITH ERRORS — ${failed.length} module(s) failed: ${failed.join(', ')}. ` +
      `Commands from these modules will return "No handler registered". Fix the module(s) above and restart.`,
    );
  } else {
    console.log('[ipc] Handler registration complete');
  }
}
