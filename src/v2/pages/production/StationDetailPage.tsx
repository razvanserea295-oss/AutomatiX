import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Pencil, Plus, Trash2 } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { confirmDialog } from '@/components/ConfirmDialog';
import { formatDateRo, formatNumber } from '@/lib/format';
import { Page, PageHeader } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Card, CardContent } from '@/v2/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/v2/components/ui/tabs';

interface StationDetail {
  id: number;
  code: string;
  name: string;
  client_name: string;
  project_name: string | null;
  location: string | null;
  station_type: string | null;
  status: string;
  delivery_date: string | null;
  commissioning_date: string | null;
  warranty_end_date: string | null;
  internal_manager_name: string | null;
  notes: string | null;
}

interface Intervention {
  id: number;
  intervention_type: string;
  reason: string | null;
  open_date: string;
  status: string;
  is_urgent: boolean;
}

interface MaintenancePlan {
  id: number;
  maintenance_type: string;
  periodicity_days: number;
  next_execution_date: string | null;
  status: string;
}

interface PartsRequest {
  id: number;
  part_name: string;
  part_code: string | null;
  quantity: number;
  status: string;
  supplier: string | null;
  estimated_cost: number | null;
}

interface ChangeRequest {
  id: number;
  requested_by_name: string;
  request_date: string;
  description: string;
  priority: string;
  status: string;
}

interface ActivityLog {
  id: number;
  action_type: string;
  description: string | null;
  created_at: string;
}

type Tab = 'overview' | 'interventions' | 'maintenance' | 'parts' | 'changes' | 'activity';

function stationIdFromHash(): number | null {
  const m = window.location.hash.match(/\/v2\/stations\/(\d+)/);
  return m ? Number(m[1]) : null;
}

export default function StationDetailPage() {
  const [stationId] = useState(() => stationIdFromHash());
  const [tab, setTab] = useState<Tab>('overview');
  const [station, setStation] = useState<StationDetail | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [parts, setParts] = useState<PartsRequest[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [intOpen, setIntOpen] = useState(false);
  const [intForm, setIntForm] = useState({ intervention_type: 'correctiva', reason: '', is_urgent: false });

  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    maintenance_type: 'Revizie generală',
    periodicity_days: '90',
    next_execution_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    notes: '',
  });

  const [partOpen, setPartOpen] = useState(false);
  const [partForm, setPartForm] = useState({
    part_name: '', part_code: '', quantity: '1', supplier: '', estimated_cost: '0', reason: '',
  });

  const [changeOpen, setChangeOpen] = useState(false);
  const [changeForm, setChangeForm] = useState({
    requested_by_name: '', description: '', priority: 'normal',
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', location: '', station_type: '', status: 'operational', notes: '',
  });

  const loadTabData = useCallback((id: number) => {
    Promise.all([
      apiCommand<Intervention[]>('get_station_interventions', { station_id: id }),
      apiCommand<MaintenancePlan[]>('get_station_maintenance_plans', { station_id: id }),
      apiCommand<PartsRequest[]>('get_station_parts', { station_id: id }),
      apiCommand<ChangeRequest[]>('get_station_change_requests', { station_id: id }),
      apiCommand<ActivityLog[]>('get_station_activity', { station_id: id }),
    ])
      .then(([iv, mp, pr, cr, ac]) => {
        setInterventions(Array.isArray(iv) ? iv : []);
        setPlans(Array.isArray(mp) ? mp : []);
        setParts(Array.isArray(pr) ? pr : []);
        setChanges(Array.isArray(cr) ? cr : []);
        setActivity(Array.isArray(ac) ? ac : []);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    if (!stationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiCommand<StationDetail>('get_station_by_id', { id: stationId })
      .then((s) => {
        setStation(s);
        loadTabData(stationId);
      })
      .catch(() => setStation(null))
      .finally(() => setLoading(false));
  }, [stationId, loadTabData]);

  useEffect(() => { load(); }, [load]);

  const refresh = () => {
    if (stationId) loadTabData(stationId);
  };

  const createIntervention = async () => {
    if (!stationId) return;
    try {
      await apiCommand('create_intervention', {
        station_id: stationId,
        intervention_type: intForm.intervention_type,
        reason: intForm.reason.trim() || null,
        is_urgent: intForm.is_urgent,
        status: 'deschis',
      });
      toast.success('Intervenție înregistrată');
      setIntOpen(false);
      setIntForm({ intervention_type: 'correctiva', reason: '', is_urgent: false });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const createPlan = async () => {
    if (!stationId) return;
    try {
      await apiCommand('create_station_maintenance_plan', {
        request: {
          station_id: stationId,
          maintenance_type: planForm.maintenance_type.trim(),
          periodicity_days: Number(planForm.periodicity_days) || 90,
          next_execution_date: planForm.next_execution_date,
          notes: planForm.notes.trim() || null,
        },
      });
      toast.success('Plan adăugat');
      setPlanOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const deletePlan = async (id: number) => {
    if (!(await confirmDialog({ title: 'Ștergi planul?', danger: true }))) return;
    try {
      await apiCommand('delete_station_maintenance_plan', { id });
      toast.success('Șters');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const createPart = async () => {
    if (!stationId || !partForm.part_name.trim()) {
      toast.error('Numele piesei este obligatoriu');
      return;
    }
    try {
      await apiCommand('create_station_parts_request', {
        request: {
          station_id: stationId,
          part_name: partForm.part_name.trim(),
          part_code: partForm.part_code.trim() || null,
          quantity: Number(partForm.quantity) || 1,
          supplier: partForm.supplier.trim() || null,
          estimated_cost: Number(partForm.estimated_cost) || 0,
          reason: partForm.reason.trim() || null,
        },
      });
      toast.success('Cerere piesă adăugată');
      setPartOpen(false);
      setPartForm({ part_name: '', part_code: '', quantity: '1', supplier: '', estimated_cost: '0', reason: '' });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const deletePart = async (id: number) => {
    if (!(await confirmDialog({ title: 'Ștergi cererea?', danger: true }))) return;
    try {
      await apiCommand('delete_station_parts_request', { id });
      toast.success('Șters');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const createChange = async () => {
    if (!stationId || !changeForm.description.trim()) {
      toast.error('Descrierea este obligatorie');
      return;
    }
    try {
      await apiCommand('create_station_change_request', {
        request: {
          station_id: stationId,
          requested_by_name: changeForm.requested_by_name.trim() || 'Necunoscut',
          description: changeForm.description.trim(),
          priority: changeForm.priority,
        },
      });
      toast.success('Cerere de modificare adăugată');
      setChangeOpen(false);
      setChangeForm({ requested_by_name: '', description: '', priority: 'normal' });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const openEdit = () => {
    if (!station) return;
    setEditForm({
      name: station.name,
      location: station.location || '',
      station_type: station.station_type || '',
      status: station.status,
      notes: station.notes || '',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!stationId || !station) return;
    try {
      const updated = await apiCommand<StationDetail>('update_station', {
        id: stationId,
        name: editForm.name.trim(),
        location: editForm.location.trim() || null,
        station_type: editForm.station_type.trim() || null,
        status: editForm.status,
        notes: editForm.notes.trim() || null,
      });
      setStation(updated);
      setEditOpen(false);
      toast.success('Stație actualizată');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const partsCost = useMemo(
    () => parts.reduce((s, p) => s + (p.estimated_cost ?? 0) * p.quantity, 0),
    [parts],
  );

  const addAction = () => {
    switch (tab) {
      case 'interventions': setIntOpen(true); break;
      case 'maintenance': setPlanOpen(true); break;
      case 'parts': setPartOpen(true); break;
      case 'changes': setChangeOpen(true); break;
      default: break;
    }
  };

  const showAdd = tab === 'interventions' || tab === 'maintenance' || tab === 'parts' || tab === 'changes';

  if (!stationId) {
    return (
      <Page fill>
        <p className="density-meta text-muted-foreground">Stație invalidă.</p>
      </Page>
    );
  }

  return (
    <Page fill>
      <PageHeader
        title={station?.name || 'Stație'}
        description={station ? `${station.code} · ${station.client_name}` : 'Detalii stație'}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { window.location.hash = '/v2/stations'; }}>
              <ArrowLeft className="mr-2 h-4 w-4" />Înapoi
            </Button>
            {tab === 'overview' && station && (
              <Button size="sm" variant="outline" onClick={openEdit}>
                <Pencil className="mr-2 h-4 w-4" />Editează
              </Button>
            )}
            {showAdd && (
              <Button size="sm" onClick={addAction}>
                <Plus className="mr-2 h-4 w-4" />Adaugă
              </Button>
            )}
          </div>
        }
      />

      <Tabs className="mb-4">
        <TabsList>
          <TabsTrigger active={tab === 'overview'} onClick={() => setTab('overview')}>Prezentare</TabsTrigger>
          <TabsTrigger active={tab === 'interventions'} onClick={() => setTab('interventions')}>
            Intervenții ({interventions.length})
          </TabsTrigger>
          <TabsTrigger active={tab === 'maintenance'} onClick={() => setTab('maintenance')}>
            Mentenanță ({plans.length})
          </TabsTrigger>
          <TabsTrigger active={tab === 'parts'} onClick={() => setTab('parts')}>
            Piese ({parts.length})
          </TabsTrigger>
          <TabsTrigger active={tab === 'changes'} onClick={() => setTab('changes')}>
            Modificări ({changes.length})
          </TabsTrigger>
          <TabsTrigger active={tab === 'activity'} onClick={() => setTab('activity')}>
            Jurnal
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <AsyncContent loading={loading} error={null} empty={!station}>
        {station && tab === 'overview' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-none">
              <CardContent className="space-y-3 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={station.status} />
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Proiect</span><span>{station.project_name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Locație</span><span>{station.location || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tip</span><span>{station.station_type || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Manager</span><span>{station.internal_manager_name || '—'}</span></div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="space-y-3 p-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Livrare</span><span>{station.delivery_date ? formatDateRo(station.delivery_date) : '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Punere în funcțiune</span><span>{station.commissioning_date ? formatDateRo(station.commissioning_date) : '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Garanție până la</span><span>{station.warranty_end_date ? formatDateRo(station.warranty_end_date) : '—'}</span></div>
                {station.notes && <p className="pt-2 text-muted-foreground border-t">{station.notes}</p>}
              </CardContent>
            </Card>
          </div>
        )}

        {station && tab === 'interventions' && (
          <DataTable
            empty="Nicio intervenție"
            headers={['Tip', 'Motiv', 'Deschis', 'Status', 'Urgent']}
            rows={interventions.map((i) => [
              i.intervention_type,
              i.reason || '—',
              formatDateRo(i.open_date),
              <StatusBadge key={i.id} status={i.status} />,
              i.is_urgent ? 'Da' : 'Nu',
            ])}
          />
        )}

        {station && tab === 'maintenance' && (
          <DataTable
            empty="Niciun plan de mentenanță"
            headers={['Tip', 'Periodicitate', 'Următoarea', 'Status', '']}
            rows={plans.map((p) => [
              p.maintenance_type,
              `${p.periodicity_days} zile`,
              p.next_execution_date ? formatDateRo(p.next_execution_date) : '—',
              <StatusBadge key={p.id} status={p.status} />,
              <Button key={`del-${p.id}`} size="sm" variant="ghost" onClick={() => void deletePlan(p.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>,
            ])}
          />
        )}

        {station && tab === 'parts' && (
          <>
            {partsCost > 0 && (
              <p className="mb-2 text-sm text-muted-foreground">Cost estimat total: {formatNumber(partsCost)} RON</p>
            )}
            <DataTable
              empty="Nicio cerere de piese"
              headers={['Piesă', 'Cod', 'Cant.', 'Furnizor', 'Status', '']}
              rows={parts.map((p) => [
                p.part_name,
                p.part_code || '—',
                String(p.quantity),
                p.supplier || '—',
                <StatusBadge key={p.id} status={p.status} />,
                <Button key={`del-${p.id}`} size="sm" variant="ghost" onClick={() => void deletePart(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>,
              ])}
            />
          </>
        )}

        {station && tab === 'changes' && (
          <DataTable
            empty="Nicio cerere de modificare"
            headers={['Solicitant', 'Data', 'Descriere', 'Prioritate', 'Status']}
            rows={changes.map((c) => [
              c.requested_by_name,
              formatDateRo(c.request_date),
              c.description,
              c.priority,
              <StatusBadge key={c.id} status={c.status} />,
            ])}
          />
        )}

        {station && tab === 'activity' && (
          <div className="space-y-2">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nicio activitate înregistrată.</p>
            ) : activity.map((a) => (
              <Card key={a.id} className="shadow-none">
                <CardContent className="p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{a.action_type}</span>
                    <span className="text-xs text-muted-foreground">{formatDateRo(a.created_at)}</span>
                  </div>
                  {a.description && <p className="text-muted-foreground">{a.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </AsyncContent>

      <Dialog open={intOpen} onOpenChange={setIntOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Intervenție nouă</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Tip</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={intForm.intervention_type} onChange={(e) => setIntForm((f) => ({ ...f, intervention_type: e.target.value }))}>
                <option value="correctiva">Corectivă</option>
                <option value="preventiva">Preventivă</option>
                <option value="upgrade">Upgrade</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Motiv</Label>
              <Input value={intForm.reason} onChange={(e) => setIntForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={intForm.is_urgent} onChange={(e) => setIntForm((f) => ({ ...f, is_urgent: e.target.checked }))} />
              Urgent
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntOpen(false)}>Anulează</Button>
            <Button onClick={() => void createIntervention()}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Plan mentenanță</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label>Tip</Label><Input value={planForm.maintenance_type} onChange={(e) => setPlanForm((f) => ({ ...f, maintenance_type: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5"><Label>Zile</Label><Input value={planForm.periodicity_days} onChange={(e) => setPlanForm((f) => ({ ...f, periodicity_days: e.target.value }))} /></div>
              <div className="grid gap-1.5"><Label>Următoarea</Label><Input type="date" value={planForm.next_execution_date} onChange={(e) => setPlanForm((f) => ({ ...f, next_execution_date: e.target.value }))} /></div>
            </div>
            <div className="grid gap-1.5"><Label>Note</Label><Input value={planForm.notes} onChange={(e) => setPlanForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>Anulează</Button>
            <Button onClick={() => void createPlan()}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={partOpen} onOpenChange={setPartOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cerere piesă</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label>Nume piesă</Label><Input value={partForm.part_name} onChange={(e) => setPartForm((f) => ({ ...f, part_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5"><Label>Cod</Label><Input value={partForm.part_code} onChange={(e) => setPartForm((f) => ({ ...f, part_code: e.target.value }))} /></div>
              <div className="grid gap-1.5"><Label>Cantitate</Label><Input value={partForm.quantity} onChange={(e) => setPartForm((f) => ({ ...f, quantity: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5"><Label>Furnizor</Label><Input value={partForm.supplier} onChange={(e) => setPartForm((f) => ({ ...f, supplier: e.target.value }))} /></div>
              <div className="grid gap-1.5"><Label>Cost est.</Label><Input value={partForm.estimated_cost} onChange={(e) => setPartForm((f) => ({ ...f, estimated_cost: e.target.value }))} /></div>
            </div>
            <div className="grid gap-1.5"><Label>Motiv</Label><Input value={partForm.reason} onChange={(e) => setPartForm((f) => ({ ...f, reason: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartOpen(false)}>Anulează</Button>
            <Button onClick={() => void createPart()}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cerere modificare</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label>Solicitant</Label><Input value={changeForm.requested_by_name} onChange={(e) => setChangeForm((f) => ({ ...f, requested_by_name: e.target.value }))} /></div>
            <div className="grid gap-1.5">
              <Label>Prioritate</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={changeForm.priority} onChange={(e) => setChangeForm((f) => ({ ...f, priority: e.target.value }))}>
                <option value="low">Scăzută</option>
                <option value="normal">Normală</option>
                <option value="high">Ridicată</option>
              </select>
            </div>
            <div className="grid gap-1.5"><Label>Descriere</Label><Input value={changeForm.description} onChange={(e) => setChangeForm((f) => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeOpen(false)}>Anulează</Button>
            <Button onClick={() => void createChange()}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editează stația</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label>Nume</Label><Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Locație</Label><Input value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Tip</Label><Input value={editForm.station_type} onChange={(e) => setEditForm((f) => ({ ...f, station_type: e.target.value }))} /></div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="operational">Operațional</option>
                <option value="maintenance">Mentenanță</option>
                <option value="offline">Offline</option>
                <option value="decommissioned">Decomisionat</option>
              </select>
            </div>
            <div className="grid gap-1.5"><Label>Note</Label><Input value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Anulează</Button>
            <Button onClick={() => void saveEdit()}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: (string | ReactNode)[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <Card className="overflow-hidden shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, ri) => (
            <TableRow key={ri}>
              {row.map((cell, ci) => (
                <TableCell key={ci}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
