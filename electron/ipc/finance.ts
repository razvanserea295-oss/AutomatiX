import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { FinanceService } from '../services/financeService';
import { type Authed, type Cmd, payload } from '../commands/cmdArgs';


type CreateComplianceTaskArgs = Parameters<typeof FinanceService.createComplianceTask>[2];
type UpdateComplianceTaskArgs = Parameters<typeof FinanceService.updateComplianceTask>[2];
type CreateProjectRevenueArgs = Parameters<typeof FinanceService.createRevenueEntry>[2];
type UpsertFinanceOverrideArgs = Parameters<typeof FinanceService.upsertOverride>[2];
type UpdateCompanySettingsArgs = Parameters<typeof FinanceService.updateCompanySettings>[2];
type CreateFinanceInvoiceArgs = Parameters<typeof FinanceService.createFinanceInvoice>[2];
type UpdateInvoiceStatusArgs = Parameters<typeof FinanceService.updateInvoiceStatus>[2];
type RecordInvoicePaymentArgs = Parameters<typeof FinanceService.recordInvoicePayment>[2];
type CreateProjectExpenseArgs = Parameters<typeof FinanceService.createProjectExpense>[2];

export function registerFinanceHandlers(): void {
  ipcRegister<Authed>('get_finance_overview', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.getOverview(db, user);
    });
  });

  ipcRegister<Authed>('get_finance_projects', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.getProjectFinance(db, user);
    });
  });

  ipcRegister<Authed>('get_finance_insights', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.getInsights(db, user);
    });
  });

  ipcRegister<Authed>('get_finance_compliance', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.getComplianceOverview(db, user);
    });
  });

  ipcRegister<Authed>('get_compliance_tasks', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.getComplianceTasks(db, user);
    });
  });

  ipcRegister<Cmd<CreateComplianceTaskArgs>>('create_compliance_task', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.createComplianceTask(db, user, payload(args));
    });
  });

  ipcRegister<Cmd<UpdateComplianceTaskArgs>>('update_compliance_task', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.updateComplianceTask(db, user, payload(args));
    });
  });

  ipcRegister<Authed>('get_project_revenues', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.getRevenueEntries(db, user);
    });
  });

  ipcRegister<Cmd<CreateProjectRevenueArgs>>('create_project_revenue', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.createRevenueEntry(db, user, payload(args));
    });
  });

  ipcRegister<Cmd<UpsertFinanceOverrideArgs>>('upsert_finance_override', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.upsertOverride(db, user, payload(args));
    });
  });

  
  
  ipcRegister<Cmd<{ project_id: number; final_cost: number }>>('set_project_final_cost', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.setFinalCost(db, user, payload(args));
    });
  });

  ipcRegister<Authed>('get_company_settings', async (args) => {
    return withAuthenticatedUser(args.token, (db) => {
      return FinanceService.getCompanySettings(db);
    });
  });

  ipcRegister<Cmd<UpdateCompanySettingsArgs>>('update_company_settings', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.updateCompanySettings(db, user, payload(args));
    });
  });

  
  ipcRegister<Authed & { project_id?: number | null }>('get_invoices', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.getInvoices(db, user, args?.project_id ?? null);
    });
  });

  ipcRegister<Authed & { invoice_id: number }>('get_finance_invoice', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.getInvoice(db, user, args?.invoice_id);
    });
  });

  ipcRegister<Cmd<CreateFinanceInvoiceArgs>>('create_finance_invoice', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.createFinanceInvoice(db, user, payload(args));
    });
  });

  ipcRegister<Cmd<UpdateInvoiceStatusArgs>>('update_invoice_status', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.updateInvoiceStatus(db, user, payload(args));
    });
  });

  ipcRegister<Cmd<RecordInvoicePaymentArgs>>('record_invoice_payment', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.recordInvoicePayment(db, user, payload(args));
    });
  });

  
  ipcRegister<Authed & { project_id?: number | null }>('get_project_expenses', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.getProjectExpenses(db, user, args?.project_id ?? null);
    });
  });

  ipcRegister<Cmd<CreateProjectExpenseArgs>>('create_project_expense', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return FinanceService.createProjectExpense(db, user, payload(args));
    });
  });

  
  ipcRegister<Authed & { report_type?: string; year?: number | null }>('get_profit_loss_report', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      const reportType: string = args?.report_type || 'monthly';
      const year: number | null = args?.year ?? null;
      return FinanceService.getProfitLossReport(db, user, reportType, year);
    });
  });
}
