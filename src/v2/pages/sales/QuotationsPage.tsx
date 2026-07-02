import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Send, Trash2, Check, X } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { useClientStore } from '@/store/clientStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import { formatDateRo, formatNumber } from '@/lib/format';
import { Page, PageHeader, PageBody, PageToolbar, PageSearch, PageKpis, PageSplit, PagePanel, DataTableCard } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { KPICard } from '@/v2/analytics';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';

interface QuotationLine {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  total?: number;
}

interface Quotation {
  id: number;
  quotation_number: string;
  client_name: string;
  contact_email: string | null;
  title: string;
  status: string;
  total: number;
  currency: string;
  valid_until: string | null;
  created_at: string;
  lines: QuotationLine[];
  events?: { event_type: string; actor_name: string | null; created_at: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Ciornă', sent: 'Trimisă', viewed: 'Vizualizată', accepted: 'Acceptată',
  rejected: 'Refuzată', expired: 'Expirată', converted: 'Convertită',
};

export default function QuotationsPage() {
  const clients = useClientStore((s) => s.clients);
  const fetchClients = useClientStore((s) => s.fetchClients);

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    client_id: '', client_name: '', contact_email: '', title: '', valid_until: '',
    line_desc: '', line_qty: '1', line_price: '',
  });

  const fetchAll = useCallback(() => {
    setLoading(true);
    apiCommand<Quotation[]>('list_quotations')
      .then((qs) => {
        setQuotations(Array.isArray(qs) ? qs : []);
      })
      .catch(() => toast.error('Nu s-au putut încărca ofertele'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void fetchClients();
    fetchAll();
  }, [fetchClients, fetchAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quotations;
    return quotations.filter((x) =>
      [x.quotation_number, x.client_name, x.title].some((v) => (v || '').toLowerCase().includes(q)),
    );
  }, [quotations, search]);

  const kpis = useMemo(() => {
    const fromList = {
      draft: filtered.filter((q) => q.status === 'draft').length,
      sent: filtered.filter((q) => q.status === 'sent' || q.status === 'viewed').length,
      accepted: filtered.filter((q) => q.status === 'accepted' || q.status === 'converted').length,
      pipeline: filtered.reduce((s, q) => s + (q.total || 0), 0),
    };
    return fromList;
  }, [filtered]);

  const create = async () => {
    if (!form.client_name.trim() || !form.title.trim() || !form.line_desc.trim() || !form.line_price) {
      toast.error('Completează client, titlu și o poziție cu preț');
      return;
    }
    try {
      const created = await apiCommand<Quotation>('create_quotation', {
        request: {
          client_id: form.client_id ? Number(form.client_id) : null,
          client_name: form.client_name.trim(),
          contact_email: form.contact_email || null,
          title: form.title.trim(),
          valid_until: form.valid_until || null,
          currency: 'RON',
          tva_rate: 19,
          discount_percent: 0,
          lines: [{
            description: form.line_desc.trim(),
            quantity: Number(form.line_qty) || 1,
            unit: 'buc',
            unit_price: Number(form.line_price),
            discount_percent: 0,
          }],
        },
      });
      toast.success('Ofertă creată');
      setCreateOpen(false);
      setSelected(created);
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const send = async (q: Quotation) => {
    try {
      await apiCommand('send_quotation', { quotation_id: q.id, to_email: q.contact_email || '' });
      toast.success('Ofertă trimisă');
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const decide = async (q: Quotation, decision: 'accept' | 'reject') => {
    try {
      await apiCommand('decide_quotation', { quotation_id: q.id, decision, reason: null });
      toast.success(decision === 'accept' ? 'Ofertă acceptată' : 'Ofertă refuzată');
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const remove = async (q: Quotation) => {
    const ok = await confirmDialog({ title: 'Șterge oferta', body: q.quotation_number, danger: true });
    if (!ok) return;
    try {
      await apiCommand('delete_quotation', { quotation_id: q.id });
      if (selected?.id === q.id) setSelected(null);
      toast.success('Ofertă ștearsă');
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  return (
    <Page fill>
      <PageHeader
        title="Oferte"
        description="Oferte comerciale — KPI-urile reflectă lista filtrată"
        actions={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Ofertă nouă</Button>}
      />

      <PageBody>
        <PageKpis>
          <KPICard label="Ciorne" value={kpis.draft} />
          <KPICard label="Trimise" value={kpis.sent} />
          <KPICard label="Acceptate" value={kpis.accepted} />
          <KPICard label="Valoare listă" value={kpis.pipeline} format="integer" />
        </PageKpis>

        <PageToolbar>
          <PageSearch placeholder="Caută oferte…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </PageToolbar>

        <AsyncContent loading={loading} error={null} empty={filtered.length === 0}>
          <PageSplit variant="detail">
            <PagePanel scroll>
              <div className="divide-y">
                {filtered.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setSelected(q)}
                    className={`density-list-item w-full text-left hover:bg-muted/50 ${selected?.id === q.id ? 'bg-muted' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{q.quotation_number}</span>
                      <StatusBadge status={STATUS_LABEL[q.status] || q.status} />
                    </div>
                    <p className="density-meta truncate text-muted-foreground">{q.client_name}</p>
                    <p className="density-meta font-medium tabular-nums">{formatNumber(q.total)} {q.currency}</p>
                  </button>
                ))}
              </div>
            </PagePanel>

            <PagePanel scroll>
              {!selected ? (
                <p className="density-meta p-[var(--density-card-p)] text-muted-foreground">Selectează o ofertă din listă.</p>
              ) : (
                <div className="space-y-[var(--density-gap-section)] p-[var(--density-card-p)]">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="density-page-title">{selected.title}</h3>
                      <p className="density-meta text-muted-foreground">{selected.client_name} · {selected.quotation_number}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selected.status === 'draft' && (
                        <Button size="sm" onClick={() => void send(selected)}><Send className="mr-1 h-4 w-4" />Trimite</Button>
                      )}
                      {(selected.status === 'sent' || selected.status === 'viewed') && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => void decide(selected, 'accept')}><Check className="mr-1 h-4 w-4" />Acceptă</Button>
                          <Button size="sm" variant="outline" onClick={() => void decide(selected, 'reject')}><X className="mr-1 h-4 w-4" />Refuză</Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => void remove(selected)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <p className="text-sm">Total: <strong>{formatNumber(selected.total)} {selected.currency}</strong></p>
                  {selected.valid_until && <p className="text-sm text-muted-foreground">Valabilă până: {formatDateRo(selected.valid_until)}</p>}
                  <DataTableCard className="shadow-none">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descriere</TableHead>
                        <TableHead>Cant.</TableHead>
                        <TableHead>Preț</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selected.lines || []).map((l, i) => (
                        <TableRow key={i}>
                          <TableCell>{l.description}</TableCell>
                          <TableCell>{l.quantity} {l.unit}</TableCell>
                          <TableCell>{formatNumber(l.unit_price)}</TableCell>
                          <TableCell>{formatNumber(l.total ?? l.quantity * l.unit_price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </DataTableCard>
                </div>
              )}
            </PagePanel>
          </PageSplit>
        </AsyncContent>
      </PageBody>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Ofertă nouă</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Client existent</Label>
              <select
                className="h-9 rounded-md border px-3 text-sm"
                value={form.client_id}
                onChange={(e) => {
                  const c = clients.find((x) => x.id === Number(e.target.value));
                  setForm((f) => ({
                    ...f,
                    client_id: e.target.value,
                    client_name: c?.name || f.client_name,
                    contact_email: c?.email || f.contact_email,
                  }));
                }}
              >
                <option value="">— manual —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5"><Label>Nume client</Label><Input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Email</Label><Input value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Titlu ofertă</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Valabil până</Label><Input type="date" value={form.valid_until} onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Poziție</Label><Input value={form.line_desc} onChange={(e) => setForm((f) => ({ ...f, line_desc: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5"><Label>Cantitate</Label><Input value={form.line_qty} onChange={(e) => setForm((f) => ({ ...f, line_qty: e.target.value }))} /></div>
              <div className="grid gap-1.5"><Label>Preț unitar</Label><Input value={form.line_price} onChange={(e) => setForm((f) => ({ ...f, line_price: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Anulează</Button>
            <Button onClick={() => void create()}>Creează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
