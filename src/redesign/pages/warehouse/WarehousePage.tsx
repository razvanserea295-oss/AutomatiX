import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Warehouse, Plus, AlertTriangle, X as XIcon, Loader2,
} from 'lucide-react';

import type { User } from '@/core/types';
import { cn } from '@/lib/cn';
import { apiCommand } from '@/api/commands';
import { useProjectStore } from '@/store/projectStore';
import { useMaterialStore } from '@/store/materialStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { useViewerMode } from '@/hooks/useViewerMode';
import { toast } from '@/store/toastStore';

import Page from '@/redesign/ui/Page';
import Card from '@/redesign/ui/Card';
import Button from '@/redesign/ui/Button';
import StatusBadge from '@/redesign/ui/StatusBadge';
import type { StatusTone } from '@/lib/statusTokens';

// ── Domain types (preserved verbatim) ──
interface Movement { id: number; material_name: string; material_code: string; location_name: string | null; movement_type: string; quantity: number; project_name: string | null; notes: string | null; created_by_name: string | null; created_at: string; }
interface Location { id: number; code: string; name: string; location_type: string; }
interface Reservation { id: number; project_name: string; node_name: string; material_name: string; quantity_reserved: number; quantity_issued: number; status: string; created_at?: string; }

type TabKey = 'stock' | 'movements' | 'reservations' | 'locations';

const moveLabels: Record<string, string> = { in: 'Intrare', out: 'Ieșire', transfer: 'Transfer', adjustment: 'Ajustare' };
const moveTone: Record<string, StatusTone> = { in: 'success', out: 'danger', transfer: 'warning', adjustment: 'neutral' };

const RES_STATUS_LABEL: Record<string, string> = {
  reserved: 'Rezervat', partially_issued: 'Parțial eliberat', fully_issued: 'Eliberat complet', cancelled: 'Anulat',
};
function resStatusTone(status: string): StatusTone {
  if (status === 'fully_issued') return 'success';
  if (status === 'partially_issued') return 'warning';
  if (status === 'cancelled') return 'neutral';
  return 'info';
}

// ── Form types (verbatim) ──
type MoveForm = { material_id: string; movement_type: string; quantity: string; location_id: string; project_id: string; notes: string };
const EMPTY_MOVE: MoveForm = { material_id: '', movement_type: 'in', quantity: '', location_id: '', project_id: '', notes: '' };
type ResForm = { project_id: string; material_id: string; quantity_reserved: string };
const EMPTY_RES: ResForm = { project_id: '', material_id: '', quantity_reserved: '' };
type LocForm = { name: string; location_type: string };
const EMPTY_LOC: LocForm = { name: '', location_type: 'depozit' };

const TABS: Array<{ id: TabKey; label: string }> = [
  { id: 'stock', label: 'Stoc' },
  { id: 'movements', label: 'Mișcări' },
  { id: 'reservations', label: 'Rezervări' },
  { id: 'locations', label: 'Locații' },
];

const inputCls = 'w-full h-9 rounded-xl border border-line/70 bg-surface-secondary/40 px-3 text-pm-sm text-content-primary transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]';
const labelCls = 'text-pm-2xs font-bold uppercase tracking-wide text-content-muted';

interface Col<T> { key: string; header: string; align?: 'end'; render?: (row: T) => React.ReactNode }

export default function WarehousePage({ user: _user }: { user: User | null }) {
  const isViewer = useViewerMode('warehouse');

  const materials = useMaterialStore(s => s.materials);
  const materialsLoading = useMaterialStore(s => s.loading);
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

  // ── Derived stock figures (verbatim) ──
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

  // ── Mutations (verbatim) ──
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
        project_id: Number(resForm.project_id), node_id: 0,
        material_id: Number(resForm.material_id), quantity_reserved: Number(resForm.quantity_reserved),
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
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        .slice(0, 32).toUpperCase();
      const code = slug || `LOC-${Date.now().toString(36).toUpperCase()}`;
      await apiCommand('create_warehouse_location', { code, name, location_type: locForm.location_type || 'depozit' });
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

  const setMove = (k: keyof MoveForm) => (v: string) => setMoveForm(f => ({ ...f, [k]: v }));
  const setRes = (k: keyof ResForm) => (v: string) => setResForm(f => ({ ...f, [k]: v }));
  const setLoc = (k: keyof LocForm) => (v: string) => setLocForm(f => ({ ...f, [k]: v }));

  const openMove = useCallback(() => { setMoveForm(EMPTY_MOVE); setMoveOpen(true); }, []);
  const openRes = useCallback(() => { setResForm(EMPTY_RES); setResOpen(true); }, []);
  const openLoc = useCallback(() => { setLocForm(EMPTY_LOC); setLocOpen(true); }, []);

  // ── Columns (Tailwind) ──
  const stockColumns: Col<typeof materials[number]>[] = [
    { key: 'name', header: 'Material', render: m => <span className="font-medium text-content-primary">{m.name}</span> },
    { key: 'category', header: 'Categorie', render: m => m.category || '—' },
    { key: 'unit', header: 'UM' },
    { key: 'stock', header: 'Stoc', align: 'end' },
    { key: 'reserved', header: 'Rezervat', align: 'end', render: m => { const r = reservedByMaterial.get(m.id) ?? 0; return r > 0 ? r : '—'; } },
    { key: 'available', header: 'Disponibil', align: 'end', render: m => availableStock(m) },
    { key: 'min_stock', header: 'Minim', align: 'end' },
    { key: 'status', header: 'Status', render: m => {
      const critic = availableStock(m) <= m.min_stock && m.min_stock > 0;
      return <StatusBadge tone={critic ? 'danger' : 'success'} label={critic ? 'Critic' : 'OK'} size="xs" />;
    } },
  ];

  const movementColumns: Col<Movement>[] = [
    { key: 'created_at', header: 'Data', render: m => <span className="tabular-nums text-content-muted">{m.created_at?.slice(0, 16) ?? '—'}</span> },
    { key: 'movement_type', header: 'Tip', render: m => <StatusBadge tone={moveTone[m.movement_type] ?? 'neutral'} label={moveLabels[m.movement_type] ?? m.movement_type} size="xs" /> },
    { key: 'material_name', header: 'Material', render: m => <span className="font-medium text-content-primary">{m.material_name}</span> },
    { key: 'quantity', header: 'Cantitate', align: 'end' },
    { key: 'location_name', header: 'Locație', render: m => m.location_name ?? '—' },
    { key: 'project_name', header: 'Proiect', render: m => m.project_name ?? '—' },
    { key: 'created_by_name', header: 'Utilizator', render: m => m.created_by_name ?? '—' },
  ];

  const reservationColumns: Col<Reservation>[] = [
    { key: 'project_name', header: 'Proiect', render: r => <span className="font-medium text-content-primary">{r.project_name}</span> },
    { key: 'node_name', header: 'Nod', render: r => r.node_name ?? '—' },
    { key: 'material_name', header: 'Material' },
    { key: 'quantity_reserved', header: 'Rezervat', align: 'end' },
    { key: 'quantity_issued', header: 'Eliberat', align: 'end' },
    { key: 'age', header: 'Vechime', align: 'end', render: r => {
      const days = ageDays(r);
      if (days == null) return '—';
      const overdue = isPending(r) && days > 7;
      return <span className={cn('tabular-nums', overdue && 'text-status-red font-semibold')}>{days}z{overdue ? ' ⚠' : ''}</span>;
    } },
    { key: 'status', header: 'Status', render: r => <StatusBadge tone={resStatusTone(r.status)} label={RES_STATUS_LABEL[r.status] ?? r.status} size="xs" /> },
    { key: 'actions', header: '', align: 'end', render: r => (
      (!isViewer && (r.status === 'reserved' || r.status === 'partially_issued'))
        ? <button onClick={() => openIssue(r)} className="rounded-lg px-1.5 py-0.5 text-pm-xs font-semibold text-accent transition-smooth duration-150 hover:underline hover:bg-accent-muted active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">Eliberează</button>
        : null
    ) },
  ];

  const locationColumns: Col<Location>[] = [
    { key: 'code', header: 'Cod', render: l => <span className="font-mono text-pm-xs text-content-primary">{l.code}</span> },
    { key: 'name', header: 'Nume', render: l => <span className="font-medium text-content-primary">{l.name}</span> },
    { key: 'location_type', header: 'Tip', render: l => <span className="capitalize">{l.location_type}</span> },
  ];

  const primaryAction =
    tab === 'movements' ? { text: 'Mișcare nouă', onClick: openMove } :
    tab === 'reservations' ? { text: 'Rezervare nouă', onClick: openRes } :
    tab === 'locations' ? { text: 'Locație nouă', onClick: openLoc } :
    null;

  const viewLabel =
    tab === 'stock' ? `Stoc curent — ${materials.length} materiale`
      : tab === 'movements' ? `Mișcări stoc — ${movements.length}`
        : tab === 'reservations' ? `Rezervări — ${reservations.length}`
          : `Locații depozit — ${locations.length}`;

  return (
    <Page fit>
      <Page.Body fit maxWidth="full" padding="flush" className="!gap-0 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 shrink-0 border-b border-line/60">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                <Warehouse className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-pm-lg font-semibold text-content-primary leading-tight truncate">Depozit</h1>
                <p className="mt-0.5 text-pm-sm text-content-muted">{viewLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isViewer && primaryAction && (
                <Button size="md" onClick={primaryAction.onClick}><Plus className="h-4 w-4" /> {primaryAction.text}</Button>
              )}
            </div>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="px-6 pt-4 shrink-0">
          <div className="inline-flex items-center gap-0.5 rounded-xl border border-line bg-surface-secondary p-1" role="group" aria-label="Vizualizare depozit">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={cn(
                  'h-8 px-3 rounded-lg text-pm-xs font-semibold transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]',
                  tab === t.id ? 'bg-accent text-[var(--color-on-accent)] shadow-[var(--elevation-1)]' : 'text-content-muted hover:text-content-primary hover:bg-surface-tertiary',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="px-6 pt-3 shrink-0 space-y-2">
          {tab === 'stock' && lowStock.length > 0 && (
            <AlertBanner>Stoc critic — <strong className="font-semibold">{lowStock.length}</strong> {lowStock.length === 1 ? 'material' : 'materiale'} sub minim: {lowStock.slice(0, 6).map(m => m.name).join(', ')}{lowStock.length > 6 ? '…' : ''}</AlertBanner>
          )}
          {tab === 'reservations' && overdueReservations.length > 0 && (
            <AlertBanner><strong className="font-semibold">{overdueReservations.length}</strong> {overdueReservations.length === 1 ? 'rezervare restantă' : 'rezervări restante'} &gt; 7 zile: {overdueReservations.slice(0, 6).map(r => r.material_name).join(', ')}{overdueReservations.length > 6 ? '…' : ''}</AlertBanner>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
          <Card padding="none" className="min-w-0 overflow-hidden">
            {/* The Stoc tab reads `materials` from the store, which has its own
                loading flag. Gate on BOTH so a forced refetch (store loading=true
                while the page's local flag has already settled) can never render
                the empty-state and the spinner at the same time. */}
            {(loading || (tab === 'stock' && materialsLoading)) ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-content-muted" /></div>
            ) : tab === 'stock' ? (
              <DataTable columns={stockColumns} rows={materials} empty="Niciun material în stoc" />
            ) : tab === 'movements' ? (
              <DataTable columns={movementColumns} rows={movements} empty="Nicio mișcare înregistrată" />
            ) : tab === 'reservations' ? (
              <DataTable columns={reservationColumns} rows={reservations} empty="Nicio rezervare" />
            ) : (
              <DataTable columns={locationColumns} rows={locations} empty="Nicio locație definită" />
            )}
          </Card>
        </div>
      </Page.Body>

      {/* Record stock movement */}
      {moveOpen && (
        <Modal title="Mișcare stoc nouă" onClose={() => setMoveOpen(false)}
          footer={<><Button variant="secondary" size="sm" onClick={() => setMoveOpen(false)}>Anulează</Button><Button size="sm" onClick={handleRecordMovement}>Înregistrează</Button></>}>
          <Field label="Material" required>
            <select className={inputCls} value={moveForm.material_id} onChange={e => setMove('material_id')(e.target.value)}>
              <option value="">—</option>
              {materials.map(m => <option key={m.id} value={String(m.id)}>{m.code} — {m.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tip mișcare" required>
              <select className={inputCls} value={moveForm.movement_type} onChange={e => setMove('movement_type')(e.target.value)}>
                <option value="in">Intrare</option>
                <option value="out">Ieșire</option>
                <option value="adjustment">Ajustare</option>
              </select>
            </Field>
            <Field label="Cantitate" required>
              <input type="number" className={inputCls} value={moveForm.quantity} onChange={e => setMove('quantity')(e.target.value)} />
            </Field>
          </div>
          <Field label="Locație">
            <select className={inputCls} value={moveForm.location_id} onChange={e => setMove('location_id')(e.target.value)}>
              <option value="">—</option>
              {locations.map(l => <option key={l.id} value={String(l.id)}>{l.code} — {l.name}</option>)}
            </select>
          </Field>
          <Field label="Proiect (pentru cost flow)">
            <select className={inputCls} value={moveForm.project_id} onChange={e => setMove('project_id')(e.target.value)}>
              <option value="">—</option>
              {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Note">
            <textarea rows={2} className={`${inputCls} h-auto py-2 resize-none`} value={moveForm.notes} onChange={e => setMove('notes')(e.target.value)} />
          </Field>
        </Modal>
      )}

      {/* Create reservation */}
      {resOpen && (
        <Modal title="Rezervare nouă" onClose={() => setResOpen(false)}
          footer={<><Button variant="secondary" size="sm" onClick={() => setResOpen(false)}>Anulează</Button><Button size="sm" onClick={handleCreateReservation}>Creează rezervare</Button></>}>
          <Field label="Proiect" required>
            <select className={inputCls} value={resForm.project_id} onChange={e => setRes('project_id')(e.target.value)}>
              <option value="">—</option>
              {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Material" required>
            <select className={inputCls} value={resForm.material_id} onChange={e => setRes('material_id')(e.target.value)}>
              <option value="">—</option>
              {materials.map(m => <option key={m.id} value={String(m.id)}>{m.code} — {m.name}</option>)}
            </select>
          </Field>
          <Field label="Cantitate rezervată" required>
            <input type="number" className={inputCls} value={resForm.quantity_reserved} onChange={e => setRes('quantity_reserved')(e.target.value)} />
          </Field>
        </Modal>
      )}

      {/* Create location */}
      {locOpen && (
        <Modal title="Locație nouă" onClose={() => setLocOpen(false)}
          footer={<><Button variant="secondary" size="sm" onClick={() => setLocOpen(false)}>Anulează</Button><Button size="sm" onClick={handleCreateLocation}>Adaugă locație</Button></>}>
          <Field label="Nume locație" required>
            <input className={inputCls} value={locForm.name} onChange={e => setLoc('name')(e.target.value)} placeholder="Hala principală" />
          </Field>
          <Field label="Tip">
            <select className={inputCls} value={locForm.location_type} onChange={e => setLoc('location_type')(e.target.value)}>
              <option value="depozit">Depozit</option>
              <option value="hala">Hala</option>
              <option value="exterior">Exterior</option>
            </select>
          </Field>
        </Modal>
      )}

      {/* Issue reservation */}
      {issueTarget && (
        <Modal title={`Eliberează rezervare — ${issueTarget.material}`} onClose={() => setIssueTarget(null)}
          footer={<><Button variant="secondary" size="sm" onClick={() => setIssueTarget(null)}>Anulează</Button><Button size="sm" onClick={handleIssue}>Eliberează</Button></>}>
          <Field label="Cantitate de eliberat" required>
            <input
              type="number"
              className={cn(inputCls, Number(issueQty) > issueTarget.remaining && '!border-status-red')}
              value={issueQty}
              placeholder={`max ${issueTarget.remaining}`}
              onChange={e => setIssueQty(e.target.value)}
            />
          </Field>
          <p className="text-pm-xs text-content-muted">Rămas disponibil: <span className="font-semibold tabular-nums text-content-secondary">{issueTarget.remaining}</span></p>
        </Modal>
      )}
    </Page>
  );
}

// ── Reusable Tailwind table (fixes the UI5 AnalyticalTable blank-render bug) ──
function DataTable<T>({ columns, rows, empty }: { columns: Col<T>[]; rows: T[]; empty: string }) {
  if (rows.length === 0) {
    return <div className="py-16 text-center text-pm-sm text-content-muted">{empty}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-tertiary/40">
            {columns.map(c => (
              <th key={c.key} className={cn('px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.08em] text-content-muted whitespace-nowrap border-b border-line', c.align === 'end' && 'text-right')}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line/50 last:border-b-0 hover:bg-surface-tertiary/30 transition-colors">
              {columns.map(c => (
                <td key={c.key} className={cn('px-3 py-2 text-pm-sm text-content-secondary whitespace-nowrap', c.align === 'end' && 'text-right tabular-nums')}>
                  {c.render ? c.render(row) : ((row as Record<string, unknown>)[c.key] as React.ReactNode) ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlertBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="anim-fade-slide-in flex items-start gap-2 rounded-xl border border-status-red/30 bg-status-red/5 px-4 py-3 text-pm-xs text-status-red">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-status-red"> *</span>}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="anim-fade-in fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="anim-scale-in w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-line bg-surface-primary shadow-[var(--elevation-4)]" onClick={e => e.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line/70 bg-surface-primary px-4 py-3">
          <h3 className="text-pm-sm font-semibold text-content-primary truncate">{title}</h3>
          <button onClick={onClose} className="inline-flex items-center justify-center p-1 rounded-lg text-content-muted transition-smooth duration-150 hover:bg-surface-tertiary hover:text-content-primary active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]" aria-label="Închide"><XIcon className="h-4 w-4" /></button>
        </header>
        <div className="p-4 space-y-3">{children}</div>
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-line/70 bg-surface-primary px-4 py-3">{footer}</div>
      </div>
    </div>
  );
}
