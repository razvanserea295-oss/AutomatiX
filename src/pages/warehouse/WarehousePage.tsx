import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, ArrowDownCircle, ArrowUpCircle, Repeat, Plus, Loader2, Warehouse as WarehouseIcon, AlertTriangle } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { ViewerBanner } from '@/components/ViewerBanner';
import type { User } from '@/core/types';
import { useProjectStore } from '@/store/projectStore';
import { useMaterialStore } from '@/store/materialStore';
import { useDashboardStore } from '@/store/dashboardStore';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
import { HeroHeader, GlassCard, MetricValue, AnimatedTabs } from '@/components/ui';
import StatusBadge from '@/components/ui/StatusBadge';
import TableFiller from '@/components/ui/TableFiller';
import EmptyState from '@/components/EmptyState';
import Page from '@/components/ui/Page';
import { toast } from '@/store/toastStore';

interface Movement { id: number; material_name: string; material_code: string; location_name: string | null; movement_type: string; quantity: number; project_name: string | null; notes: string | null; created_by_name: string | null; created_at: string; }
interface Location { id: number; code: string; name: string; location_type: string; }
interface Reservation { id: number; project_name: string; node_name: string; material_name: string; quantity_reserved: number; quantity_issued: number; status: string; created_at?: string; }

type Tab = 'stock' | 'movements' | 'reservations' | 'locations';

const moveIcons: Record<string, typeof ArrowDownCircle> = { in: ArrowDownCircle, out: ArrowUpCircle, transfer: Repeat, adjustment: Package };
const moveLabels: Record<string, string> = { in: 'Intrare', out: 'Iesire', transfer: 'Transfer', adjustment: 'Ajustare' };
const moveColors: Record<string, string> = { in: 'text-status-green', out: 'text-status-red', transfer: 'text-status-amber', adjustment: 'text-content-secondary' };

export default function WarehousePage({ user: _user }: { user: User | null }) {
  const [tab, setTab] = useState<Tab>('stock');
  const materials = useMaterialStore(s => s.materials);
  const fetchMaterialsStore = useMaterialStore(s => s.fetchMaterials);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  
  
  const fullProjects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const projects = useMemo(() => fullProjects.map(p => ({ id: p.id, name: p.name })), [fullProjects]);
  const { isOpen, openModal, closeModal } = useFormModal();
  const [resModalOpen, setResModalOpen] = useState(false);
  const [locModalOpen, setLocModalOpen] = useState(false);
  
  
  
  const [issueTarget, setIssueTarget] = useState<{ id: number; remaining: number; material: string } | null>(null);

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

  const movementFields: FormField[] = [
    { name: 'material_id', label: 'Material', type: 'select', required: true, options: materials.map(m => ({ value: m.id, label: `${m.code} — ${m.name}` })) },
    { name: 'movement_type', label: 'Tip miscare', type: 'select', required: true, options: [
      { value: 'in', label: 'Intrare' }, { value: 'out', label: 'Iesire' }, { value: 'adjustment', label: 'Ajustare' }
    ]},
    { name: 'quantity', label: 'Cantitate', type: 'number', required: true },
    { name: 'location_id', label: 'Locație', type: 'select', options: locations.map(l => ({ value: l.id, label: `${l.code} — ${l.name}` })) },
    
    
    { name: 'project_id', label: 'Proiect (pentru cost flow)', type: 'select', options: projects.map(p => ({ value: p.id, label: p.name })) },
    { name: 'notes', label: 'Note', type: 'textarea' },
  ];

  const reservationFields: FormField[] = useMemo(() => [
    { name: 'project_id', label: 'Proiect', type: 'select' as const, required: true, options: projects.map(p => ({ value: p.id, label: p.name })) },
    { name: 'material_id', label: 'Material', type: 'select' as const, required: true, options: materials.map(m => ({ value: m.id, label: `${m.code} — ${m.name}` })) },
    { name: 'quantity_reserved', label: 'Cantitate rezervata', type: 'number' as const, required: true },
  ], [projects, materials]);

  const handleCreateReservation = async (data: Record<string, unknown>) => {
    await apiCommand('create_stock_reservation', {
      project_id: Number(data.project_id),
      node_id: 0,
      material_id: Number(data.material_id),
      quantity_reserved: Number(data.quantity_reserved),
    });
    setResModalOpen(false);
    fetch();
    
    
    await fetchMaterialsStore(true);
    void useDashboardStore.getState().invalidate();
  };

  const locationFields: FormField[] = useMemo(() => [
    { name: 'name', label: 'Nume locație', type: 'text' as const, required: true, placeholder: 'Hala principala' },
    { name: 'location_type', label: 'Tip', type: 'select' as const, options: [
      { value: 'depozit', label: 'Depozit' }, { value: 'hala', label: 'Hala' }, { value: 'exterior', label: 'Exterior' },
    ]},
  ], []);

  const handleCreateLocation = async (data: Record<string, unknown>) => {
    
    
    const name = String(data.name || '').trim();
    const slug = name.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32)
      .toUpperCase();
    const code = slug || `LOC-${Date.now().toString(36).toUpperCase()}`;
    await apiCommand('create_warehouse_location', {
      code, name, location_type: data.location_type || 'depozit',
    });
    setLocModalOpen(false);
    fetch();
    
    
    await useMaterialStore.getState().fetchLocations(true);
  };

  const handleRecordMovement = async (data: Record<string, unknown>) => {
    await apiCommand('record_stock_movement', {
      material_id: Number(data.material_id), movement_type: data.movement_type,
      quantity: Number(data.quantity), location_id: data.location_id ? Number(data.location_id) : null,
      project_id: data.project_id ? Number(data.project_id) : null,
      notes: data.notes || null,
    });
    fetch();
    
    await fetchMaterialsStore(true);
    void useDashboardStore.getState().invalidate();
  };

  
  
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
  const availableStock = (m: { id: number; stock: number }) =>
    Math.max(0, m.stock - (reservedByMaterial.get(m.id) ?? 0));
  const lowStock = materials.filter(m => availableStock(m) <= m.min_stock && m.min_stock > 0);

  const activeReservations = reservations.filter(r => r.status === 'reserved' || r.status === 'partially_issued').length;

  return (
    <Page className="mod-shell">
      <ViewerBanner page="warehouse" />

      {}
      <div className="px-5 pt-4 pb-8 space-y-4 shrink-0">
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Aprovizionare"
          icon={WarehouseIcon}
          title="Depozit"
          subtitle="Stoc curent, mișcări, rezervări și locații de depozitare"
          actions={
            <AnimatedTabs
              active={tab}
              onChange={(id) => setTab(id as Tab)}
              tabs={[
                { id: 'stock', label: 'Stoc' },
                { id: 'movements', label: 'Mișcări' },
                { id: 'reservations', label: 'Rezervări' },
                { id: 'locations', label: 'Locații' },
              ]}
            />
          }
        />
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={Package}       label="Total materiale"  value={materials.length} />
          <KpiMini icon={Repeat}        label="Rezervări active" value={activeReservations} />
          <KpiMini icon={WarehouseIcon} label="Locații"          value={locations.length} />
          <KpiMini icon={AlertTriangle} label="Stoc critic"      value={lowStock.length} warn={lowStock.length > 0} />
        </div>
      </div>

      {}
      <div className="flex-1 min-h-0 overflow-y-auto enter-up" style={{ animationDelay: '160ms' }}>
        {tab === 'stock' && (
          <div className="animate-page-in">
            {lowStock.length > 0 && (
              <div className="bg-status-red/10 border-b border-line px-6 py-3">
                <p className="text-sm font-medium text-status-red">Stoc critic — {lowStock.length} materiale sub minim</p>
                <p className="text-xs text-status-red/80 mt-1">{lowStock.map(m => m.name).join(', ')}</p>
              </div>
            )}
            <div className="flex items-center justify-between px-6 py-2.5 border-b border-line bg-surface-primary">
              <h2 className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Stoc curent — {materials.length} materiale</h2>
            </div>
            {

}
            <div className="bg-surface-secondary overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-left">Material</th>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-left">Categorie</th>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-left">UM</th>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-right">Stoc</th>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-right">Rezervat</th>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-right">Disponibil</th>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-right">Minim</th>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-left">Status</th>
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={8} className="px-3 py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-content-muted" /></td></tr> :
                   materials.length === 0 ? (
                    <tr><td colSpan={8} className="p-0">
                      <EmptyState
                        icon={Package}
                        title="Niciun material în stoc"
                        body="Adaugă materiale în inventar pentru a vedea stocul, rezervările și disponibilul aici."
                        size="lg"
                      />
                    </td></tr>
                   ) : (
                    materials.map(m => {
                      const reserved = reservedByMaterial.get(m.id) ?? 0;
                      const available = availableStock(m);
                      const isCritic = available <= m.min_stock && m.min_stock > 0;
                      return (
                      <tr key={m.id} className="hover:bg-surface-tertiary/30 transition-colors">
                        <td className="px-3 py-2 text-sm text-content-primary font-medium border-b border-line">{m.name}</td>
                        <td className="px-3 py-2 text-sm text-content-muted border-b border-line">{m.category}</td>
                        <td className="px-3 py-2 text-sm text-content-muted border-b border-line">{m.unit}</td>
                        <td className="px-3 py-2 text-sm text-content-secondary border-b border-line text-right tabular-nums">{m.stock}</td>
                        <td className="px-3 py-2 text-sm text-status-amber border-b border-line text-right tabular-nums">{reserved > 0 ? reserved : '—'}</td>
                        <td className="px-3 py-2 border-b border-line">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-xs tabular-nums">{available}</span>
                            <div className="w-16 h-1.5 bg-line overflow-hidden">
                              <div className="h-full transition-all" style={{
                                width: `${Math.min(100, (available / Math.max(m.min_stock * 2, 1)) * 100)}%`,
                                backgroundColor: available <= m.min_stock ? 'var(--status-red)' : available <= m.min_stock * 1.5 ? 'var(--status-amber)' : 'var(--status-green)'
                              }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-content-muted border-b border-line text-right tabular-nums">{m.min_stock}</td>
                        <td className="px-3 py-2 border-b border-line">
                          <StatusBadge size="xs" tone={isCritic ? 'danger' : 'success'} label={isCritic ? 'Critic' : 'OK'} />
                        </td>
                      </tr>
                      );
                    })
                   )}
                  {!loading && materials.length > 0 && (
                    <TableFiller cols={8} count={Math.max(0, 18 - materials.length)} />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'movements' && (
          <div className="animate-page-in">
            <div className="flex items-center justify-between px-6 py-2.5 border-b border-line bg-surface-primary">
              <h2 className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Miscari stoc</h2>
              <button onClick={() => openModal()} className="h-8 bg-accent px-3.5 text-xs font-semibold text-surface-primary flex items-center gap-1">
                <Plus className="h-4 w-4" /> Miscare noua
              </button>
            </div>
            <div className="bg-surface-secondary overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr>
                  {['Data', 'Tip', 'Material', 'Cantitate', 'Locație', 'Proiect', 'Utilizator'].map(h => <th key={h} className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary">{h}</th>)}
                </tr></thead>
                <tbody>
                  {movements.length === 0 ? null :
                    movements.map(mv => {
                      const MvIcon = moveIcons[mv.movement_type] || Package;
                      return (
                        <tr key={mv.id} className="hover:bg-surface-tertiary/30 transition-colors">
                          <td className="px-3 py-2 text-sm text-content-muted border-b border-line">{mv.created_at?.slice(0, 16)}</td>
                          <td className={`px-3 py-2 text-sm border-b border-line font-medium ${moveColors[mv.movement_type] || ''}`}>
                            <span className="flex items-center gap-1"><MvIcon className="h-3.5 w-3.5" />{moveLabels[mv.movement_type] || mv.movement_type}</span>
                          </td>
                          <td className="px-3 py-2 text-sm text-content-primary border-b border-line">{mv.material_name}</td>
                          <td className="px-3 py-2 text-sm text-content-primary border-b border-line text-right font-medium tabular-nums">{mv.quantity}</td>
                          <td className="px-3 py-2 text-sm text-content-muted border-b border-line">{mv.location_name || '—'}</td>
                          <td className="px-3 py-2 text-sm text-content-muted border-b border-line">{mv.project_name || '—'}</td>
                          <td className="px-3 py-2 text-sm text-content-muted border-b border-line">{mv.created_by_name || '—'}</td>
                        </tr>
                      );
                    })
                  }
                  <TableFiller cols={7} count={Math.max(0, 18 - movements.length)} />
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'reservations' && (() => {
          
          
          
          const SEVEN_DAYS = 7 * 24 * 3600 * 1000;
          const isPending = (r: Reservation) => r.status === 'reserved' || r.status === 'partially_issued';
          const ageDays = (r: Reservation): number | null => {
            if (!r.created_at) return null;
            const t = new Date(r.created_at).getTime();
            if (isNaN(t)) return null;
            return Math.floor((Date.now() - t) / (24 * 3600 * 1000));
          };
          const overdueReservations = reservations.filter(r => {
            if (!isPending(r) || !r.created_at) return false;
            const t = new Date(r.created_at).getTime();
            if (isNaN(t)) return false;
            return Date.now() - t > SEVEN_DAYS;
          });

          return (
          <div className="animate-page-in">
            <div className="flex items-center justify-between px-6 py-2.5 border-b border-line bg-surface-primary">
              <h2 className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Rezervari materiale</h2>
              <button onClick={() => setResModalOpen(true)} className="h-8 bg-accent px-3.5 text-xs font-semibold text-surface-primary flex items-center gap-1">
                <Plus className="h-4 w-4" /> Rezervare noua
              </button>
            </div>

            {
}
            {overdueReservations.length > 0 && (
              <div className="px-6 py-3 border-b border-status-red/30 bg-status-red/5 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-status-red shrink-0 mt-0.5" />
                <div className="text-pm-xs">
                  <p className="font-semibold text-status-red">
                    {overdueReservations.length} {overdueReservations.length === 1 ? 'rezervare' : 'rezervări'} restante &gt; 7 zile
                  </p>
                  <p className="text-content-secondary mt-0.5">
                    {overdueReservations.slice(0, 5).map(r => `${r.material_name} (${r.project_name})`).join(' · ')}
                    {overdueReservations.length > 5 ? ' …' : ''}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-surface-secondary overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-left">Proiect</th>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-left">Nod</th>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-left">Material</th>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-right">Rezervat</th>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-right">Eliberat</th>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-right">Vechime</th>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-left">Status</th>
                  <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary text-right">Acțiuni</th>
                </tr></thead>
                <tbody>
                  {reservations.length === 0 ? null :
                    reservations.map(r => {
                      const days = ageDays(r);
                      const overdue = isPending(r) && days != null && days > 7;
                      return (
                      <tr key={r.id} className={`hover:bg-surface-tertiary/30 transition-colors ${overdue ? 'bg-status-red/5' : ''}`}>
                        <td className="px-3 py-2 text-sm text-content-primary font-medium border-b border-line">{r.project_name}</td>
                        <td className="px-3 py-2 text-sm text-content-muted border-b border-line">{r.node_name}</td>
                        <td className="px-3 py-2 text-sm text-content-primary border-b border-line">{r.material_name}</td>
                        <td className="px-3 py-2 text-sm text-content-primary border-b border-line text-right tabular-nums">{r.quantity_reserved}</td>
                        <td className="px-3 py-2 text-sm text-status-green border-b border-line text-right tabular-nums">{r.quantity_issued}</td>
                        <td className="px-3 py-2 text-pm-xs border-b border-line text-right tabular-nums">
                          {days == null ? '—' : (
                            <span className={overdue ? 'text-status-red font-semibold' : 'text-content-muted'}>
                              {days}z{overdue ? ' ⚠' : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-b border-line">
                          <StatusBadge size="xs" tone={
                            r.status === 'fully_issued' ? 'success' :
                            r.status === 'partially_issued' ? 'warning' :
                            r.status === 'cancelled' ? 'neutral' :
                            'info'
                          } label={r.status} />
                        </td>
                        <td className="px-3 py-2 border-b border-line text-right">
                          {(r.status === 'reserved' || r.status === 'partially_issued') && (
                            <button
                              type="button"
                              onClick={() => {
                                const remaining = Math.max(0, (r.quantity_reserved ?? 0) - (r.quantity_issued ?? 0));
                                if (remaining <= 0) {
                                  toast.error('Nu mai există cantitate de eliberat');
                                  return;
                                }
                                setIssueTarget({ id: r.id, remaining, material: r.material_name });
                              }}
                              className="text-xs font-medium text-accent hover:text-accent/80 transition-colors whitespace-nowrap"
                            >
                              Eliberează
                            </button>
                          )}
                        </td>
                      </tr>
                      );
                    })
                  }
                  <TableFiller cols={8} count={Math.max(0, 18 - reservations.length)} />
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}

        {tab === 'locations' && (
          <div className="animate-page-in">
            <div className="flex items-center justify-between px-6 py-2.5 border-b border-line bg-surface-primary">
              <h2 className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Locații depozit — {locations.length} locații</h2>
              <button onClick={() => setLocModalOpen(true)} className="h-8 bg-accent px-3.5 text-xs font-semibold text-surface-primary flex items-center gap-1">
                <Plus className="h-4 w-4" /> Locație noua
              </button>
            </div>
            <div className="bg-surface-secondary overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr>
                  {['Cod', 'Nume', 'Tip'].map(h => <th key={h} className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary">{h}</th>)}
                </tr></thead>
                <tbody>
                  {locations.length === 0 ? null :
                    locations.map(l => (
                      <tr key={l.id} className="hover:bg-surface-tertiary/30 transition-colors">
                        <td className="px-3 py-2 text-sm text-accent font-mono border-b border-line">{l.code}</td>
                        <td className="px-3 py-2 text-sm text-content-primary font-medium border-b border-line">{l.name}</td>
                        <td className="px-3 py-2 text-sm text-content-muted border-b border-line">{l.location_type}</td>
                      </tr>
                    ))
                  }
                  <TableFiller cols={3} count={Math.max(0, 18 - locations.length)} />
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <FormModal isOpen={isOpen} onClose={closeModal} title="Mișcare stoc nouă" fields={movementFields} onSubmit={handleRecordMovement} submitLabel="Înregistrează" />
      <FormModal isOpen={resModalOpen} onClose={() => setResModalOpen(false)} title="Rezervare nouă" fields={reservationFields} onSubmit={handleCreateReservation} submitLabel="Creează rezervare" />
      <FormModal isOpen={locModalOpen} onClose={() => setLocModalOpen(false)} title="Locație nouă" fields={locationFields} onSubmit={handleCreateLocation} submitLabel="Adaugă locație" />

      {
}
      <FormModal
        isOpen={issueTarget !== null}
        onClose={() => setIssueTarget(null)}
        title={issueTarget ? `Eliberează rezervare — ${issueTarget.material}` : 'Eliberează rezervare'}
        fields={[
          {
            name: 'quantity',
            label: 'Cantitate de eliberat',
            type: 'number',
            required: true,
            placeholder: issueTarget ? `max ${issueTarget.remaining}` : '',
            hint: issueTarget ? `Rămas disponibil: ${issueTarget.remaining}` : undefined,
            validate: (v) => {
              const n = Number(v);
              if (!Number.isFinite(n) || n <= 0) return 'Introdu o cantitate pozitivă';
              if (issueTarget && n > issueTarget.remaining) return `Maxim ${issueTarget.remaining}`;
              return null;
            },
          },
        ]}
        initialData={issueTarget ? { quantity: issueTarget.remaining } : {}}
        submitLabel="Eliberează"
        onSubmit={async (data) => {
          if (!issueTarget) return;
          try {
            await apiCommand('issue_stock_reservation', {
              reservation_id: issueTarget.id,
              quantity: Number(data.quantity),
            });
            toast.success('Rezervare eliberată cu succes');
            fetch();
            await fetchMaterialsStore(true);
            void useDashboardStore.getState().invalidate();
            setIssueTarget(null);
          } catch (err) {
            
            throw err;
          }
        }}
      />
    </Page>
  );
}




function KpiMini({ icon: Icon, label, value, warn, format }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; warn?: boolean; format?: (n: number) => string;
}) {
  return (
    <GlassCard size="compact" className="flex items-center gap-3.5 !p-5">
      <span className="h-11 w-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted truncate">{label}</p>
        <MetricValue value={value} size="display" warn={warn} format={format} className="mt-0.5 block" />
      </div>
    </GlassCard>
  );
}
