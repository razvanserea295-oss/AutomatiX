import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  DynamicPage, DynamicPageTitle, DynamicPageHeader,
  Title, Label, Text, ObjectStatus, Toolbar, ToolbarButton,
  FilterBar, FilterGroupItem, Select, Option, Input, TextArea,
  AnalyticalTable, Button, Dialog, Bar, MessageStrip,
  TabContainer, Tab,
} from '@ui5/webcomponents-react';
import ButtonDesign from '@ui5/webcomponents/dist/types/ButtonDesign.js';
import ValueState from '@ui5/webcomponents-base/dist/types/ValueState.js';
import addIcon from '@ui5/webcomponents-icons/dist/add.js';

import type { User } from '@/core/types';
import { apiCommand } from '@/api/commands';
import { useProjectStore } from '@/store/projectStore';
import { useMaterialStore } from '@/store/materialStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { useViewerMode } from '@/hooks/useViewerMode';
import { toast } from '@/store/toastStore';

// ── Domain types (preserved verbatim from the prior implementation) ──
interface Movement { id: number; material_name: string; material_code: string; location_name: string | null; movement_type: string; quantity: number; project_name: string | null; notes: string | null; created_by_name: string | null; created_at: string; }
interface Location { id: number; code: string; name: string; location_type: string; }
interface Reservation { id: number; project_name: string; node_name: string; material_name: string; quantity_reserved: number; quantity_issued: number; status: string; created_at?: string; }

type TabKey = 'stock' | 'movements' | 'reservations' | 'locations';

const moveLabels: Record<string, string> = { in: 'Intrare', out: 'Ieșire', transfer: 'Transfer', adjustment: 'Ajustare' };
const moveState: Record<string, ValueState> = { in: ValueState.Positive, out: ValueState.Negative, transfer: ValueState.Critical, adjustment: ValueState.None };

const RES_STATUS_LABEL: Record<string, string> = {
  reserved: 'Rezervat', partially_issued: 'Parțial eliberat', fully_issued: 'Eliberat complet', cancelled: 'Anulat',
};
function resStatusState(status: string): ValueState {
  if (status === 'fully_issued') return ValueState.Positive;
  if (status === 'partially_issued') return ValueState.Critical;
  if (status === 'cancelled') return ValueState.None;
  return ValueState.Information;
}

// ── Movement form ──
type MoveForm = { material_id: string; movement_type: string; quantity: string; location_id: string; project_id: string; notes: string; };
const EMPTY_MOVE: MoveForm = { material_id: '', movement_type: 'in', quantity: '', location_id: '', project_id: '', notes: '' };
// ── Reservation form ──
type ResForm = { project_id: string; material_id: string; quantity_reserved: string; };
const EMPTY_RES: ResForm = { project_id: '', material_id: '', quantity_reserved: '' };
// ── Location form ──
type LocForm = { name: string; location_type: string; };
const EMPTY_LOC: LocForm = { name: '', location_type: 'depozit' };

function Kpi({ label, value, state }: { label: string; value: number | string; state?: ValueState }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '5rem' }}>
      <Label>{label}</Label>
      <Title level="H4" style={state && state !== ValueState.None ? { color: `var(--sapField_${state}Color, inherit)` } : undefined}>
        {String(value)}
      </Title>
    </div>
  );
}

export default function WarehousePage({ user: _user }: { user: User | null }) {
  const isViewer = useViewerMode('warehouse');

  const materials = useMaterialStore(s => s.materials);
  const fetchMaterialsStore = useMaterialStore(s => s.fetchMaterials);
  const fullProjects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const projects = useMemo(() => fullProjects.map(p => ({ id: p.id, name: p.name })), [fullProjects]);

  const [movements, setMovements] = useState<Movement[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<TabKey>('stock');

  // Dialog state
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveForm, setMoveForm] = useState<MoveForm>(EMPTY_MOVE);
  const [resOpen, setResOpen] = useState(false);
  const [resForm, setResForm] = useState<ResForm>(EMPTY_RES);
  const [locOpen, setLocOpen] = useState(false);
  const [locForm, setLocForm] = useState<LocForm>(EMPTY_LOC);
  const [issueTarget, setIssueTarget] = useState<{ id: number; remaining: number; material: string } | null>(null);
  const [issueQty, setIssueQty] = useState('');

  const fetch = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchMaterialsStore(true),
      apiCommand<Movement[]>('get_stock_movements').then(setMovements).catch(() => setMovements([])),
      apiCommand<Reservation[]>('get_stock_reservations').then(setReservations).catch(() => setReservations([])),
      apiCommand<Location[]>('get_warehouse_locations').then(setLocations).catch(() => setLocations([])),
      fetchProjects(),
    ]).finally(() => setLoading(false));
  }, [fetchProjects, fetchMaterialsStore]);

  useEffect(() => { fetch(); }, [fetch]);

  // ── Derived stock figures (preserved verbatim) ──
  const reservedByMaterial = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of reservations) {
      if (r.status === 'reserved' || r.status === 'partially_issued') {
        const remaining = (r.quantity_reserved ?? 0) - (r.quantity_issued ?? 0);
        if (remaining > 0) {
          const m = materials.find(x => x.name === r.material_name);
          if (m) map.set(m.id, (map.get(m.id) ?? 0) + remaining);
        }
      }
    }
    return map;
  }, [reservations, materials]);
  const availableStock = useCallback(
    (m: { id: number; stock: number }) => Math.max(0, m.stock - (reservedByMaterial.get(m.id) ?? 0)),
    [reservedByMaterial],
  );
  const lowStock = useMemo(
    () => materials.filter(m => availableStock(m) <= m.min_stock && m.min_stock > 0),
    [materials, availableStock],
  );
  const activeReservations = reservations.filter(r => r.status === 'reserved' || r.status === 'partially_issued').length;

  const SEVEN_DAYS = 7 * 24 * 3600 * 1000;
  const isPending = (r: Reservation) => r.status === 'reserved' || r.status === 'partially_issued';
  const ageDays = (r: Reservation): number | null => {
    if (!r.created_at) return null;
    const t = new Date(r.created_at).getTime();
    if (isNaN(t)) return null;
    return Math.floor((Date.now() - t) / (24 * 3600 * 1000));
  };
  const overdueReservations = useMemo(() => reservations.filter(r => {
    if (!isPending(r) || !r.created_at) return false;
    const t = new Date(r.created_at).getTime();
    if (isNaN(t)) return false;
    return Date.now() - t > SEVEN_DAYS;
  }), [reservations, SEVEN_DAYS]);

  // ── Mutations (preserved verbatim) ──
  const handleRecordMovement = useCallback(async () => {
    try {
      await apiCommand('record_stock_movement', {
        material_id: Number(moveForm.material_id), movement_type: moveForm.movement_type,
        quantity: Number(moveForm.quantity), location_id: moveForm.location_id ? Number(moveForm.location_id) : null,
        project_id: moveForm.project_id ? Number(moveForm.project_id) : null,
        notes: moveForm.notes || null,
      });
      toast.success('Mișcare înregistrată');
      setMoveOpen(false);
      fetch();
      await fetchMaterialsStore(true);
      void useDashboardStore.getState().invalidate();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la înregistrare'); }
  }, [moveForm, fetch, fetchMaterialsStore]);

  const handleCreateReservation = useCallback(async () => {
    try {
      await apiCommand('create_stock_reservation', {
        project_id: Number(resForm.project_id),
        node_id: 0,
        material_id: Number(resForm.material_id),
        quantity_reserved: Number(resForm.quantity_reserved),
      });
      toast.success('Rezervare creată');
      setResOpen(false);
      fetch();
      await fetchMaterialsStore(true);
      void useDashboardStore.getState().invalidate();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la creare'); }
  }, [resForm, fetch, fetchMaterialsStore]);

  const handleCreateLocation = useCallback(async () => {
    try {
      const name = String(locForm.name || '').trim();
      const slug = name.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 32)
        .toUpperCase();
      const code = slug || `LOC-${Date.now().toString(36).toUpperCase()}`;
      await apiCommand('create_warehouse_location', {
        code, name, location_type: locForm.location_type || 'depozit',
      });
      toast.success('Locație adăugată');
      setLocOpen(false);
      fetch();
      await useMaterialStore.getState().fetchLocations(true);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la adăugare'); }
  }, [locForm, fetch]);

  const openIssue = useCallback((r: Reservation) => {
    const remaining = Math.max(0, (r.quantity_reserved ?? 0) - (r.quantity_issued ?? 0));
    if (remaining <= 0) { toast.error('Nu mai există cantitate de eliberat'); return; }
    setIssueTarget({ id: r.id, remaining, material: r.material_name });
    setIssueQty(String(remaining));
  }, []);

  const handleIssue = useCallback(async () => {
    if (!issueTarget) return;
    const n = Number(issueQty);
    if (!Number.isFinite(n) || n <= 0) { toast.error('Introdu o cantitate pozitivă'); return; }
    if (n > issueTarget.remaining) { toast.error(`Maxim ${issueTarget.remaining}`); return; }
    try {
      await apiCommand('issue_stock_reservation', { reservation_id: issueTarget.id, quantity: n });
      toast.success('Rezervare eliberată cu succes');
      fetch();
      await fetchMaterialsStore(true);
      void useDashboardStore.getState().invalidate();
      setIssueTarget(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la eliberare'); }
  }, [issueTarget, issueQty, fetch, fetchMaterialsStore]);

  // ── Form helpers ──
  const setMove = (k: keyof MoveForm) => (v: string) => setMoveForm(f => ({ ...f, [k]: v }));
  const setRes = (k: keyof ResForm) => (v: string) => setResForm(f => ({ ...f, [k]: v }));
  const setLoc = (k: keyof LocForm) => (v: string) => setLocForm(f => ({ ...f, [k]: v }));

  const openMove = useCallback(() => { setMoveForm(EMPTY_MOVE); setMoveOpen(true); }, []);
  const openRes = useCallback(() => { setResForm(EMPTY_RES); setResOpen(true); }, []);
  const openLoc = useCallback(() => { setLocForm(EMPTY_LOC); setLocOpen(true); }, []);

  // ── Table columns ──
  const stockColumns = useMemo<any[]>(() => [
    { Header: 'Material', accessor: 'name', Cell: ({ row }: any) => <Text>{row.original.name}</Text> },
    { Header: 'Categorie', accessor: 'category' },
    { Header: 'UM', accessor: 'unit', width: 80 },
    { Header: 'Stoc', accessor: 'stock', hAlign: 'End', width: 100, Cell: ({ row }: any) => row.original.stock },
    {
      Header: 'Rezervat', id: 'reserved', hAlign: 'End', width: 110, disableSortBy: true,
      Cell: ({ row }: any) => { const r = reservedByMaterial.get(row.original.id) ?? 0; return r > 0 ? r : '—'; },
    },
    {
      Header: 'Disponibil', id: 'available', hAlign: 'End', width: 110, disableSortBy: true,
      Cell: ({ row }: any) => availableStock(row.original),
    },
    { Header: 'Minim', accessor: 'min_stock', hAlign: 'End', width: 100 },
    {
      Header: 'Status', id: 'status', width: 120, disableSortBy: true,
      Cell: ({ row }: any) => {
        const isCritic = availableStock(row.original) <= row.original.min_stock && row.original.min_stock > 0;
        return <ObjectStatus state={isCritic ? ValueState.Negative : ValueState.Positive}>{isCritic ? 'Critic' : 'OK'}</ObjectStatus>;
      },
    },
  ], [reservedByMaterial, availableStock]);

  const movementColumns = useMemo<any[]>(() => [
    { Header: 'Data', accessor: 'created_at', width: 150, Cell: ({ row }: any) => row.original.created_at?.slice(0, 16) ?? '—' },
    {
      Header: 'Tip', accessor: 'movement_type', width: 130,
      Cell: ({ row }: any) => (
        <ObjectStatus state={moveState[row.original.movement_type] ?? ValueState.None}>
          {moveLabels[row.original.movement_type] ?? row.original.movement_type}
        </ObjectStatus>
      ),
    },
    { Header: 'Material', accessor: 'material_name', Cell: ({ row }: any) => <Text>{row.original.material_name}</Text> },
    { Header: 'Cantitate', accessor: 'quantity', hAlign: 'End', width: 110 },
    { Header: 'Locație', accessor: 'location_name', Cell: ({ row }: any) => row.original.location_name ?? '—' },
    { Header: 'Proiect', accessor: 'project_name', Cell: ({ row }: any) => row.original.project_name ?? '—' },
    { Header: 'Utilizator', accessor: 'created_by_name', Cell: ({ row }: any) => row.original.created_by_name ?? '—' },
  ], []);

  const reservationColumns = useMemo<any[]>(() => [
    { Header: 'Proiect', accessor: 'project_name', Cell: ({ row }: any) => <Text>{row.original.project_name}</Text> },
    { Header: 'Nod', accessor: 'node_name', Cell: ({ row }: any) => row.original.node_name ?? '—' },
    { Header: 'Material', accessor: 'material_name' },
    { Header: 'Rezervat', accessor: 'quantity_reserved', hAlign: 'End', width: 110 },
    { Header: 'Eliberat', accessor: 'quantity_issued', hAlign: 'End', width: 110 },
    {
      Header: 'Vechime', id: 'age', hAlign: 'End', width: 110, disableSortBy: true,
      Cell: ({ row }: any) => {
        const days = ageDays(row.original);
        if (days == null) return '—';
        const overdue = isPending(row.original) && days > 7;
        return <span style={overdue ? { color: 'var(--sapNegativeColor, inherit)', fontWeight: 600 } : undefined}>{days}z{overdue ? ' ⚠' : ''}</span>;
      },
    },
    {
      Header: 'Status', accessor: 'status', width: 150,
      Cell: ({ row }: any) => (
        <ObjectStatus state={resStatusState(row.original.status)}>
          {RES_STATUS_LABEL[row.original.status] ?? row.original.status}
        </ObjectStatus>
      ),
    },
    {
      Header: 'Acțiuni', id: 'actions', disableSortBy: true, hAlign: 'End', width: 120,
      Cell: ({ row }: any) => (
        (!isViewer && (row.original.status === 'reserved' || row.original.status === 'partially_issued')) ? (
          <Button design={ButtonDesign.Transparent} onClick={() => openIssue(row.original)}>Eliberează</Button>
        ) : null
      ),
    },
  ], [isViewer, openIssue]);

  const locationColumns = useMemo<any[]>(() => [
    { Header: 'Cod', accessor: 'code', width: 160, Cell: ({ row }: any) => <Text>{row.original.code}</Text> },
    { Header: 'Nume', accessor: 'name' },
    { Header: 'Tip', accessor: 'location_type' },
  ], []);

  // ── Primary action depends on the active tab ──
  const primaryAction =
    tab === 'movements' ? { text: 'Mișcare nouă', onClick: openMove } :
    tab === 'reservations' ? { text: 'Rezervare nouă', onClick: openRes } :
    tab === 'locations' ? { text: 'Locație nouă', onClick: openLoc } :
    null;

  const onTabSelect = (e: any) => {
    const key = e.detail?.tab?.dataset?.tab as TabKey | undefined;
    if (key) setTab(key);
  };

  return (
    <>
      <DynamicPage
        style={{ height: '100%' }}
        titleArea={
          <DynamicPageTitle
            heading={<Title>Depozit</Title>}
            subheading={<Text>Stoc, mișcări, rezervări și locații de depozitare</Text>}
            actionsBar={
              <Toolbar design="Transparent">
                {primaryAction && (
                  <ToolbarButton design={ButtonDesign.Emphasized} icon={addIcon} text={primaryAction.text} onClick={primaryAction.onClick} disabled={isViewer} />
                )}
              </Toolbar>
            }
          >
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <Kpi label="Total materiale" value={materials.length} />
              <Kpi label="Rezervări active" value={activeReservations} />
              <Kpi label="Locații" value={locations.length} />
              <Kpi label="Stoc critic" value={lowStock.length} state={lowStock.length > 0 ? ValueState.Negative : ValueState.None} />
            </div>
          </DynamicPageTitle>
        }
        headerArea={
          <DynamicPageHeader>
            <FilterBar hideToolbar>
              <FilterGroupItem label="Vizualizare" filterKey="view">
                <Text>
                  {tab === 'stock' ? `Stoc curent — ${materials.length} materiale`
                    : tab === 'movements' ? `Mișcări stoc — ${movements.length}`
                    : tab === 'reservations' ? `Rezervări — ${reservations.length}`
                    : `Locații depozit — ${locations.length}`}
                </Text>
              </FilterGroupItem>
            </FilterBar>
          </DynamicPageHeader>
        }
      >
        {/* Alerts: low stock / overdue reservations */}
        {tab === 'stock' && lowStock.length > 0 && (
          <MessageStrip design="Negative" hideCloseButton style={{ marginBottom: '0.5rem' }}>
            {`Stoc critic — ${lowStock.length} ${lowStock.length === 1 ? 'material' : 'materiale'} sub minim: ${lowStock.slice(0, 6).map(m => m.name).join(', ')}${lowStock.length > 6 ? '…' : ''}`}
          </MessageStrip>
        )}
        {tab === 'reservations' && overdueReservations.length > 0 && (
          <MessageStrip design="Negative" hideCloseButton style={{ marginBottom: '0.5rem' }}>
            {`${overdueReservations.length} ${overdueReservations.length === 1 ? 'rezervare restantă' : 'rezervări restante'} > 7 zile: ${overdueReservations.slice(0, 6).map(r => r.material_name).join(', ')}${overdueReservations.length > 6 ? '…' : ''}`}
          </MessageStrip>
        )}

        <TabContainer collapsed onTabSelect={onTabSelect} style={{ height: '100%' }}>
          <Tab data-tab="stock" text="Stoc" selected={tab === 'stock'}>
            <AnalyticalTable
              columns={stockColumns}
              data={materials}
              loading={loading}
              visibleRowCountMode="Auto"
              minRows={1}
              noDataText="Niciun material în stoc"
              filterable
              sortable
            />
          </Tab>
          <Tab data-tab="movements" text="Mișcări" selected={tab === 'movements'}>
            <AnalyticalTable
              columns={movementColumns}
              data={movements}
              loading={loading}
              visibleRowCountMode="Auto"
              minRows={1}
              noDataText="Nicio mișcare înregistrată"
              filterable
              sortable
            />
          </Tab>
          <Tab data-tab="reservations" text="Rezervări" selected={tab === 'reservations'}>
            <AnalyticalTable
              columns={reservationColumns}
              data={reservations}
              loading={loading}
              visibleRowCountMode="Auto"
              minRows={1}
              noDataText="Nicio rezervare"
              filterable
              sortable
            />
          </Tab>
          <Tab data-tab="locations" text="Locații" selected={tab === 'locations'}>
            <AnalyticalTable
              columns={locationColumns}
              data={locations}
              loading={loading}
              visibleRowCountMode="Auto"
              minRows={1}
              noDataText="Nicio locație definită"
              filterable
              sortable
            />
          </Tab>
        </TabContainer>
      </DynamicPage>

      {/* Record stock movement */}
      <Dialog
        open={moveOpen}
        headerText="Mișcare stoc nouă"
        onClose={() => setMoveOpen(false)}
        footer={
          <Bar design="Footer" endContent={
            <>
              <Button design={ButtonDesign.Emphasized} onClick={handleRecordMovement}>Înregistrează</Button>
              <Button design={ButtonDesign.Transparent} onClick={() => setMoveOpen(false)}>Anulează</Button>
            </>
          } />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '24rem', padding: '0.5rem 0' }}>
          <div><Label required>Material</Label>
            <Select style={{ width: '100%' }} onChange={(e) => setMove('material_id')(String(e.detail.selectedOption.dataset.value ?? ''))}>
              <Option data-value="">—</Option>
              {materials.map(m => <Option key={m.id} data-value={String(m.id)} selected={String(m.id) === moveForm.material_id}>{m.code} — {m.name}</Option>)}
            </Select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label required>Tip mișcare</Label>
              <Select style={{ width: '100%' }} onChange={(e) => setMove('movement_type')(String(e.detail.selectedOption.dataset.value ?? 'in'))}>
                <Option data-value="in" selected={moveForm.movement_type === 'in'}>Intrare</Option>
                <Option data-value="out" selected={moveForm.movement_type === 'out'}>Ieșire</Option>
                <Option data-value="adjustment" selected={moveForm.movement_type === 'adjustment'}>Ajustare</Option>
              </Select>
            </div>
            <div style={{ flex: 1 }}><Label required>Cantitate</Label><Input type="Number" style={{ width: '100%' }} value={moveForm.quantity} onInput={(e) => setMove('quantity')((e.target as any).value)} /></div>
          </div>
          <div><Label>Locație</Label>
            <Select style={{ width: '100%' }} onChange={(e) => setMove('location_id')(String(e.detail.selectedOption.dataset.value ?? ''))}>
              <Option data-value="">—</Option>
              {locations.map(l => <Option key={l.id} data-value={String(l.id)} selected={String(l.id) === moveForm.location_id}>{l.code} — {l.name}</Option>)}
            </Select>
          </div>
          <div><Label>Proiect (pentru cost flow)</Label>
            <Select style={{ width: '100%' }} onChange={(e) => setMove('project_id')(String(e.detail.selectedOption.dataset.value ?? ''))}>
              <Option data-value="">—</Option>
              {projects.map(p => <Option key={p.id} data-value={String(p.id)} selected={String(p.id) === moveForm.project_id}>{p.name}</Option>)}
            </Select>
          </div>
          <div><Label>Note</Label><TextArea style={{ width: '100%' }} rows={3} value={moveForm.notes} onInput={(e) => setMove('notes')((e.target as any).value)} /></div>
        </div>
      </Dialog>

      {/* Create reservation */}
      <Dialog
        open={resOpen}
        headerText="Rezervare nouă"
        onClose={() => setResOpen(false)}
        footer={
          <Bar design="Footer" endContent={
            <>
              <Button design={ButtonDesign.Emphasized} onClick={handleCreateReservation}>Creează rezervare</Button>
              <Button design={ButtonDesign.Transparent} onClick={() => setResOpen(false)}>Anulează</Button>
            </>
          } />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '24rem', padding: '0.5rem 0' }}>
          <div><Label required>Proiect</Label>
            <Select style={{ width: '100%' }} onChange={(e) => setRes('project_id')(String(e.detail.selectedOption.dataset.value ?? ''))}>
              <Option data-value="">—</Option>
              {projects.map(p => <Option key={p.id} data-value={String(p.id)} selected={String(p.id) === resForm.project_id}>{p.name}</Option>)}
            </Select>
          </div>
          <div><Label required>Material</Label>
            <Select style={{ width: '100%' }} onChange={(e) => setRes('material_id')(String(e.detail.selectedOption.dataset.value ?? ''))}>
              <Option data-value="">—</Option>
              {materials.map(m => <Option key={m.id} data-value={String(m.id)} selected={String(m.id) === resForm.material_id}>{m.code} — {m.name}</Option>)}
            </Select>
          </div>
          <div><Label required>Cantitate rezervată</Label><Input type="Number" style={{ width: '100%' }} value={resForm.quantity_reserved} onInput={(e) => setRes('quantity_reserved')((e.target as any).value)} /></div>
        </div>
      </Dialog>

      {/* Create location */}
      <Dialog
        open={locOpen}
        headerText="Locație nouă"
        onClose={() => setLocOpen(false)}
        footer={
          <Bar design="Footer" endContent={
            <>
              <Button design={ButtonDesign.Emphasized} onClick={handleCreateLocation}>Adaugă locație</Button>
              <Button design={ButtonDesign.Transparent} onClick={() => setLocOpen(false)}>Anulează</Button>
            </>
          } />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '22rem', padding: '0.5rem 0' }}>
          <div><Label required>Nume locație</Label><Input style={{ width: '100%' }} value={locForm.name} onInput={(e) => setLoc('name')((e.target as any).value)} placeholder="Hala principală" /></div>
          <div><Label>Tip</Label>
            <Select style={{ width: '100%' }} onChange={(e) => setLoc('location_type')(String(e.detail.selectedOption.dataset.value ?? 'depozit'))}>
              <Option data-value="depozit" selected={locForm.location_type === 'depozit'}>Depozit</Option>
              <Option data-value="hala" selected={locForm.location_type === 'hala'}>Hala</Option>
              <Option data-value="exterior" selected={locForm.location_type === 'exterior'}>Exterior</Option>
            </Select>
          </div>
        </div>
      </Dialog>

      {/* Issue reservation */}
      <Dialog
        open={issueTarget !== null}
        headerText={issueTarget ? `Eliberează rezervare — ${issueTarget.material}` : 'Eliberează rezervare'}
        onClose={() => setIssueTarget(null)}
        footer={
          <Bar design="Footer" endContent={
            <>
              <Button design={ButtonDesign.Emphasized} onClick={handleIssue}>Eliberează</Button>
              <Button design={ButtonDesign.Transparent} onClick={() => setIssueTarget(null)}>Anulează</Button>
            </>
          } />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '22rem', padding: '0.5rem 0' }}>
          <div>
            <Label required>Cantitate de eliberat</Label>
            <Input
              type="Number"
              style={{ width: '100%' }}
              value={issueQty}
              placeholder={issueTarget ? `max ${issueTarget.remaining}` : ''}
              valueState={issueTarget && Number(issueQty) > issueTarget.remaining ? ValueState.Negative : ValueState.None}
              onInput={(e) => setIssueQty((e.target as any).value)}
            />
            {issueTarget && <Label>{`Rămas disponibil: ${issueTarget.remaining}`}</Label>}
          </div>
        </div>
      </Dialog>
    </>
  );
}
