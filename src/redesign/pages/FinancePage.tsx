
































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
import { invoiceStatus } from '@/lib/statusTokens';
import { useSort } from '@/hooks/useSort';


import Page from '@/redesign/ui/Page';
import Card from '@/redesign/ui/Card';
import KpiCard from '@/redesign/ui/KpiCard';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import StatusBadge from '@/redesign/ui/StatusBadge';
import SectionHeader from '@/redesign/ui/SectionHeader';
import EmptyState from '@/redesign/ui/EmptyState';
import SortableTh, { THEAD_STICKY } from '@/redesign/ui/SortableTh';
import AnimatedTabs from '@/redesign/ui/AnimatedTabs';
import { filterSelectCls } from '@/redesign/ui/filterControls';
import { vtName } from '@/redesign/lib/viewTransition';





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
    <Page fit>
      <Page.Body fit maxWidth="wide" padding="comfortable" className="relative">
        {}
        <div
          className="enter-up shrink-0 pb-3.5 border-b border-line/60 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"
          style={{ animationDelay: '0ms' }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              {/* Eyebrow removed — breadcrumb already conveys the workspace. */}
              <h1 className="text-pm-2xl font-semibold text-content-primary truncate leading-tight">Financiar</h1>
              <p className="mt-0.5 text-pm-sm text-content-muted truncate">
                Venituri, costuri, facturi, cheltuieli și rapoarte de profitabilitate
              </p>
            </div>
          </div>
          <div className="shrink-0 overflow-x-auto">
            <AnimatedTabs
              active={tab}
              onChange={(id) => setTab(id as Tab)}
              tabs={tabs.map(t => ({ id: t.id, label: t.label, icon: t.icon }))}
            />
          </div>
        </div>

        {}
        {}
        <div key={tab} className="enter-up min-w-0 flex flex-1 flex-col min-h-0" style={{ animationDelay: '120ms' }}>
          {tab === 'overview' && <OverviewTab key={refreshKey} />}
          {tab === 'invoices' && <InvoicesTab onDataChange={() => setRefreshKey(k => k + 1)} />}
          {tab === 'expenses' && <ExpensesTab onDataChange={() => setRefreshKey(k => k + 1)} />}
          {tab === 'reports' && <ReportsTab key={refreshKey} />}
        </div>
      </Page.Body>
    </Page>
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

  const hasReceivables = insights?.receivables_aging && insights.receivables_aging.length > 0;
  const hasFlagged = insights?.flagged_projects?.length > 0;
  const hasRail = hasReceivables || hasFlagged || !!compliance;

  return (
    <div className="flex flex-1 flex-col min-h-0 gap-4">
      {}
      <div className="stagger-in shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overview ? (
          <>
            <KpiCard
              vtName={vtName('fin-kpi', 'revenue')}
              label="Venituri" icon={TrendingUp}
              value={money(overview.total_actual_revenue, 'RON')}
            />
            <KpiCard
              vtName={vtName('fin-kpi', 'cost')}
              label="Costuri" icon={TrendingDown} iconColor="text-status-red"
              value={money(overview.total_actual_cost, 'RON')}
            />
            <KpiCard
              vtName={vtName('fin-kpi', 'profit')}
              label="Profit" icon={DollarSign}
              iconColor={overview.total_actual_profit >= 0 ? 'text-status-green' : 'text-status-red'}
              value={money(overview.total_actual_profit, 'RON')}
            />
            <KpiCard
              vtName={vtName('fin-kpi', 'margin')}
              label="Marja" icon={Percent} iconColor="text-status-blue"
              value={`${(overview.avg_margin_percent || 0).toFixed(1)}%`}
            />
          </>
        ) : Array.from({ length: 4 }).map((_, i) => (
          <KpiCard key={i} label="" value="" loading />
        ))}
      </div>

      {}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0">

        {}
        <Card padding="none" className={`flex flex-col min-h-0 ${hasRail ? 'xl:col-span-8 min-w-0' : 'xl:col-span-12 min-w-0'}`}>
          <div className="px-5 py-4 border-b border-line/70 shrink-0">
            <SectionHeader
              title="Proiecte — profitabilitate"
              icon={BarChart3}
              meta="Costul/profitul/marja se deblochează la finalizarea proiectului"
              className="mb-0"
            />
          </div>
          <div className="overflow-auto min-h-0 flex-1">
            <table className="w-full text-left border-collapse">
              <thead className={THEAD_STICKY}>
                <tr>
                  {['Proiect', 'Status', 'Venituri', 'Costuri', 'Profit', 'Marja', 'Risc', ''].map((h, i) => (
                    <th key={h || `act-${i}`} className="px-3 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody key={loading ? 'loading' : `rows-${projects.length}`} className="stagger-in">
                {loading ? (
                  <tr><td colSpan={8} className="px-3 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-content-muted mx-auto" /></td></tr>
                ) : projects.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-2">
                    <EmptyState icon={BarChart3} title="Niciun proiect" description="Nu există proiecte cu date financiare." />
                  </td></tr>
                ) : projects.map((p) => {
                  
                  
                  const locked = !p.is_finalized;
                  const lockCell = (
                    <td className="px-3 py-2 text-xs text-content-muted/60 border-b border-line/60 text-right italic" title="Disponibil la finalizare">—</td>
                  );
                  return (
                  <tr key={p.project_id} className="hover:bg-surface-tertiary/30 transition-colors">
                    <td className="px-3 py-2 text-xs text-content-primary border-b border-line/60 font-medium">{p.project_name}</td>
                    <td className="px-3 py-2 text-xs text-content-secondary border-b border-line/60">{p.status}</td>
                    <td className="px-3 py-2 text-xs tabular-nums text-content-primary border-b border-line/60 text-right">{money(p.actual_revenue, 'RON')}</td>
                    {locked ? lockCell : (
                      <td className="px-3 py-2 text-xs tabular-nums text-content-primary border-b border-line/60 text-right">{money(p.total_cost, 'RON')}</td>
                    )}
                    {locked ? lockCell : (
                      <td className={`px-3 py-2 text-xs tabular-nums border-b border-line/60 text-right font-medium ${p.actual_profit >= 0 ? 'text-status-green' : 'text-status-red'}`}>
                        {money(p.actual_profit, 'RON')}
                      </td>
                    )}
                    {locked ? lockCell : (
                      <td className="px-3 py-2 text-xs tabular-nums text-content-muted border-b border-line/60 text-right">{(p.margin_percent || 0).toFixed(1)}%</td>
                    )}
                    <td className="px-3 py-2 border-b border-line/60">
                      {locked ? (
                        <span className="text-pm-2xs text-content-muted/60 italic" title="Disponibil la finalizare">Disponibil la finalizare</span>
                      ) : (
                        <StatusBadge
                          size="xs"
                          tone={p.risk_level === 'HIGH' ? 'danger' : p.risk_level === 'MEDIUM' ? 'warning' : 'success'}
                          label={p.risk_level}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 border-b border-line/60 text-right">
                      {p.is_finalized ? (
                        <button
                          type="button"
                          onClick={() => setCostEdit({ id: p.project_id, name: p.project_name, value: String(p.total_cost || '') })}
                          className="text-pm-2xs text-accent hover:bg-accent/10 px-2 py-0.5 rounded-md"
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
        </Card>

        {}
        {hasRail && (
          <div
            key={`rail-${hasReceivables}-${hasFlagged}-${!!compliance}`}
            className="stagger-in xl:col-span-4 min-w-0 flex flex-col gap-4 min-h-0 overflow-y-auto"
          >

            {}
            {hasReceivables && (
              <Card padding="lg" className="min-w-0">
                <h3 className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted mb-3">Vechime creante</h3>
                <div className="flex items-end gap-2 h-20">
                  {insights.receivables_aging.map((b: { label: string; amount: number }, i: number) => {
                    const maxAmt = Math.max(...insights.receivables_aging.map((x: { amount?: number }) => x.amount || 0));
                    const pct = maxAmt > 0 ? ((b.amount || 0) / maxAmt) * 100 : 0;
                    const colors = ['bg-status-green', 'bg-status-amber', 'bg-status-red', 'bg-status-red/70'];
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end" style={{ height: '64px' }}>
                          <div className={`anim-grow-y w-full rounded-t-sm ${colors[i] || 'bg-status-blue'}`} style={{ height: `${Math.max(pct, 4)}%`, animationDelay: `${i * 60}ms` }} />
                        </div>
                        <span className="text-pm-2xs text-content-muted">{b.label || `${i * 30}-${(i + 1) * 30}z`}</span>
                        <span className="text-pm-2xs font-semibold tabular-nums text-content-primary">{money(b.amount || 0, 'RON')}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {}
            {hasFlagged && (
              <Card padding="lg" tone="flat" className="min-w-0 !border-status-amber/30 bg-status-amber/5">
                <h3 className="text-pm-xs font-semibold text-status-amber flex items-center gap-1.5 mb-2.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Proiecte cu risc financiar
                </h3>
                <div className="space-y-1.5">
                  {insights.flagged_projects.slice(0, 5).map((p: { name?: string; project_name?: string; reason?: string }, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-pm-xs">
                      <span className="text-content-primary font-medium truncate">{p.name || p.project_name}</span>
                      <span className="text-status-red tabular-nums shrink-0">{p.reason || 'Marja scazuta'}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {}
            {compliance && (
              <Card padding="lg" className="min-w-0">
                <h3 className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted mb-3">Conformitate</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-surface-secondary p-3 text-center">
                    <p className="text-pm-lg font-semibold tabular-nums text-content-primary">{compliance.open_tasks ?? 0}</p>
                    <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Deschise</p>
                  </div>
                  <div className="rounded-xl bg-surface-secondary p-3 text-center">
                    <p className="text-pm-lg font-semibold tabular-nums text-status-red">{compliance.overdue_tasks ?? 0}</p>
                    <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Restante</p>
                  </div>
                  <div className="rounded-xl bg-surface-secondary p-3 text-center">
                    <p className="text-pm-lg font-semibold tabular-nums text-content-primary">{compliance.legal_tasks ?? 0}</p>
                    <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Legal</p>
                  </div>
                  <div className="rounded-xl bg-surface-secondary p-3 text-center">
                    <p className="text-pm-lg font-semibold tabular-nums text-content-primary">{compliance.accounting_tasks ?? 0}</p>
                    <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Contabilitate</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {}
      {costEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !savingCost && setCostEdit(null)}>
          <div className="bg-surface-elevated border border-line rounded-2xl shadow-[var(--elevation-4)] w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-line/70">
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
                className="w-full h-9 rounded-lg border border-line/70 bg-surface-secondary/40 px-2.5 text-pm-sm text-content-primary focus:outline-none focus:border-accent/50"
              />
              <p className="text-pm-2xs text-content-muted">Marja, profitul și riscul se recalculează automat.</p>
            </div>
            <div className="px-5 py-3.5 border-t border-line/70 bg-surface-secondary rounded-b-2xl flex items-center gap-2">
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
    <div className="flex flex-1 flex-col min-h-0 gap-4">
      <Card padding="none" className="min-w-0 flex flex-col min-h-0 flex-1">
        {}
        <div className="px-5 py-4 border-b border-line/70 shrink-0">
          <SectionHeader
            title="Facturi"
            icon={FileText}
            meta={`${invoices.length} ${invoices.length === 1 ? 'factură' : 'facturi'}`}
            className="mb-0"
            actions={
              <Button size="sm" onClick={() => openModal()}>
                <Plus className="h-3.5 w-3.5" /> Factura noua
              </Button>
            }
          />
        </div>

        {}
        <div className="overflow-auto min-h-0 flex-1">
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
            <thead className={THEAD_STICKY}>
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
            <tbody key={loading ? 'loading' : `rows-${sort.key}-${sort.dir}-${sortedInvoices.length}`} className="stagger-in">
              {loading ? (
                <tr><td colSpan={9} className="px-3 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-content-muted mx-auto" /></td></tr>
              ) : sortedInvoices.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-2">
                  <EmptyState icon={FileText} title="Nicio factură" description="Creează prima factură cu butonul „Factura noua”." />
                </td></tr>
              ) : sortedInvoices.map((inv) => (
                <tr key={inv.id} className="group hover:bg-surface-tertiary/30 transition-colors">
                  <td className="px-3 py-2 text-xs text-accent font-medium border-b border-line/60 truncate" title={inv.invoice_number}>{inv.invoice_number}</td>
                  <td className="px-3 py-2 text-xs text-content-primary border-b border-line/60 truncate" title={inv.project_name}>{inv.project_name}</td>
                  <td className="px-3 py-2 text-xs text-content-secondary border-b border-line/60 truncate" title={inv.client_name}>{inv.client_name}</td>
                  <td className="px-3 py-2 text-base font-semibold tabular-nums text-content-primary border-b border-line/60 text-right">{money(inv.total, inv.currency)}</td>
                  <td className="px-3 py-2 text-xs tabular-nums text-status-green border-b border-line/60 text-right">{money(inv.paid_amount, inv.currency)}</td>
                  <td className={`px-3 py-2 text-xs tabular-nums border-b border-line/60 text-right font-medium ${inv.remaining > 0 ? 'text-status-red' : 'text-status-green'}`}>
                    {money(inv.remaining, inv.currency)}
                  </td>
                  <td className="px-3 py-2 border-b border-line/60">
                    <StatusBadge {...invoiceStatus(inv.status)} size="xs" />
                  </td>
                  <td className="px-3 py-2 text-xs text-content-muted border-b border-line/60">{inv.due_date}</td>
                  <td className="px-3 py-2 border-b border-line/60">
                    <div className="flex items-center gap-1 justify-end opacity-70 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <IconButton size="sm" intent="primary" onClick={() => downloadInvoicePdf(inv.id)} title="Descarcă PDF" aria-label="Descarcă PDF">
                        <Download />
                      </IconButton>
                      {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <IconButton size="sm" intent="success" onClick={() => handlePayment(inv)} title="Înregistrează plata" aria-label="Înregistrează plata">
                          <CreditCard />
                        </IconButton>
                      )}
                      {inv.status === 'draft' && (
                        <IconButton size="sm" onClick={() => handleStatusChange(inv.id, 'sent')} title="Marchează trimisa" aria-label="Marchează trimisa">
                          <Check />
                        </IconButton>
                      )}
                      {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                        <IconButton size="sm" intent="danger" onClick={() => handleStatusChange(inv.id, 'cancelled')} title="Anulează" aria-label="Anulează">
                          <X />
                        </IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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
  const topCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="flex flex-1 flex-col min-h-0 gap-4">
      {}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0">

        {}
        {totalExpenses > 0 && (
          <Card padding="lg" className="xl:col-span-4 min-w-0 min-h-0 overflow-y-auto">
            <h3 className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted mb-3">Top categorii</h3>
            <div key={`cats-${topCategories.length}`} className="stagger-in space-y-2.5">
              {topCategories.map(([cat, amount]) => {
                const pct = (amount / totalExpenses) * 100;
                return (
                  <div key={cat} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-pm-xs font-medium text-content-primary truncate">{categoryLabels[cat] || cat}</span>
                      <span className="text-pm-sm font-semibold tabular-nums text-content-primary shrink-0">{money(amount, 'RON')}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-surface-tertiary overflow-hidden">
                        <div className="anim-bar-grow h-full rounded-full bg-accent/70" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-pm-2xs tabular-nums text-content-muted shrink-0 w-8 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {}
        <Card padding="none" className={`flex flex-col min-h-0 ${totalExpenses > 0 ? 'xl:col-span-8 min-w-0' : 'xl:col-span-12 min-w-0'}`}>
          <div className="px-5 py-4 border-b border-line/70 shrink-0">
            <SectionHeader
              title="Cheltuieli pe proiecte"
              icon={Receipt}
              meta={`${expenses.length} ${expenses.length === 1 ? 'înregistrare' : 'înregistrări'}`}
              className="mb-0"
              actions={
                <Button size="sm" onClick={() => openModal()}>
                  <Plus className="h-3.5 w-3.5" /> Cheltuiala noua
                </Button>
              }
            />
          </div>
          <div className="overflow-auto min-h-0 flex-1">
            <table className="w-full text-left border-collapse">
              <thead className={THEAD_STICKY}>
                <tr>
                  {['Data', 'Proiect', 'Categorie', 'Descriere', 'Suma'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody key={loading ? 'loading' : `rows-${expenses.length}`} className="stagger-in">
                {loading ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-content-muted mx-auto" /></td></tr>
                ) : expenses.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-2">
                    <EmptyState icon={Receipt} title="Nicio cheltuială" description="Adaugă prima cheltuială cu butonul „Cheltuiala noua”." />
                  </td></tr>
                ) : expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-tertiary/30 transition-colors">
                    <td className="px-3 py-2 text-xs text-content-muted border-b border-line/60">{e.date}</td>
                    <td className="px-3 py-2 text-xs text-content-primary border-b border-line/60 font-medium">{e.project_name}</td>
                    <td className="px-3 py-2 border-b border-line/60">
                      <span className="text-pm-2xs font-semibold px-2 py-0.5 rounded-md bg-content-muted/15 text-content-secondary">{categoryLabels[e.category] || e.category}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-content-secondary border-b border-line/60">{e.description}</td>
                    <td className="px-3 py-2 text-base font-semibold tabular-nums text-content-primary border-b border-line/60 text-right">{money(e.amount, e.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
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
    <div className="flex flex-1 flex-col min-h-0 gap-4">
      {}
      <Card padding="lg" className="min-w-0 shrink-0">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          {}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            <button onClick={() => { setReportType('monthly'); }}
              className={`text-left rounded-xl border p-3.5 transition-colors ${reportType === 'monthly' ? 'border-accent/40 bg-accent-muted' : 'border-line bg-surface-primary hover:bg-surface-tertiary/40'}`}>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-accent" />
                <span className="text-pm-xs font-semibold text-content-primary">Raport Lunar</span>
              </div>
              <p className="text-pm-2xs text-content-muted">Profit/pierdere pe luni</p>
            </button>
            <button onClick={() => { setReportType('project'); }}
              className={`text-left rounded-xl border p-3.5 transition-colors ${reportType === 'project' ? 'border-accent/40 bg-accent-muted' : 'border-line bg-surface-primary hover:bg-surface-tertiary/40'}`}>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-accent" />
                <span className="text-pm-xs font-semibold text-content-primary">Raport Proiecte</span>
              </div>
              <p className="text-pm-2xs text-content-muted">Profit/pierdere pe proiect</p>
            </button>
            <button onClick={generateReport}
              className="text-left rounded-xl border border-line bg-surface-primary p-3.5 transition-colors hover:bg-surface-tertiary/40">
              <div className="flex items-center gap-2 mb-1">
                <Plus className="h-4 w-4 text-accent" />
                <span className="text-pm-xs font-semibold text-content-primary">Generează raport</span>
              </div>
              <p className="text-pm-2xs text-content-muted">Reîncarcă datele curente</p>
            </button>
          </div>

          {}
          <div className="flex items-center gap-2 shrink-0">
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
            <Button size="sm" onClick={exportCSV}>
              <ChevronDown className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {}
      <div key={`rep-kpis-${reportType}`} className="stagger-in grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <KpiCard label="Total Venituri" value={money(totals.revenue, 'RON')} iconColor="text-status-green" icon={TrendingUp} />
        <KpiCard label="Total Cheltuieli" value={money(totals.expenses, 'RON')} iconColor="text-status-red" icon={TrendingDown} />
        <KpiCard label="Profit Brut" value={money(totals.profit, 'RON')} iconColor={totals.profit >= 0 ? 'text-status-green' : 'text-status-red'} icon={DollarSign} />
      </div>

      {}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0">
        {}
        {data.length > 0 && (
          <Card padding="lg" className="xl:col-span-5 min-w-0 min-h-0 overflow-y-auto">
            <h3 className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted mb-3">Profit / Pierdere</h3>
            <div key={`chart-${reportType}-${year}-${data.length}`} className="flex items-end gap-1 h-40">
              {data.map((r, i) => {
                const maxVal = Math.max(...data.map((d) => Math.max(Math.abs(d.gross_profit), 1)));
                const h = Math.abs(r.gross_profit) / maxVal * 100;
                return (
                  <div key={r.period} className="flex-1 flex flex-col items-center gap-1" title={`${r.period}: ${money(r.gross_profit, 'RON')}`}>
                    <div className={`anim-grow-y w-full rounded-t-sm ${r.gross_profit >= 0 ? 'bg-status-green' : 'bg-status-red'}`}
                      style={{ height: `${Math.max(h, 4)}%`, opacity: 0.7, animationDelay: `${Math.min(i * 35, 315)}ms` }} />
                    <span className="text-pm-2xs text-content-muted truncate w-full text-center">
                      {reportType === 'monthly' ? r.period.slice(5) : r.period.slice(0, 12)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {}
        <Card padding="none" className={`flex flex-col min-h-0 ${data.length > 0 ? 'xl:col-span-7 min-w-0' : 'xl:col-span-12 min-w-0'}`}>
          <div className="overflow-auto min-h-0 flex-1">
            <table className="w-full text-left border-collapse">
              <thead className={THEAD_STICKY}>
                <tr>
                  {[reportType === 'monthly' ? 'Luna' : 'Proiect', 'Venituri', 'Cheltuieli', 'Profit', 'Marja %'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody key={loading ? 'loading' : `rows-${reportType}-${year}-${data.length}`} className="stagger-in">
                {loading ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-content-muted mx-auto" /></td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-2">
                    <EmptyState icon={BarChart3} title="Niciun rezultat" description="Nu există date pentru perioada selectată." />
                  </td></tr>
                ) : data.map((r) => (
                  <tr key={r.period} className="hover:bg-surface-tertiary/30 transition-colors">
                    <td className="px-3 py-2 text-xs text-content-primary border-b border-line/60 font-medium">{r.period}</td>
                    <td className="px-3 py-2 text-xs tabular-nums text-content-primary border-b border-line/60 text-right">{money(r.total_revenue, 'RON')}</td>
                    <td className="px-3 py-2 text-xs tabular-nums text-content-primary border-b border-line/60 text-right">{money(r.total_expenses, 'RON')}</td>
                    <td className={`px-3 py-2 text-xs tabular-nums border-b border-line/60 text-right font-medium ${r.gross_profit >= 0 ? 'text-status-green' : 'text-status-red'}`}>
                      {money(r.gross_profit, 'RON')}
                    </td>
                    <td className="px-3 py-2 text-xs tabular-nums text-content-muted border-b border-line/60 text-right">{r.margin_percent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
