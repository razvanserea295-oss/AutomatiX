import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { Package, PackageCheck, Truck } from '@/icons';
import { Page, PageHeader, PageBody, PageKpis, PageSplit, PagePanel, DataTableCard } from '@/v2/components/app/Page';
import { KPICard } from '@/v2/analytics';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface PO { id: number; order_number: string; supplier_name: string; status: string }
interface PODetail {
  id: number; order_number: string; supplier_name: string; status: string;
  lines: { id: number; material_name: string; quantity_ordered: number; quantity_received: number }[];
}

export default function GoodsReceiptsPage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [selected, setSelected] = useState<PODetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiveQty, setReceiveQty] = useState<Record<number, string>>({});
  const [receiving, setReceiving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<PO[]>('get_purchase_orders')
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const receivable = useMemo(
    () => orders.filter((o) => ['sent', 'partial', 'confirmed', 'open'].includes(o.status)),
    [orders],
  );

  const openOrder = async (id: number) => {
    try {
      const detail = await apiCommand<PODetail>('get_purchase_order', { id });
      setSelected(detail);
      const init: Record<number, string> = {};
      for (const l of detail.lines || []) {
        const remaining = (l.quantity_ordered ?? 0) - (l.quantity_received ?? 0);
        if (remaining > 0) init[l.id] = String(remaining);
      }
      setReceiveQty(init);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const receiveLine = async (lineId: number) => {
    const qty = Number(receiveQty[lineId]);
    if (!qty || qty <= 0) { toast.error('Cantitate invalidă'); return; }
    setReceiving(true);
    try {
      await apiCommand('receive_purchase_line', {
        request: { purchase_order_line_id: lineId, qty_received: qty },
      });
      toast.success('Recepție înregistrată');
      if (selected) await openOrder(selected.id);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setReceiving(false);
    }
  };

  const kpis = useMemo(() => ({
    comenzi: receivable.length,
    all: orders.length,
    finalizate: orders.filter((o) => o.status === 'completed' || o.status === 'received').length,
  }), [orders, receivable]);

  return (
    <Page fill>
      <PageHeader title="Recepții marfă" description="Înregistrare recepții pe comenzi furnizori" />
      <PageBody>
        <PageKpis>
          <KPICard label="De recepționat" value={kpis.comenzi} icon={<Truck className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Total comenzi" value={kpis.all} icon={<Package className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Finalizate" value={kpis.finalizate} icon={<PackageCheck className="h-4 w-4 text-muted-foreground" />} />
        </PageKpis>
        <AsyncContent loading={loading} error={null} empty={receivable.length === 0} emptyMessage="Nicio comandă de recepționat.">
          <PageSplit variant="default">
            <DataTableCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comandă</TableHead>
                    <TableHead>Furnizor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody stagger>
                  {receivable.map((o) => (
                    <TableRow
                      key={o.id}
                      className={`cursor-pointer ${selected?.id === o.id ? 'bg-muted/50' : ''}`}
                      onClick={() => void openOrder(o.id)}
                    >
                      <TableCell className="font-medium">{o.order_number}</TableCell>
                      <TableCell>{o.supplier_name}</TableCell>
                      <TableCell><StatusBadge status={o.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableCard>

            <PagePanel scroll>
              <div className="space-y-3 p-[var(--density-card-p)] text-[length:var(--density-fs-body)]">
                {!selected ? (
                  <p className="text-muted-foreground">Selectează o comandă pentru recepție.</p>
                ) : (
                  <>
                    <div>
                      <h3 className="font-semibold">{selected.order_number}</h3>
                      <p className="density-meta text-muted-foreground">{selected.supplier_name}</p>
                    </div>
                    {(selected.lines || []).map((l) => {
                      const remaining = (l.quantity_ordered ?? 0) - (l.quantity_received ?? 0);
                      if (remaining <= 0) return null;
                      return (
                        <div key={l.id} className="rounded border p-3 space-y-2">
                          <p className="font-medium">{l.material_name}</p>
                          <p className="density-meta text-muted-foreground">Rămas: {remaining} / {l.quantity_ordered}</p>
                          <div className="flex gap-2 items-end">
                            <div className="grid gap-1 flex-1">
                              <Label>Recepționează</Label>
                              <Input value={receiveQty[l.id] ?? ''} onChange={(e) => setReceiveQty((q) => ({ ...q, [l.id]: e.target.value }))} />
                            </div>
                            <Button size="sm" disabled={receiving} onClick={() => void receiveLine(l.id)}>Confirmă</Button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </PagePanel>
          </PageSplit>
        </AsyncContent>
      </PageBody>
    </Page>
  );
}
