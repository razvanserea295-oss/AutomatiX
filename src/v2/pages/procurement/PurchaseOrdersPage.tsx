import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, ShoppingCart, Clock, PackageCheck, DollarSign } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { useMaterialStore } from '@/store/materialStore';
import { useProjectStore } from '@/store/projectStore';
import { formatNumber } from '@/lib/format';
import { Page, PageHeader, PageBody, PageKpis, PageSplit, PagePanel, PageToolbar, PageSearch, DataTableCard } from '@/v2/components/app/Page';
import { KPICard } from '@/v2/analytics';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface PO {
  id: number; order_number: string; supplier_name: string; status: string; total: number;
}
interface PODetail extends PO {
  internal_ref?: string | null;
  lines: { id: number; material_name: string; quantity_ordered: number; quantity_received: number; unit_price?: number }[];
}
interface Supplier { id: number; name: string }

type LineDraft = { material_id: string; qty: string };

export default function PurchaseOrdersPage() {
  const materials = useMaterialStore((s) => s.materials);
  const fetchMaterials = useMaterialStore((s) => s.fetchMaterials);
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);

  const [orders, setOrders] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<PODetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveLine, setReceiveLine] = useState<{ id: number; material_name: string; remaining: number } | null>(null);
  const [receiveQty, setReceiveQty] = useState('');
  const [form, setForm] = useState({
    supplier_id: '', project_id: '', internal_ref: '',
    lines: [{ material_id: '', qty: '1' }] as LineDraft[],
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiCommand<PO[]>('get_purchase_orders'),
      apiCommand<Supplier[]>('get_suppliers'),
      fetchMaterials(),
      fetchProjects(),
    ])
      .then(([o, s]) => {
        setOrders(Array.isArray(o) ? o : []);
        setSuppliers(Array.isArray(s) ? s : []);
      })
      .finally(() => setLoading(false));
  }, [fetchMaterials, fetchProjects]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      setDetail(await apiCommand<PODetail>('get_purchase_order', { id }));
    } catch {
      toast.error('Nu s-a putut încărca comanda');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { material_id: '', qty: '1' }] }));
  const updateLine = (i: number, patch: Partial<LineDraft>) => {
    setForm((f) => ({ ...f, lines: f.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }));
  };

  const create = async () => {
    const validLines = form.lines
      .filter((l) => l.material_id && Number(l.qty) > 0)
      .map((l) => ({ material_id: Number(l.material_id), qty_ordered: Number(l.qty) }));
    if (!form.supplier_id || !form.project_id || validLines.length === 0) {
      toast.error('Furnizor, proiect și cel puțin o linie sunt obligatorii');
      return;
    }
    setSaving(true);
    try {
      await apiCommand('create_purchase_order', {
        supplier_id: Number(form.supplier_id),
        project_id: Number(form.project_id),
        internal_ref: form.internal_ref.trim() || null,
        lines: validLines,
      });
      toast.success('Comandă creată');
      setCreateOpen(false);
      setForm({ supplier_id: '', project_id: '', internal_ref: '', lines: [{ material_id: '', qty: '1' }] });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setSaving(false);
    }
  };

  const openReceive = (line: PODetail['lines'][number]) => {
    const remaining = line.quantity_ordered - line.quantity_received;
    if (remaining <= 0) return;
    setReceiveLine({ id: line.id, material_name: line.material_name, remaining });
    setReceiveQty(String(remaining));
    setReceiveOpen(true);
  };

  const confirmReceive = async () => {
    if (!receiveLine) return;
    const qty = Number(receiveQty);
    if (!qty || qty <= 0 || qty > receiveLine.remaining) {
      toast.error('Cantitate invalidă');
      return;
    }
    try {
      await apiCommand('receive_purchase_line', {
        request: { purchase_order_line_id: receiveLine.id, qty_received: qty },
      });
      toast.success('Recepție înregistrată');
      setReceiveOpen(false);
      if (detail) void openDetail(detail.id);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const selectedId = detail?.id ?? null;

  const kpis = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((o) => ['open', 'draft'].includes(o.status)).length,
    partial: orders.filter((o) => o.status === 'partial').length,
    valoare: orders.reduce((s, o) => s + (o.total || 0), 0),
  }), [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      [o.order_number, o.supplier_name].some((v) => (v || '').toLowerCase().includes(q)),
    );
  }, [orders, search]);

  return (
    <Page fill>
      <PageHeader
        title="Comenzi furnizori"
        description="Achiziții materiale"
        actions={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Comandă nouă</Button>}
      />
      <PageBody>
        <PageKpis>
          <KPICard label="Total comenzi" value={kpis.total} icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="În așteptare" value={kpis.pending} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Parțial recepționate" value={kpis.partial} icon={<PackageCheck className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Valoare totală" value={kpis.valoare} format="integer" icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
        </PageKpis>
        <PageToolbar>
          <PageSearch placeholder="Caută comenzi…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </PageToolbar>
        <AsyncContent loading={loading} error={null} empty={filtered.length === 0}>
          <PageSplit variant="detail">
            <DataTableCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comandă</TableHead>
                    <TableHead>Furnizor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody stagger>
                  {filtered.map((o) => (
                    <TableRow
                      key={o.id}
                      className={`cursor-pointer ${selectedId === o.id ? 'bg-muted/50' : ''}`}
                      onClick={() => void openDetail(o.id)}
                    >
                      <TableCell className="font-medium">{o.order_number}</TableCell>
                      <TableCell>{o.supplier_name}</TableCell>
                      <TableCell><StatusBadge status={o.status} /></TableCell>
                      <TableCell className="tabular-nums">{formatNumber(o.total)} RON</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableCard>

            <PagePanel scroll>
              <div className="space-y-3 p-[var(--density-card-p)] text-[length:var(--density-fs-body)]">
                {detailLoading ? (
                  <p className="text-muted-foreground">Se încarcă…</p>
                ) : !detail ? (
                  <p className="text-muted-foreground">Selectează o comandă.</p>
                ) : (
                  <>
                    <div>
                      <h3 className="font-semibold">{detail.order_number}</h3>
                      <p className="density-meta text-muted-foreground">{detail.supplier_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={detail.status} />
                      {detail.internal_ref && <span className="density-meta text-muted-foreground">Ref: {detail.internal_ref}</span>}
                    </div>
                    <p className="font-medium tabular-nums">{formatNumber(detail.total)} RON</p>
                    <div>
                      <p className="density-meta mb-2 font-semibold uppercase tracking-wide text-muted-foreground">Linii</p>
                      {(detail.lines || []).map((l) => {
                        const remaining = l.quantity_ordered - l.quantity_received;
                        return (
                          <div key={l.id} className="mb-2 rounded border px-2 py-1.5">
                            <p className="font-medium">{l.material_name}</p>
                            <p className="density-meta text-muted-foreground">
                              Comandat: {l.quantity_ordered} · Recepționat: {l.quantity_received}
                            </p>
                            {remaining > 0 && (
                              <Button size="sm" variant="outline" className="mt-1 h-7" onClick={() => openReceive(l)}>
                                Recepționează ({remaining} rămas)
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </PagePanel>
          </PageSplit>
        </AsyncContent>
      </PageBody>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Comandă nouă</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Furnizor</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={form.supplier_id} onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}>
                <option value="">Selectează…</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Proiect</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={form.project_id} onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}>
                <option value="">Selectează…</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5"><Label>Referință internă</Label><Input value={form.internal_ref} onChange={(e) => setForm((f) => ({ ...f, internal_ref: e.target.value }))} /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Articole</Label>
                <Button type="button" size="sm" variant="ghost" onClick={addLine}>+ Linie</Button>
              </div>
              {form.lines.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <select className="h-9 flex-1 rounded-md border px-2 text-sm" value={l.material_id} onChange={(e) => updateLine(i, { material_id: e.target.value })}>
                    <option value="">Material…</option>
                    {materials.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
                  </select>
                  <Input className="w-20" value={l.qty} onChange={(e) => updateLine(i, { qty: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Anulează</Button>
            <Button disabled={saving} onClick={() => void create()}>{saving ? 'Se salvează…' : 'Creează'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recepție — {receiveLine?.material_name}</DialogTitle></DialogHeader>
          <div className="grid gap-1.5">
            <Label>Cantitate (max {receiveLine?.remaining ?? '—'})</Label>
            <Input value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>Anulează</Button>
            <Button onClick={() => void confirmReceive()}>Confirmă</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
