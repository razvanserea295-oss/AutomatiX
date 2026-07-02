import { useCallback, useEffect, useState } from 'react';
import { Plus } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { useClientStore } from '@/store/clientStore';
import { useProjectStore } from '@/store/projectStore';
import { formatDateRo, formatNumber } from '@/lib/format';
import { Page, PageHeader, PageBody, PageToolbar, PageKpis, DataTableCard } from '@/v2/components/app/Page';
import { KPICard } from '@/v2/analytics';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Card } from '@/v2/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/v2/components/ui/tabs';

type Tab = 'overview' | 'invoices' | 'expenses';

interface Overview {
  total_actual_revenue?: number;
  total_actual_cost?: number;
  total_actual_profit?: number;
}
interface ProjectRow {
  id: number; name: string; actual_revenue?: number; actual_cost?: number; actual_profit?: number;
}
interface Invoice {
  id: number; invoice_number: string; project_name: string; client_name: string;
  status: string; total: number; paid_amount: number; remaining: number; due_date: string;
}
interface Expense {
  id: number; project_name: string; category: string; description: string; amount: number; date: string;
}

const EXPENSE_CATEGORIES: Record<string, string> = {
  manopera: 'Manoperă',
  transport: 'Transport',
  subcontractori: 'Subcontractori',
  utilitati: 'Utilități',
  inchirieri_utilaje: 'Închirieri utilaje',
  deplasari: 'Deplasări',
  diurna: 'Diurnă',
  materiale_directe: 'Materiale directe',
  consumabile: 'Consumabile',
  proiectare: 'Proiectare',
  altele: 'Altele',
};

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<Overview>({});
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const clients = useClientStore((s) => s.clients);
  const fetchClients = useClientStore((s) => s.fetchClients);
  const projs = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [invForm, setInvForm] = useState({
    project_id: '', client_id: '', issue_date: '', due_date: '', line_desc: '', line_qty: '1', line_price: '',
  });
  const [payAmount, setPayAmount] = useState('');

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expForm, setExpForm] = useState({
    project_id: '', category: 'materiale_directe', description: '', amount: '', date: new Date().toISOString().slice(0, 10),
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiCommand<Overview>('get_finance_overview'),
      apiCommand<ProjectRow[]>('get_finance_projects'),
      apiCommand<Invoice[]>('get_invoices'),
      apiCommand<Expense[]>('get_project_expenses'),
    ])
      .then(([o, p, inv, exp]) => {
        setOverview(o || {});
        setProjects(Array.isArray(p) ? p : []);
        setInvoices(Array.isArray(inv) ? inv : []);
        setExpenses(Array.isArray(exp) ? exp : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    void fetchClients();
    void fetchProjects();
  }, [load, fetchClients, fetchProjects]);

  const createInvoice = async () => {
    if (!invForm.project_id || !invForm.client_id || !invForm.issue_date || !invForm.due_date || !invForm.line_desc) {
      toast.error('Completează câmpurile obligatorii');
      return;
    }
    try {
      await apiCommand('create_finance_invoice', {
        project_id: Number(invForm.project_id),
        client_id: Number(invForm.client_id),
        issue_date: invForm.issue_date,
        due_date: invForm.due_date,
        currency: 'RON',
        lines: [{
          description: invForm.line_desc,
          quantity: Number(invForm.line_qty) || 1,
          unit_price: Number(invForm.line_price) || 0,
        }],
      });
      toast.success('Factură emisă');
      setInvoiceOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const recordPayment = async () => {
    if (!payTarget) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { toast.error('Sumă invalidă'); return; }
    try {
      await apiCommand('record_invoice_payment', {
        invoice_id: payTarget.id,
        amount,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: 'transfer',
      });
      toast.success('Plată înregistrată');
      setPayOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const createExpense = async () => {
    if (!expForm.project_id || !expForm.description.trim() || !expForm.amount) {
      toast.error('Completează câmpurile obligatorii');
      return;
    }
    try {
      await apiCommand('create_project_expense', {
        project_id: Number(expForm.project_id),
        category: expForm.category,
        description: expForm.description.trim(),
        amount: Number(expForm.amount),
        currency: 'RON',
        date: expForm.date,
      });
      toast.success('Cheltuială înregistrată');
      setExpenseOpen(false);
      setExpForm({
        project_id: '', category: 'materiale_directe', description: '', amount: '',
        date: new Date().toISOString().slice(0, 10),
      });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  return (
    <Page fill>
      <PageHeader
        title="Financiar"
        description="Venituri, facturi și cheltuieli"
        actions={
          tab === 'invoices' ? (
            <Button size="sm" onClick={() => setInvoiceOpen(true)}><Plus className="mr-2 h-4 w-4" />Factură nouă</Button>
          ) : tab === 'expenses' ? (
            <Button size="sm" onClick={() => setExpenseOpen(true)}><Plus className="mr-2 h-4 w-4" />Cheltuială nouă</Button>
          ) : undefined
        }
      />

      <PageBody>
        <PageToolbar>
          <Tabs>
            <TabsList>
              <TabsTrigger active={tab === 'overview'} onClick={() => setTab('overview')}>Prezentare</TabsTrigger>
              <TabsTrigger active={tab === 'invoices'} onClick={() => setTab('invoices')}>Facturi</TabsTrigger>
              <TabsTrigger active={tab === 'expenses'} onClick={() => setTab('expenses')}>Cheltuieli</TabsTrigger>
            </TabsList>
          </Tabs>
        </PageToolbar>

        <AsyncContent loading={loading} error={null}>
          {tab === 'overview' && (
            <>
              <PageKpis>
                <KPICard label="Venituri" value={overview.total_actual_revenue ?? 0} format="integer" />
                <KPICard label="Costuri" value={overview.total_actual_cost ?? 0} format="integer" />
                <KPICard label="Profit" value={overview.total_actual_profit ?? 0} format="integer" />
              </PageKpis>
              <Card className="v2-panel min-h-0 flex-1 divide-y shadow-none">
                {projects.map((p) => (
                  <div key={p.id} className="density-list-item flex items-center justify-between text-[length:var(--density-fs-body)]">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">{formatNumber(p.actual_profit ?? 0)} RON</span>
                  </div>
                ))}
              </Card>
            </>
          )}

          {tab === 'invoices' && (
            <DataTableCard>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factură</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Rest</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.client_name}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell>{formatNumber(inv.total)}</TableCell>
                    <TableCell>{formatNumber(inv.remaining)}</TableCell>
                    <TableCell>
                      {inv.remaining > 0 && (
                        <Button size="sm" variant="outline" onClick={() => { setPayTarget(inv); setPayAmount(String(inv.remaining)); setPayOpen(true); }}>
                          Încasează
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </DataTableCard>
          )}

          {tab === 'expenses' && (
            <DataTableCard>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proiect</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Descriere</TableHead>
                  <TableHead>Sumă</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.project_name}</TableCell>
                    <TableCell>{EXPENSE_CATEGORIES[e.category] || e.category}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell>{formatNumber(e.amount)}</TableCell>
                    <TableCell>{formatDateRo(e.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </DataTableCard>
          )}
        </AsyncContent>
      </PageBody>

      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Factură nouă</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Proiect</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={invForm.project_id} onChange={(e) => setInvForm((f) => ({ ...f, project_id: e.target.value }))}>
                <option value="">Selectează…</option>
                {projs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Client</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={invForm.client_id} onChange={(e) => setInvForm((f) => ({ ...f, client_id: e.target.value }))}>
                <option value="">Selectează…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5"><Label>Emitere</Label><Input type="date" value={invForm.issue_date} onChange={(e) => setInvForm((f) => ({ ...f, issue_date: e.target.value }))} /></div>
              <div className="grid gap-1.5"><Label>Scadență</Label><Input type="date" value={invForm.due_date} onChange={(e) => setInvForm((f) => ({ ...f, due_date: e.target.value }))} /></div>
            </div>
            <div className="grid gap-1.5"><Label>Descriere linie</Label><Input value={invForm.line_desc} onChange={(e) => setInvForm((f) => ({ ...f, line_desc: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5"><Label>Cantitate</Label><Input value={invForm.line_qty} onChange={(e) => setInvForm((f) => ({ ...f, line_qty: e.target.value }))} /></div>
              <div className="grid gap-1.5"><Label>Preț unitar</Label><Input value={invForm.line_price} onChange={(e) => setInvForm((f) => ({ ...f, line_price: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>Anulează</Button>
            <Button onClick={() => void createInvoice()}>Emite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Încasează — {payTarget?.invoice_number}</DialogTitle></DialogHeader>
          <div className="grid gap-1.5">
            <Label>Sumă (rest: {payTarget ? formatNumber(payTarget.remaining) : '—'})</Label>
            <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Anulează</Button>
            <Button onClick={() => void recordPayment()}>Confirmă</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cheltuială nouă</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Proiect</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={expForm.project_id} onChange={(e) => setExpForm((f) => ({ ...f, project_id: e.target.value }))}>
                <option value="">Selectează…</option>
                {projs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Categorie</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={expForm.category} onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))}>
                {Object.entries(EXPENSE_CATEGORIES).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Descriere</Label>
              <Input value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label>Sumă (RON)</Label>
                <Input value={expForm.amount} onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>Data</Label>
                <Input type="date" value={expForm.date} onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseOpen(false)}>Anulează</Button>
            <Button onClick={() => void createExpense()}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
