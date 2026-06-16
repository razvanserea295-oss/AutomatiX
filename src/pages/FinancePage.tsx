import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Percent, Loader2, Plus,
  FileText, Receipt, BarChart3, ChevronDown, CreditCard, Check, X,
  AlertTriangle, Download,
} from 'lucide-react';
import { downloadInvoicePdf } from '@/lib/downloadPdf';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { useProjectStore } from '@/store/projectStore';
import { useClientStore } from '@/store/clientStore';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
import { useMoney, useEurRate } from '@/store/settingsStore';
import { toast } from '@/store/toastStore';
import { nativeNotify } from '@/lib/nativeNotify';
import StatusBadge from '@/components/ui/StatusBadge';
import { invoiceStatus } from '@/lib/statusTokens';
import SortableTh from '@/components/ui/SortableTh';
import { useSort } from '@/hooks/useSort';
import Button from '@/components/ui/Button';
import { HeroHeader, GlassCard, MetricValue, AnimatedTabs } from '@/components/ui';
import { filterSelectCls } from '@/components/ui/filterControls';





interface FinanceOverview {
  projects_count: number;
  total_estimated_revenue: number;
  total_actual_revenue: number;
  total_estimated_cost: number;
  total_actual_cost: number;
  total_estimated_profit: number;
  total_actual_profit: number;
  avg_margin_percent: number;
  projects_at_risk: number;
}

interface ProjectFinanceRow {
  project_id: number;
  project_name: string;
  status: string;
  estimated_revenue: number;
  actual_revenue: number;
  total_cost: number;
  actual_profit: number;
  margin_percent: number;
  risk_level: string;
  
  
  is_finalized: boolean;
}

interface Invoice {
  id: number;
  invoice_number: string;
  project_name: string;
  client_name: string;
  type: string;
  status: string;
  currency: string;
  total: number;
  paid_amount: number;
  remaining: number;
  issue_date: string;
  due_date: string;
}

interface ProjectExpense {
  id: number;
  project_name: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
}

interface ProfitLossReport {
  period: string;
  total_revenue: number;
  total_invoiced: number;
  total_expenses: number;
  gross_profit: number;
  margin_percent: number;
}





const categoryLabels: Record<string, string> = {
  manopera: 'Manopera',
  transport: 'Transport',
  subcontractori: 'Subcontractori',
  utilitati: 'Utilitati',
  inchirieri_utilaje: 'Inchirieri utilaje',
  deplasari: 'Deplasari',
  diurna: 'Diurnă',
  materiale_directe: 'Materiale directe',
  consumabile: 'Consumabile',
  proiectare: 'Proiectare',
  altele: 'Altele',
};

type Tab = 'overview' | 'invoices' | 'expenses' | 'reports';





export default function FinancePage({ user: _user }: { user: User | null }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  
  
  
  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: 'overview', label: 'Prezentare', icon: DollarSign },
    { id: 'invoices', label: 'Facturi', icon: FileText },
    { id: 'expenses', label: 'Cheltuieli', icon: Receipt },
    { id: 'reports', label: 'Rapoarte', icon: BarChart3 },
  ];

  return (
    <div className="mod-shell flex flex-1 flex-col overflow-hidden">
      {}
      <div className="px-5 pt-4 pb-3 space-y-4 shrink-0">
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Financiar & Livrare"
          icon={DollarSign}
          title="Financiar"
          subtitle="Venituri, costuri, facturi, cheltuieli și rapoarte de profitabilitate"
          actions={
            <AnimatedTabs
              active={tab}
              onChange={(id) => setTab(id as Tab)}
              tabs={tabs.map(t => ({ id: t.id, label: t.label, icon: t.icon }))}
            />
          }
        />
      </div>

      {}
      <div className="flex-1 min-h-0 overflow-y-auto enter-up" style={{ animationDelay: '120ms' }}>
        {tab === 'overview' && <OverviewTab key={refreshKey} />}
        {tab === 'invoices' && <InvoicesTab onDataChange={() => setRefreshKey(k => k + 1)} />}
        {tab === 'expenses' && <ExpensesTab onDataChange={() => setRefreshKey(k => k + 1)} />}
        {tab === 'reports' && <ReportsTab key={refreshKey} />}
      </div>
    </div>
  );
}





function OverviewTab() {
  const money = useMoney();
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [projects, setProjects] = useState<ProjectFinanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  
  const [costEdit, setCostEdit] = useState<{ id: number; name: string; value: string } | null>(null);
  const [savingCost, setSavingCost] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiCommand<FinanceOverview>('get_finance_overview'),
      apiCommand<ProjectFinanceRow[]>('get_finance_projects'),
    ]).then(([ov, prj]) => {
      setOverview(ov);
      setProjects(prj || []);
    }).catch(() => {
      setOverview(null);
      setProjects([]);
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const saveFinalCost = useCallback(async () => {
    if (!costEdit) return;
    const val = Number(costEdit.value);
    if (!Number.isFinite(val) || val < 0) { toast.error('Cost final invalid'); return; }
    setSavingCost(true);
    try {
      await apiCommand('set_project_final_cost', { request: { project_id: costEdit.id, final_cost: val } });
      toast.success('Cost final salvat — marja/profit/risc recalculate');
      setCostEdit(null);
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Eroare la salvare');
    } finally {
      setSavingCost(false);
    }
  }, [costEdit, reload]);

  useEffect(() => {
    apiCommand<any>('get_finance_insights').then(setInsights).catch(() => {});
  }, []);

  useEffect(() => {
    apiCommand<any>('get_finance_compliance').then(setCompliance).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col">
      {}
      <div className="mod-kpis px-4 pt-4 pb-6">
        {overview ? (
          <>
            <KpiMini icon={TrendingUp}   label="Venituri" value={overview.total_actual_revenue} format={(n) => money(n, 'RON')} />
            <KpiMini icon={TrendingDown} label="Costuri"  value={overview.total_actual_cost} format={(n) => money(n, 'RON')} />
            <KpiMini icon={DollarSign}   label="Profit"   value={overview.total_actual_profit} format={(n) => money(n, 'RON')} />
            <KpiMini icon={Percent}      label="Marja"    value={overview.avg_margin_percent || 0} format={(n) => `${n.toFixed(1)}%`} />
          </>
        ) : Array.from({ length: 4 }).map((_, i) => (
          <GlassCard key={i} size="compact" className="h-[72px] animate-pulse !p-5" />
        ))}
      </div>

      {}
      {insights?.receivables_aging && insights.receivables_aging.length > 0 && (
        <div className="bg-surface-secondary border-b border-line p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted mb-3">Vechime creante</h3>
          <div className="flex items-end gap-2 h-20">
            {insights.receivables_aging.map((b: { label: string; amount: number }, i: number) => {
              const maxAmt = Math.max(...insights.receivables_aging.map((x: { amount?: number }) => x.amount || 0));
              const pct = maxAmt > 0 ? ((b.amount || 0) / maxAmt) * 100 : 0;
              const colors = ['bg-status-green', 'bg-status-amber', 'bg-status-red', 'bg-status-red/70'];
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full" style={{ height: `${Math.max(pct, 4)}%` }}>
                    <div className={`w-full h-full ${colors[i] || 'bg-status-blue'}`} />
                  </div>
                  <span className="text-pm-2xs text-content-muted">{b.label || `${i * 30}-${(i + 1) * 30}z`}</span>
                  <span className="text-pm-2xs font-semibold tabular-nums text-content-primary">{money(b.amount || 0, 'RON')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {}
      {insights?.flagged_projects?.length > 0 && (
        <div className="border-b border-status-amber/30 bg-status-amber/5 p-3">
          <h3 className="text-xs font-semibold text-status-amber flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-3.5 w-3.5" /> Proiecte cu risc financiar
          </h3>
          <div className="space-y-1">
            {insights.flagged_projects.slice(0, 5).map((p: { name?: string; project_name?: string; reason?: string }, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-content-primary font-medium">{p.name || p.project_name}</span>
                <span className="text-status-red tabular-nums">{p.reason || 'Marja scazuta'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {}
      {compliance && (
        <div className="grid grid-cols-4">
          <div className="bg-surface-secondary border-b border-r border-line p-3 text-center">
            <p className="text-lg font-semibold tabular-nums text-content-primary">{compliance.open_tasks ?? 0}</p>
            <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Deschise</p>
          </div>
          <div className="bg-surface-secondary border-b border-r border-line p-3 text-center">
            <p className="text-lg font-semibold tabular-nums text-status-red">{compliance.overdue_tasks ?? 0}</p>
            <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Restante</p>
          </div>
          <div className="bg-surface-secondary border-b border-r border-line p-3 text-center">
            <p className="text-lg font-semibold tabular-nums text-content-primary">{compliance.legal_tasks ?? 0}</p>
            <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Legal</p>
          </div>
          <div className="bg-surface-secondary border-b border-line p-3 text-center">
            <p className="text-lg font-semibold tabular-nums text-content-primary">{compliance.accounting_tasks ?? 0}</p>
            <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Contabilitate</p>
          </div>
        </div>
      )}

      {}
      <div className="bg-surface-secondary overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              {['Proiect', 'Status', 'Venituri', 'Costuri', 'Profit', 'Marja', 'Risc', ''].map((h, i) => (
                <th key={h || `act-${i}`} className="px-3 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-content-muted mx-auto" /></td></tr>
            ) : projects.map((p) => {
              
              
              const locked = !p.is_finalized;
              const lockCell = (
                <td className="px-3 py-2 text-xs text-content-muted/60 border-b border-line text-right italic" title="Disponibil la finalizare">—</td>
              );
              return (
              <tr key={p.project_id} className="hover:bg-surface-tertiary/30 transition-colors">
                <td className="px-3 py-2 text-xs text-content-primary border-b border-line font-medium">{p.project_name}</td>
                <td className="px-3 py-2 text-xs text-content-secondary border-b border-line">{p.status}</td>
                <td className="px-3 py-2 text-xs tabular-nums text-content-primary border-b border-line text-right">{money(p.actual_revenue, 'RON')}</td>
                {locked ? lockCell : (
                  <td className="px-3 py-2 text-xs tabular-nums text-content-primary border-b border-line text-right">{money(p.total_cost, 'RON')}</td>
                )}
                {locked ? lockCell : (
                  <td className={`px-3 py-2 text-xs tabular-nums border-b border-line text-right font-medium ${p.actual_profit >= 0 ? 'text-status-green' : 'text-status-red'}`}>
                    {money(p.actual_profit, 'RON')}
                  </td>
                )}
                {locked ? lockCell : (
                  <td className="px-3 py-2 text-xs tabular-nums text-content-muted border-b border-line text-right">{(p.margin_percent || 0).toFixed(1)}%</td>
                )}
                <td className="px-3 py-2 border-b border-line">
                  {locked ? (
                    <span className="text-pm-2xs text-content-muted/60 italic" title="Disponibil la finalizare">Disponibil la finalizare</span>
                  ) : (
                    <span className={`text-pm-2xs font-semibold px-2 py-0.5 ${
                      p.risk_level === 'HIGH' ? 'bg-status-red/15 text-status-red' :
                      p.risk_level === 'MEDIUM' ? 'bg-status-amber/15 text-status-amber' :
                      'bg-status-green/15 text-status-green'
                    }`}>{p.risk_level}</span>
                  )}
                </td>
                <td className="px-3 py-2 border-b border-line text-right">
                  {p.is_finalized ? (
                    <button
                      type="button"
                      onClick={() => setCostEdit({ id: p.project_id, name: p.project_name, value: String(p.total_cost || '') })}
                      className="text-pm-2xs text-accent hover:bg-accent/10 px-2 py-0.5 rounded"
                      title="Completează costul final de producție"
                    >Cost final</button>
                  ) : (
                    <span className="text-pm-2xs text-content-muted/50" title="Se deblochează la finalizarea proiectului">🔒</span>
                  )}
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>

      {}
      {costEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !savingCost && setCostEdit(null)}>
          <div className="bg-surface-primary border border-line rounded-lg shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-line">
              <h3 className="text-pm-sm font-semibold text-content-primary">Cost final de producție</h3>
              <p className="text-pm-2xs text-content-muted mt-0.5 truncate">{costEdit.name}</p>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-pm-xs text-content-muted">Cost final (RON)</label>
              <input
                type="number" min={0} autoFocus
                value={costEdit.value}
                onChange={(e) => setCostEdit(c => c ? { ...c, value: e.target.value } : c)}
                onKeyDown={(e) => { if (e.key === 'Enter') void saveFinalCost(); }}
                className="w-full h-9 border border-line bg-surface-primary px-2.5 text-pm-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
              <p className="text-pm-2xs text-content-muted">Marja, profitul și riscul se recalculează automat.</p>
            </div>
            <div className="px-5 py-3 border-t border-line bg-surface-secondary flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCostEdit(null)} disabled={savingCost}>Anulează</Button>
              <Button size="sm" className="ml-auto" onClick={() => void saveFinalCost()} disabled={savingCost}>
                {savingCost ? 'Se salvează…' : 'Salvează'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





type InvoiceSortKey = 'invoice_number' | 'project_name' | 'client_name' | 'total' | 'paid_amount' | 'remaining' | 'status' | 'due_date';

function InvoicesTab({ onDataChange }: { onDataChange?: () => void }) {
  const money = useMoney();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, openModal, closeModal } = useFormModal();

  const { sorted: sortedInvoices, sort, toggle } = useSort<Invoice, InvoiceSortKey>(
    invoices,
    (row, key) => {
      if (key === 'due_date') return row.due_date ? new Date(row.due_date) : null;
      return row[key] ?? '';
    },
    { key: 'due_date', dir: 'asc' },
  );
  const fullProjects = useProjectStore(s => s.projects);
  const fetchProjectsStore = useProjectStore(s => s.fetchProjects);
  const projects = useMemo(() => fullProjects.map(p => ({ id: p.id, name: p.name })), [fullProjects]);
  const fullClients = useClientStore(s => s.clients);
  const fetchClientsStore = useClientStore(s => s.fetchClients);
  const clients = useMemo(() => fullClients.map(c => ({ id: c.id, name: c.name })), [fullClients]);
  
  
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(() => {
    setLoading(true);
    apiCommand<Invoice[]>('get_invoices').then((data) => setInvoices(data || [])).catch(() => setInvoices([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchInvoices();
    void fetchProjectsStore();
    void fetchClientsStore();
  }, [fetchInvoices, fetchProjectsStore, fetchClientsStore]);

  const invoiceFields: FormField[] = useMemo(() => [
    { name: 'project_id', label: 'Proiect', type: 'select' as const, required: true, options: projects.map((p) => ({ value: p.id, label: p.name })) },
    { name: 'client_id', label: 'Client', type: 'select' as const, required: true, options: clients.map((c) => ({ value: c.id, label: c.name })) },
    { name: 'issue_date', label: 'Data emitere', type: 'date' as const, required: true },
    { name: 'due_date', label: 'Data scadenta', type: 'date' as const, required: true },
    { name: 'currency', label: 'Moneda', type: 'select' as const, options: [{ value: 'RON', label: 'RON' }, { value: 'EUR', label: 'EUR' }] },
    { name: 'line_desc', label: 'Descriere linie', type: 'text' as const, required: true, placeholder: 'ex: Statie betoane M60' },
    { name: 'line_qty', label: 'Cantitate', type: 'number' as const, required: true, placeholder: '1' },
    { name: 'line_price', label: 'Pret unitar', type: 'number' as const, required: true, placeholder: '0.00' },
    { name: 'notes', label: 'Note', type: 'textarea' as const },
  ], [projects, clients]);

  const handleCreateInvoice = async (data: Record<string, unknown>) => {
    await apiCommand('create_finance_invoice', {
      project_id: Number(data.project_id),
      client_id: Number(data.client_id),
      issue_date: data.issue_date,
      due_date: data.due_date,
      currency: data.currency || 'RON',
      notes: data.notes || null,
      lines: [{
        description: data.line_desc as string,
        quantity: Number(data.line_qty) || 1,
        unit_price: Number(data.line_price) || 0,
      }],
    });
    nativeNotify({
      title: 'Factură emisă',
      body: `Factura a fost emisă cu succes${data.currency ? ` (${data.currency})` : ''}.`,
      level: 'success',
    });
    fetchInvoices();
    onDataChange?.();
  };

  const handlePayment = (invoice: Invoice) => {
    setPayingInvoice(invoice);
  };

  const submitPayment = async (data: Record<string, unknown>) => {
    if (!payingInvoice) return;
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new Error('Suma trebuie să fie mai mare ca zero');
    if (amount > payingInvoice.remaining + 0.01) {
      throw new Error(`Suma depășește restul de plată (${payingInvoice.remaining})`);
    }
    await apiCommand('record_invoice_payment', {
      invoice_id: payingInvoice.id,
      amount,
      payment_date: data.payment_date || new Date().toISOString().split('T')[0],
      payment_method: data.payment_method || 'transfer',
    });
    setPayingInvoice(null);
    fetchInvoices();
  };

  const handleStatusChange = async (invoiceId: number, status: string) => {
    try {
      await apiCommand('update_invoice_status', { invoice_id: invoiceId, status });
      fetchInvoices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare');
    }
  };

  return (
    <div className="flex flex-col">
      {}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-secondary border-b border-line">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-content-muted">Facturi</h2>
        <Button size="sm" onClick={() => openModal()}>
          <Plus className="h-3.5 w-3.5" /> Factura noua
        </Button>
      </div>

      {}
      <div className="bg-surface-secondary overflow-auto flex-1">
        <table className="table-density w-full text-left border-collapse table-fixed min-w-[1100px]">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-surface-secondary shadow-[inset_0_-1px_0_var(--color-border)]">
            <tr>
              <SortableTh sortKey="invoice_number" sort={sort} onSort={toggle}>Nr. factura</SortableTh>
              <SortableTh sortKey="project_name"   sort={sort} onSort={toggle}>Proiect</SortableTh>
              <SortableTh sortKey="client_name"    sort={sort} onSort={toggle}>Client</SortableTh>
              <SortableTh sortKey="total"          sort={sort} onSort={toggle} align="right">Total</SortableTh>
              <SortableTh sortKey="paid_amount"    sort={sort} onSort={toggle} align="right">Platit</SortableTh>
              <SortableTh sortKey="remaining"      sort={sort} onSort={toggle} align="right">Restant</SortableTh>
              <SortableTh sortKey="status"         sort={sort} onSort={toggle}>Status</SortableTh>
              <SortableTh sortKey="due_date"       sort={sort} onSort={toggle}>Scadenta</SortableTh>
              <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted text-right">Actiuni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-content-muted mx-auto" /></td></tr>
            ) : sortedInvoices.map((inv) => (
              <tr key={inv.id} className="group hover:bg-surface-tertiary/30 transition-colors">
                <td className="px-3 py-2 text-xs text-accent font-medium border-b border-line truncate" title={inv.invoice_number}>{inv.invoice_number}</td>
                <td className="px-3 py-2 text-xs text-content-primary border-b border-line truncate" title={inv.project_name}>{inv.project_name}</td>
                <td className="px-3 py-2 text-xs text-content-secondary border-b border-line truncate" title={inv.client_name}>{inv.client_name}</td>
                <td className="px-3 py-2 text-base font-semibold tabular-nums text-content-primary border-b border-line text-right">{money(inv.total, inv.currency)}</td>
                <td className="px-3 py-2 text-xs tabular-nums text-status-green border-b border-line text-right">{money(inv.paid_amount, inv.currency)}</td>
                <td className={`px-3 py-2 text-xs tabular-nums border-b border-line text-right font-medium ${inv.remaining > 0 ? 'text-status-red' : 'text-status-green'}`}>
                  {money(inv.remaining, inv.currency)}
                </td>
                <td className="px-3 py-2 border-b border-line">
                  <StatusBadge {...invoiceStatus(inv.status)} size="xs" />
                </td>
                <td className="px-3 py-2 text-xs text-content-muted border-b border-line">{inv.due_date}</td>
                <td className="px-3 py-2 border-b border-line">
                  <div className="flex items-center gap-1 justify-end opacity-70 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button onClick={() => downloadInvoicePdf(inv.id)} title="Descarcă PDF"
                      className="p-1 hover:bg-surface-tertiary/30 text-content-muted hover:text-accent transition-colors">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <button onClick={() => handlePayment(inv)} title="Înregistrează plata"
                        className="p-1 hover:bg-surface-tertiary/30 text-content-muted hover:text-status-green transition-colors">
                        <CreditCard className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {inv.status === 'draft' && (
                      <button onClick={() => handleStatusChange(inv.id, 'sent')} title="Marchează trimisa"
                        className="p-1 hover:bg-surface-tertiary/30 text-content-muted hover:text-status-blue transition-colors">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                      <button onClick={() => handleStatusChange(inv.id, 'cancelled')} title="Anulează"
                        className="p-1 hover:bg-surface-tertiary/30 text-content-muted hover:text-status-red transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormModal isOpen={isOpen} onClose={closeModal} title="Factura noua" fields={invoiceFields} onSubmit={handleCreateInvoice} submitLabel="Creeaza factura" />

      <FormModal
        isOpen={!!payingInvoice}
        onClose={() => setPayingInvoice(null)}
        title={payingInvoice ? `Plata factura ${payingInvoice.invoice_number}` : 'Plata'}
        fields={[
          { name: 'amount', label: `Suma platita (${payingInvoice?.currency || 'RON'})`, type: 'number', required: true, placeholder: '0.00' },
          { name: 'payment_date', label: 'Data platii', type: 'date', required: true },
          { name: 'payment_method', label: 'Metoda', type: 'select', options: [
            { value: 'transfer', label: 'Transfer bancar' },
            { value: 'cash', label: 'Numerar' },
            { value: 'card', label: 'Card' },
          ] },
        ]}
        initialData={payingInvoice ? {
          amount: payingInvoice.remaining,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'transfer',
        } : {}}
        onSubmit={submitPayment}
        submitLabel="Înregistrează plata"
      />
    </div>
  );
}





function ExpensesTab({ onDataChange }: { onDataChange?: () => void }) {
  const money = useMoney();
  const eurRate = useEurRate();
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, openModal, closeModal } = useFormModal();
  const fullProjects = useProjectStore(s => s.projects);
  const fetchProjectsStore = useProjectStore(s => s.fetchProjects);
  const projects = useMemo(() => fullProjects.map(p => ({ id: p.id, name: p.name })), [fullProjects]);

  const fetchExpenses = useCallback(() => {
    setLoading(true);
    apiCommand<ProjectExpense[]>('get_project_expenses').then((d) => setExpenses(d || [])).catch(() => setExpenses([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchExpenses();
    void fetchProjectsStore();
  }, [fetchExpenses, fetchProjectsStore]);

  const expenseFields: FormField[] = useMemo(() => [
    { name: 'project_id', label: 'Proiect', type: 'select' as const, required: true, options: projects.map((p) => ({ value: p.id, label: p.name })) },
    { name: 'category', label: 'Categorie', type: 'select' as const, required: true, options: Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l })) },
    { name: 'description', label: 'Descriere', type: 'text' as const, required: true, placeholder: 'Detalii cheltuiala' },
    { name: 'amount', label: 'Suma', type: 'number' as const, required: true, placeholder: '0.00' },
    { name: 'currency', label: 'Monedă', type: 'select' as const, options: [{ value: 'RON', label: 'RON' }, { value: 'EUR', label: 'EUR' }] },
    { name: 'date', label: 'Data', type: 'date' as const, required: true },
    { name: 'invoice_ref', label: 'Ref. factura furnizor', type: 'text' as const, placeholder: 'Optional' },
    { name: 'notes', label: 'Note', type: 'textarea' as const },
  ], [projects]);

  const handleCreateExpense = async (data: Record<string, unknown>) => {
    await apiCommand('create_project_expense', {
      project_id: Number(data.project_id),
      category: data.category,
      description: data.description,
      amount: Number(data.amount),
      currency: data.currency || 'RON',
      date: data.date,
      invoice_ref: data.invoice_ref || null,
      notes: data.notes || null,
    });
    fetchExpenses();
    onDataChange?.();
  };

  
  
  
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    const ron = (e.currency || 'RON').toUpperCase() === 'EUR' ? e.amount * eurRate : e.amount;
    acc[e.category] = (acc[e.category] || 0) + ron;
    return acc;
  }, {});
  const totalExpenses = Object.values(categoryTotals).reduce((s, v) => s + v, 0);

  return (
    <div className="flex flex-col">
      {}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-secondary border-b border-line">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-content-muted">Cheltuieli pe proiecte</h2>
        <Button size="sm" onClick={() => openModal()}>
          <Plus className="h-3.5 w-3.5" /> Cheltuiala noua
        </Button>
      </div>

      {}
      {totalExpenses > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, amount], idx, arr) => (
            <div key={cat} className={`bg-surface-secondary p-4 border-b border-line ${idx < arr.length - 1 ? 'border-r border-line' : ''}`}>
              <p className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">{categoryLabels[cat] || cat}</p>
              <p className="text-base font-semibold tabular-nums text-content-primary">{money(amount, 'RON')}</p>
              <p className="text-xs tabular-nums text-content-muted">{((amount / totalExpenses) * 100).toFixed(0)}%</p>
            </div>
          ))}
        </div>
      )}

      {}
      <div className="bg-surface-secondary overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              {['Data', 'Proiect', 'Categorie', 'Descriere', 'Suma'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-content-muted mx-auto" /></td></tr>
            ) : expenses.map((e) => (
              <tr key={e.id} className="hover:bg-surface-tertiary/30 transition-colors">
                <td className="px-3 py-2 text-xs text-content-muted border-b border-line">{e.date}</td>
                <td className="px-3 py-2 text-xs text-content-primary border-b border-line font-medium">{e.project_name}</td>
                <td className="px-3 py-2 border-b border-line">
                  <span className="text-pm-2xs font-semibold px-2 py-0.5 bg-content-muted/15 text-content-secondary">{categoryLabels[e.category] || e.category}</span>
                </td>
                <td className="px-3 py-2 text-xs text-content-secondary border-b border-line">{e.description}</td>
                <td className="px-3 py-2 text-base font-semibold tabular-nums text-content-primary border-b border-line text-right">{money(e.amount, e.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormModal isOpen={isOpen} onClose={closeModal} title="Cheltuiala noua" fields={expenseFields} onSubmit={handleCreateExpense} submitLabel="Adaugă" />
    </div>
  );
}





function ReportsTab() {
  const money = useMoney();
  const [reportType, setReportType] = useState<'monthly' | 'project'>('monthly');
  const [data, setData] = useState<ProfitLossReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    apiCommand<ProfitLossReport[]>('get_profit_loss_report', { report_type: reportType, year })
      .then((d) => setData(d || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [reportType, year]);

  const totals = data.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.total_revenue,
      expenses: acc.expenses + r.total_expenses,
      profit: acc.profit + r.gross_profit,
    }),
    { revenue: 0, expenses: 0, profit: 0 }
  );

  const exportCSV = () => {
    const headers = reportType === 'monthly'
      ? 'Luna,Venituri,Cheltuieli,Profit,Marja %'
      : 'Proiect,Venituri,Cheltuieli,Profit,Marja %';
    const rows = data.map((r) =>
      `${r.period},${r.total_revenue.toFixed(2)},${r.total_expenses.toFixed(2)},${r.gross_profit.toFixed(2)},${r.margin_percent.toFixed(1)}`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raport_${reportType}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateReport = () => {
    setLoading(true);
    apiCommand<ProfitLossReport[]>('get_profit_loss_report', { report_type: reportType, year })
      .then((d) => setData(d || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex flex-col">
      {}
      <div className="grid grid-cols-3 border-b border-line">
        <button onClick={() => { setReportType('monthly'); }}
          className={`p-3 text-left transition-colors border-r border-line ${reportType === 'monthly' ? 'bg-accent/10' : 'bg-surface-secondary hover:bg-surface-tertiary/30'}`}>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium text-content-primary">Raport Lunar</span>
          </div>
          <p className="text-xs text-content-muted">Profit/pierdere pe luni</p>
        </button>
        <button onClick={() => { setReportType('project'); }}
          className={`p-3 text-left transition-colors border-r border-line ${reportType === 'project' ? 'bg-accent/10' : 'bg-surface-secondary hover:bg-surface-tertiary/30'}`}>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium text-content-primary">Raport Proiecte</span>
          </div>
          <p className="text-xs text-content-muted">Profit/pierdere pe proiect</p>
        </button>
        <button onClick={generateReport}
          className="p-3 text-left transition-colors bg-surface-secondary hover:bg-surface-tertiary/30">
          <div className="flex items-center gap-2 mb-1">
            <Plus className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium text-content-primary">Generează raport</span>
          </div>
          <p className="text-xs text-content-muted">Reîncarcă datele curente</p>
        </button>
      </div>

      {}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-secondary border-b border-line">
        <div className="flex items-center gap-2">
          <select value={reportType} onChange={(e) => setReportType(e.target.value as 'monthly' | 'project')}
            className={filterSelectCls(false)}>
            <option value="monthly">Lunar</option>
            <option value="project">Pe proiect</option>
          </select>
          {reportType === 'monthly' && (
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              className={filterSelectCls(year !== new Date().getFullYear())}>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
        </div>
        <Button size="sm" onClick={exportCSV}>
          <ChevronDown className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {}
      <div className="grid grid-cols-3 border-b border-line">
        <div className="bg-surface-secondary border-r border-line p-4">
          <p className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Total Venituri</p>
          <p className="text-base font-semibold tabular-nums text-status-green">{money(totals.revenue, 'RON')}</p>
        </div>
        <div className="bg-surface-secondary border-r border-line p-4">
          <p className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Total Cheltuieli</p>
          <p className="text-base font-semibold tabular-nums text-status-red">{money(totals.expenses, 'RON')}</p>
        </div>
        <div className="bg-surface-secondary p-4">
          <p className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Profit Brut</p>
          <p className={`text-base font-semibold tabular-nums ${totals.profit >= 0 ? 'text-status-green' : 'text-status-red'}`}>{money(totals.profit, 'RON')}</p>
        </div>
      </div>

      {}
      {data.length > 0 && (
        <div className="bg-surface-secondary border-b border-line p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted mb-3">Profit / Pierdere</p>
          <div className="flex items-end gap-1 h-40">
            {data.map((r) => {
              const maxVal = Math.max(...data.map((d) => Math.max(Math.abs(d.gross_profit), 1)));
              const h = Math.abs(r.gross_profit) / maxVal * 100;
              return (
                <div key={r.period} className="flex-1 flex flex-col items-center gap-1" title={`${r.period}: ${money(r.gross_profit, 'RON')}`}>
                  <div className={`w-full ${r.gross_profit >= 0 ? 'bg-status-green' : 'bg-status-red'}`}
                    style={{ height: `${Math.max(h, 4)}%`, opacity: 0.7 }} />
                  <span className="text-pm-2xs text-content-muted truncate w-full text-center">
                    {reportType === 'monthly' ? r.period.slice(5) : r.period.slice(0, 12)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {}
      <div className="bg-surface-secondary overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              {[reportType === 'monthly' ? 'Luna' : 'Proiect', 'Venituri', 'Cheltuieli', 'Profit', 'Marja %'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-content-muted mx-auto" /></td></tr>
            ) : data.map((r) => (
              <tr key={r.period} className="hover:bg-surface-tertiary/30 transition-colors">
                <td className="px-3 py-2 text-xs text-content-primary border-b border-line font-medium">{r.period}</td>
                <td className="px-3 py-2 text-xs tabular-nums text-content-primary border-b border-line text-right">{money(r.total_revenue, 'RON')}</td>
                <td className="px-3 py-2 text-xs tabular-nums text-content-primary border-b border-line text-right">{money(r.total_expenses, 'RON')}</td>
                <td className={`px-3 py-2 text-xs tabular-nums border-b border-line text-right font-medium ${r.gross_profit >= 0 ? 'text-status-green' : 'text-status-red'}`}>
                  {money(r.gross_profit, 'RON')}
                </td>
                <td className="px-3 py-2 text-xs tabular-nums text-content-muted border-b border-line text-right">{r.margin_percent.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}




function KpiMini({ icon: Icon, label, value, warn, format }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; warn?: boolean; format?: (n: number) => string;
}) {
  return (
    <GlassCard size="compact" className="flex items-center gap-3.5 !p-5">
      <span className="h-11 w-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted truncate">{label}</p>
        <MetricValue value={value} size="display" warn={warn} format={format} className="mt-0.5 block" />
      </div>
    </GlassCard>
  );
}
