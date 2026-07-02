import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, FileText, CheckCircle, Clock, DollarSign } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { useClientStore } from '@/store/clientStore';
import { useProjectStore } from '@/store/projectStore';
import { formatDateRo, formatNumber } from '@/lib/format';
import { Page, PageHeader, PageBody, PageToolbar, PageSearch, PageKpis, PageSplit, PagePanel, DataTableCard } from '@/v2/components/app/Page';
import { KPICard } from '@/v2/analytics';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface Contract {
  id: number; contract_code: string; title: string; client_name: string;
  status: string; sale_price: number; revision: number; created_at: string;
  delivered_product?: string | null;
}
interface Attachment {
  id: number; filename: string | null; created_at: string;
}

export default function ContractsPage() {
  const clients = useClientStore((s) => s.clients);
  const fetchClients = useClientStore((s) => s.fetchClients);
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Contract | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    project_id: '', client_id: '', title: '', delivered_product: '', sale_price: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<Contract[]>('get_contracts')
      .then((d) => setContracts(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    void fetchClients();
    void fetchProjects();
  }, [load, fetchClients, fetchProjects]);

  useEffect(() => {
    if (!selected) { setAttachments([]); return; }
    apiCommand<Attachment[]>('list_contract_attachments', { contract_id: selected.id })
      .then((a) => setAttachments(Array.isArray(a) ? a : []))
      .catch(() => setAttachments([]));
  }, [selected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((c) =>
      [c.contract_code, c.title, c.client_name].some((v) => (v || '').toLowerCase().includes(q)),
    );
  }, [contracts, search]);

  const kpis = useMemo(() => ({
    total: contracts.length,
    active: contracts.filter((c) => c.status === 'activ' || c.status === 'active' || c.status === 'in_executie').length,
    finalizat: contracts.filter((c) => c.status === 'finalizat' || c.status === 'completed').length,
    valoare: contracts.reduce((s, c) => s + (c.sale_price || 0), 0),
  }), [contracts]);

  const create = async () => {
    if (!form.client_id || !form.title.trim()) {
      toast.error('Client și titlu sunt obligatorii');
      return;
    }
    try {
      const c = await apiCommand<Contract>('create_contract', {
        project_id: form.project_id ? Number(form.project_id) : undefined,
        client_id: Number(form.client_id),
        title: form.title.trim(),
        delivered_product: form.delivered_product || null,
        sale_price: Number(form.sale_price) || 0,
        execution_term: null,
      });
      toast.success('Contract creat');
      setCreateOpen(false);
      setForm({ project_id: '', client_id: '', title: '', delivered_product: '', sale_price: '' });
      setSelected(c);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  return (
    <Page fill>
      <PageHeader
        title="Contracte"
        description="Contracte comerciale și revizii"
        actions={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Contract nou</Button>}
      />

      <PageBody>
        <PageKpis>
          <KPICard label="Total" value={kpis.total} icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Active" value={kpis.active} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Finalizate" value={kpis.finalizat} icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Valoare totală" value={kpis.valoare} format="integer" icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
        </PageKpis>

        <PageToolbar>
          <PageSearch placeholder="Caută contracte…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </PageToolbar>

        <AsyncContent loading={loading} error={null} empty={filtered.length === 0}>
          <PageSplit variant="detail">
            <DataTableCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valoare</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody stagger>
                  {filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer ${selected?.id === c.id ? 'bg-muted/50' : ''}`}
                      onClick={() => setSelected(c)}
                    >
                      <TableCell className="font-medium">{c.contract_code}</TableCell>
                      <TableCell>{c.client_name}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="tabular-nums">{formatNumber(c.sale_price)} RON</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableCard>

            <PagePanel scroll>
              {!selected ? (
                <p className="density-meta p-[var(--density-card-p)] text-muted-foreground">Selectează un contract.</p>
              ) : (
                <div className="space-y-3 p-[var(--density-card-p)] text-[length:var(--density-fs-body)]">
                  <div>
                    <h3 className="density-page-title font-semibold">{selected.title}</h3>
                    <p className="density-meta text-muted-foreground">{selected.client_name} · {selected.contract_code}</p>
                  </div>
                  <StatusBadge status={selected.status} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="density-meta text-muted-foreground">Valoare</p>
                      <p className="font-medium tabular-nums">{formatNumber(selected.sale_price)} RON</p>
                    </div>
                    <div>
                      <p className="density-meta text-muted-foreground">Revizie</p>
                      <p className="font-medium">#{selected.revision}</p>
                    </div>
                    <div>
                      <p className="density-meta text-muted-foreground">Creat</p>
                      <p>{formatDateRo(selected.created_at)}</p>
                    </div>
                    {selected.delivered_product && (
                      <div>
                        <p className="density-meta text-muted-foreground">Produs livrat</p>
                        <p>{selected.delivered_product}</p>
                      </div>
                    )}
                  </div>
                  {attachments.length > 0 && (
                    <div>
                      <p className="density-meta mb-1 font-semibold uppercase tracking-wide text-muted-foreground">Atașamente</p>
                      <ul className="space-y-1">
                        {attachments.map((a) => (
                          <li key={a.id} className="density-meta rounded border px-2 py-1">{a.filename}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </PagePanel>
          </PageSplit>
        </AsyncContent>
      </PageBody>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Contract nou</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Proiect</Label>
              <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.project_id} onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}>
                <option value="">➕ Creează proiect automat (din titlu)</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">Lasă gol și se creează automat un proiect pentru acest contract.</p>
            </div>
            <div className="grid gap-1.5">
              <Label>Client *</Label>
              <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}>
                <option value="">Selectează…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5"><Label>Titlu *</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Produs livrat</Label><Input value={form.delivered_product} onChange={(e) => setForm((f) => ({ ...f, delivered_product: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Preț vânzare (RON)</Label><Input type="number" value={form.sale_price} onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value }))} /></div>
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
