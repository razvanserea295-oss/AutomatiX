import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { useMaterialStore } from '@/store/materialStore';
import { useProjectStore } from '@/store/projectStore';
import { Page, PageHeader, PageBody, PageToolbar, DataTableCard } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/v2/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';

type Tab = 'stock' | 'movements' | 'reservations' | 'locations';

interface Movement {
  id: number; material_name: string; movement_type: string; quantity: number;
  location_name: string | null; project_name: string | null; created_at: string;
}
interface Reservation {
  id: number; project_name: string; material_name: string;
  quantity_reserved: number; quantity_issued: number; status: string;
}
interface Location { id: number; code: string; name: string; location_type: string; }

const MOVE_LABEL: Record<string, string> = { in: 'Intrare', out: 'Ieșire', transfer: 'Transfer', adjustment: 'Ajustare' };

export default function WarehousePage() {
  const materials = useMaterialStore((s) => s.materials);
  const fetchMaterials = useMaterialStore((s) => s.fetchMaterials);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);

  const [tab, setTab] = useState<Tab>('stock');
  const [movements, setMovements] = useState<Movement[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveForm, setMoveForm] = useState({ material_id: '', movement_type: 'in', quantity: '', notes: '' });

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchMaterials(true),
      fetchProjects(),
      apiCommand<Movement[]>('get_stock_movements').then((d) => setMovements(Array.isArray(d) ? d : [])),
      apiCommand<Reservation[]>('get_stock_reservations').then((d) => setReservations(Array.isArray(d) ? d : [])),
      apiCommand<Location[]>('get_warehouse_locations').then((d) => setLocations(Array.isArray(d) ? d : [])),
    ]).finally(() => setLoading(false));
  }, [fetchMaterials, fetchProjects]);

  useEffect(() => { reload(); }, [reload]);

  const lowStock = useMemo(
    () => materials.filter((m) => m.min_stock > 0 && m.stock <= m.min_stock),
    [materials],
  );

  const recordMovement = async () => {
    try {
      await apiCommand('record_stock_movement', {
        material_id: Number(moveForm.material_id),
        movement_type: moveForm.movement_type,
        quantity: Number(moveForm.quantity),
        notes: moveForm.notes || null,
      });
      toast.success('Mișcare înregistrată');
      setMoveOpen(false);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  return (
    <Page fill>
      <PageHeader
        title="Depozit"
        description={lowStock.length > 0 ? `${lowStock.length} materiale sub stoc minim` : 'Stoc și mișcări'}
        actions={
          <Button size="sm" onClick={() => setMoveOpen(true)}><Plus className="mr-2 h-4 w-4" />Mișcare stoc</Button>
        }
      />

      <PageBody>
        <PageToolbar>
          <Tabs>
            <TabsList>
              {(['stock', 'movements', 'reservations', 'locations'] as Tab[]).map((t) => (
                <TabsTrigger key={t} active={tab === t} onClick={() => setTab(t)}>
                  {t === 'stock' ? 'Stoc' : t === 'movements' ? 'Mișcări' : t === 'reservations' ? 'Rezervări' : 'Locații'}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </PageToolbar>

        <AsyncContent loading={loading} error={null}>
          <DataTableCard>
          {tab === 'stock' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cod</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Stoc</TableHead>
                  <TableHead>Min</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.code}</TableCell>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.stock} {m.unit}</TableCell>
                    <TableCell>{m.min_stock || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {tab === 'movements' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Proiect</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.material_name}</TableCell>
                    <TableCell>{MOVE_LABEL[m.movement_type] || m.movement_type}</TableCell>
                    <TableCell>{m.quantity}</TableCell>
                    <TableCell>{m.project_name || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {tab === 'reservations' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proiect</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Rezervat</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.project_name}</TableCell>
                    <TableCell>{r.material_name}</TableCell>
                    <TableCell>{r.quantity_reserved}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {tab === 'locations' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cod</TableHead>
                  <TableHead>Nume</TableHead>
                  <TableHead>Tip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.code}</TableCell>
                    <TableCell>{l.name}</TableCell>
                    <TableCell>{l.location_type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          </DataTableCard>
        </AsyncContent>
      </PageBody>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Înregistrare mișcare</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Material</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={moveForm.material_id} onChange={(e) => setMoveForm((f) => ({ ...f, material_id: e.target.value }))}>
                <option value="">Selectează…</option>
                {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Tip</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={moveForm.movement_type} onChange={(e) => setMoveForm((f) => ({ ...f, movement_type: e.target.value }))}>
                {Object.entries(MOVE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5"><Label>Cantitate</Label><Input value={moveForm.quantity} onChange={(e) => setMoveForm((f) => ({ ...f, quantity: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Note</Label><Input value={moveForm.notes} onChange={(e) => setMoveForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>Anulează</Button>
            <Button onClick={() => void recordMovement()}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
