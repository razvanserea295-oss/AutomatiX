import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  MapPin, Plus, Check, Loader2, Trash2, Plane, ArrowLeft, Pencil,
  DollarSign, Calendar, Users, X as XIcon, AlertOctagon, Info, Briefcase,
  FileText, User as UserIcon, Clock, Calculator, Wallet, Lock, CheckCircle2,
} from 'lucide-react';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { useProjectStore } from '@/store/projectStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { useSettingsStore, useMoney } from '@/store/settingsStore';
import TableFiller from '@/components/ui/TableFiller';
import { Skeleton, HeroHeader, GlassCard, MetricValue, EmptyState } from '@/components/ui';
import FilterBar from '@/components/ui/FilterBar';
import { toast } from '@/store/toastStore';
import { nativeNotify } from '@/lib/nativeNotify';
import { confirmDialog } from '@/components/ConfirmDialog';
import StatusBadge from '@/components/ui/StatusBadge';
import { deplasareStatus } from '@/lib/statusTokens';
import SortableTh from '@/components/ui/SortableTh';
import { useSort } from '@/hooks/useSort';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';
import { useEscClose } from '@/hooks/useEscClose';

interface Deplasare {
  id: number; person_name: string; destination: string; reason: string | null;
  project_id: number | null; project_name: string | null;
  departure_date: string; return_date: string | null; status: string;
  notes: string | null; created_by_name: string | null; created_at: string;
  transport_cost?: number | null; accommodation_cost?: number | null;
  other_costs?: number | null; diurna_per_day?: number | null; diurna_total?: number | null; total_cost?: number | null;
  currency?: string | null;
  exported_expense_id?: number | null;
  costs_completed_at?: string | null;
  additional_persons?: string[] | null;
}






function tripDays(departure?: string | null, ret?: string | null): number {
  if (!departure) return 1;
  const start = new Date(`${departure}T00:00:00`).getTime();
  const end = new Date(`${ret || departure}T00:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}







function computeDisplayStatus(d: Deplasare): string {
  if (d.status !== 'in_deplasare') return d.status;
  const today = new Date().toISOString().split('T')[0];
  if (d.departure_date > today) return 'viitoare';
  return d.status;
}


function daysSinceReturn(d: Deplasare): number | null {
  if (!d.return_date) return null;
  const ret = new Date(d.return_date).getTime();
  const now = Date.now();
  return Math.floor((now - ret) / (1000 * 60 * 60 * 24));
}

export default function DeplasariPage({ user }: { user: User | null }) {
  const [deplasari, setDeplasari] = useState<Deplasare[]>([]);
  const [loading, setLoading] = useState(true);
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const eurRate = useSettingsStore(s => s.eurToRonRate);
  const loadSettings = useSettingsStore(s => s.load);
  const money = useMoney();
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [completing, setCompleting] = useState<Deplasare | null>(null);
  const [editing, setEditing] = useState<Deplasare | null>(null);
  const [viewing, setViewing] = useState<Deplasare | null>(null);
  const [paying, setPaying] = useState<Deplasare | null>(null);
  
  
  const canCloseTrip = user?.role_id === 1 || user?.role_id === 3;

  const fetch = useCallback(() => {
    setLoading(true);
    apiCommand<Deplasare[]>('get_deplasari')
      .then(d => setDeplasari(d || []))
      .catch(() => setDeplasari([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch();
    void fetchProjects();
    void loadSettings();
  }, [fetch, fetchProjects, loadSettings]);

  const activeDeplasari = useMemo(
    () => deplasari.filter(d => d.status === 'in_deplasare' && computeDisplayStatus(d) === 'in_deplasare'),
    [deplasari],
  );

  
  const overdueCosts = useMemo(
    () => deplasari.filter(d => {
      if (d.status !== 'intors') return false;
      const ds = daysSinceReturn(d);
      if (ds == null || ds <= 7) return false;
      return !(d.transport_cost && d.transport_cost > 0 && d.accommodation_cost && d.accommodation_cost > 0);
    }),
    [deplasari],
  );

  
  
  
  
  const totalRecordedCost = useMemo(
    () => deplasari.reduce((s, d) => {
      const v = d.total_cost ?? 0;
      return s + ((d.currency || 'RON').toUpperCase() === 'EUR' ? v * eurRate : v);
    }, 0),
    [deplasari, eurRate],
  );

  const filteredDeplasari = useMemo(() => {
    let list = deplasari;
    if (filterStatus) list = list.filter(d => computeDisplayStatus(d) === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.person_name.toLowerCase().includes(q) ||
        d.destination.toLowerCase().includes(q) ||
        (d.reason || '').toLowerCase().includes(q) ||
        (d.project_name || '').toLowerCase().includes(q) ||
        (d.additional_persons || []).some(p => p.toLowerCase().includes(q))
      );
    }
    return list;
  }, [deplasari, filterStatus, search]);

  type DepSortKey = 'person_name' | 'destination' | 'reason' | 'project_name' | 'departure_date' | 'return_date' | 'status';
  const { sorted: sortedDeplasari, sort, toggle } = useSort<Deplasare, DepSortKey>(
    filteredDeplasari,
    (row, key) => {
      if (key === 'departure_date') return row.departure_date ? new Date(row.departure_date) : null;
      if (key === 'return_date') return row.return_date ? new Date(row.return_date) : null;
      if (key === 'status') return computeDisplayStatus(row);
      return row[key] ?? '';
    },
    { key: 'departure_date', dir: 'desc' },
  );

  const handleMarkReturned = async (id: number) => {
    const today = new Date().toISOString().split('T')[0];
    await apiCommand('update_deplasare', { id, status: 'intors', return_date: today });
    toast.success('Marcat ca întors. Completează costurile din butonul Editează (✎).');
    fetch();
    void useDashboardStore.getState().invalidate();
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ title: 'Șterge deplasarea?', danger: true }))) return;
    try {
      await apiCommand('delete_deplasare', { id });
      toast.success('Deplasare stearsa cu succes');
      fetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la stergerea deplasarii');
    }
  };

  
  
  
  
  
  const TABLE_MIN_W = 1000;
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const syncFromTop = () => {
    const top = topScrollRef.current, tbl = tableScrollRef.current;
    if (top && tbl && tbl.scrollLeft !== top.scrollLeft) tbl.scrollLeft = top.scrollLeft;
  };
  const syncFromTable = () => {
    const top = topScrollRef.current, tbl = tableScrollRef.current;
    if (top && tbl && top.scrollLeft !== tbl.scrollLeft) top.scrollLeft = tbl.scrollLeft;
  };

  return (
    <Page className="mod-shell">
      <div className="mod-canvas density-compact">

        {}
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Personal"
          icon={MapPin}
          title="Deplasări"
          subtitle="Delegații, costuri, diurnă și deconturi — toate într-un singur loc"
          actions={<>
            {activeDeplasari.length > 0 && (
              <span className="text-pm-2xs font-semibold bg-status-blue/15 text-status-blue px-2 py-1 rounded">
                {activeDeplasari.length} în deplasare
              </span>
            )}
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5" /> Deplasare nouă
            </Button>
          </>}
        />

        {}
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={MapPin}       label="Total deplasări"    value={deplasari.length} />
          <KpiMini icon={Plane}        label="Active acum"        value={activeDeplasari.length} />
          <KpiMini icon={AlertOctagon} label="Costuri întârziate" value={overdueCosts.length} warn={overdueCosts.length > 0} />
          <KpiMini icon={DollarSign}   label="Cost total"         value={totalRecordedCost} format={(n) => money(n, 'RON')} />
        </div>

        {



}
        <div className="flex flex-col xl:flex-row gap-6 items-start">

          {}
          <GlassCard size="regular" className="enter-up !p-0 overflow-hidden flex-1 min-w-0 w-full" style={{ animationDelay: '160ms' }}>
            <div className="px-5 pt-5 pb-3">
              <FilterBar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Caută persoana, destinatie..."
                filters={[{
                  key: 'status',
                  label: 'Status',
                  options: [
                    { value: 'viitoare', label: 'Viitoare' },
                    { value: 'in_deplasare', label: 'In deplasare' },
                    { value: 'intors', label: 'Intors (costuri lipsa)' },
                    { value: 'finalizat', label: 'Finalizat' },
                    { value: 'anulat', label: 'Anulat' },
                  ],
                  value: filterStatus,
                  onChange: setFilterStatus,
                }]}
              />
            </div>
            <div className="px-5 pb-3 flex items-center justify-between">
              <span className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Toate deplasările</span>
              <span className="text-pm-2xs text-content-muted">{sortedDeplasari.length} {sortedDeplasari.length === 1 ? 'înregistrare' : 'inregistrari'}</span>
            </div>
            {

}
            <div ref={topScrollRef} onScroll={syncFromTop}
              className="overflow-x-auto overflow-y-hidden px-5">
              <div style={{ width: TABLE_MIN_W, height: 1 }} />
            </div>
            <div ref={tableScrollRef} onScroll={syncFromTable}
              className="overflow-y-auto overflow-x-hidden table-fill min-h-[55vh] max-h-[70vh] px-5 pb-5">
              <table className="table-density w-full text-left border-collapse table-fixed"
                style={{ minWidth: TABLE_MIN_W }}>
              <colgroup>
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-surface-primary shadow-[inset_0_-1px_0_var(--color-border)]">
                <tr>
                  <SortableTh sortKey="person_name"    sort={sort} onSort={toggle}>Persoana</SortableTh>
                  <SortableTh sortKey="destination"    sort={sort} onSort={toggle}>Destinatie</SortableTh>
                  <SortableTh sortKey="reason"         sort={sort} onSort={toggle}>Motiv</SortableTh>
                  <SortableTh sortKey="project_name"   sort={sort} onSort={toggle}>Proiect</SortableTh>
                  <SortableTh sortKey="departure_date" sort={sort} onSort={toggle}>Plecare</SortableTh>
                  <SortableTh sortKey="return_date"    sort={sort} onSort={toggle}>Intoarcere</SortableTh>
                  <SortableTh sortKey="status"         sort={sort} onSort={toggle}>Status</SortableTh>
                  <th className="sticky right-0 z-20 bg-surface-primary border-l border-line/60 px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-3 py-3"><div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={28} rounded="sm" />)}</div></td></tr>
                ) : sortedDeplasari.map(d => {
                  const ds = daysSinceReturn(d);
                  const isOverdue = d.status === 'intors' && ds != null && ds > 7
                    && !(d.transport_cost && d.transport_cost > 0 && d.accommodation_cost && d.accommodation_cost > 0);
                  return (
                  <tr key={d.id} className={`group hover:bg-surface-tertiary/30 transition-colors ${isOverdue ? 'bg-status-red/5' : ''}`}>
                    <td className="px-3 py-2 text-sm text-content-primary font-medium border-b border-line/40 truncate" title={d.person_name}>
                      {d.person_name}
                      {d.additional_persons && d.additional_persons.length > 0 && (
                        <span className="ml-1.5 text-pm-2xs text-content-muted" title={d.additional_persons.join(', ')}>
                          +{d.additional_persons.length}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-content-secondary border-b border-line/40 truncate" title={d.destination}>{d.destination}</td>
                    <td className="px-3 py-2 text-xs text-content-muted border-b border-line/40 truncate" title={d.reason ?? ''}>{d.reason || '—'}</td>
                    <td className="px-3 py-2 text-xs text-accent border-b border-line/40 truncate" title={d.project_name ?? ''}>{d.project_name || '—'}</td>
                    <td className="px-3 py-2 text-xs text-content-muted tabular-nums border-b border-line/40">{d.departure_date}</td>
                    <td className="px-3 py-2 text-xs text-content-muted tabular-nums border-b border-line/40">{d.return_date || '—'}</td>
                    <td className="px-3 py-2 border-b border-line/40">
                      <StatusBadge {...deplasareStatus(computeDisplayStatus(d))} size="xs" />
                    </td>
                    <td className="sticky right-0 z-[5] bg-surface-primary border-l border-line/60 px-3 py-2 border-b border-line/40 group-hover:bg-surface-tertiary">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setViewing(d)} title="Detalii"
                          className="grid place-items-center h-7 w-7 rounded text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"><Info className="h-4 w-4" /></button>
                        <button onClick={() => setPaying(d)} title="Plăți & buget — înregistrează plăți către delegați, vezi bugetul rămas, închide delegația"
                          className="grid place-items-center h-7 w-7 rounded text-content-secondary hover:bg-status-green/10 hover:text-status-green transition-colors"><Wallet className="h-4 w-4" /></button>
                        <button onClick={() => setEditing(d)} title="Editează — date, status și costuri"
                          className="grid place-items-center h-7 w-7 rounded text-content-secondary hover:bg-accent/10 hover:text-accent transition-colors"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(d.id)} title="Șterge"
                          className="grid place-items-center h-7 w-7 rounded text-content-muted hover:bg-status-red/10 hover:text-status-red transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
                <TableFiller cols={8} count={Math.max(0, 16 - sortedDeplasari.length)} />
              </tbody>
            </table>
            </div>
          </GlassCard>

          {

}
          <div className="enter-up flex w-full shrink-0 flex-col gap-6 xl:w-[300px]" style={{ animationDelay: '240ms' }}>
            {overdueCosts.length > 0 && (
              <GlassCard size="regular" className="!p-4 border-l-2 !border-l-status-red/60">
                <div className="flex items-start gap-3">
                  <AlertOctagon className="h-5 w-5 text-status-red shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-status-red">
                      {overdueCosts.length} {overdueCosts.length === 1 ? 'deplasare' : 'deplasări'} cu costuri necompletate &gt; 7 zile
                    </p>
                    <p className="text-xs text-content-secondary mt-0.5">
                      Apasă <DollarSign className="h-3 w-3 inline" /> în tabel (sau Editează) pentru a completa costurile lipsă și a finaliza.
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}

            <GlassCard size="regular" className="!p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <Plane className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">În deplasare acum</span>
                {activeDeplasari.length > 0 && <span className="text-pm-2xs font-bold tabular-nums text-accent">{activeDeplasari.length}</span>}
              </div>
              <div className="px-5 pb-5">
                {loading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={92} rounded="lg" />)}</div>
                ) : activeDeplasari.length === 0 ? (
                  <EmptyState icon={Plane} title="Nimeni plecat" description="Nu există deplasări active în acest moment." />
                ) : (
                  <div className="space-y-2">
                    {activeDeplasari.map(d => (
                      <div key={d.id} className="glass-surface rounded-lg hover-lift p-3 border-l-2 border-l-status-blue">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-content-primary truncate flex items-center gap-1.5">
                              <Plane className="h-3.5 w-3.5 text-status-blue shrink-0" />{d.person_name}
                              {d.additional_persons && d.additional_persons.length > 0 && (
                                <span className="text-pm-2xs text-content-muted font-normal">+{d.additional_persons.length}</span>
                              )}
                            </p>
                            <p className="text-xs text-content-secondary mt-1 truncate"><MapPin className="h-3 w-3 inline mr-1" />{d.destination}</p>
                            {d.project_name && <p className="text-xs text-accent mt-0.5 truncate">{d.project_name}</p>}
                            <p className="text-pm-2xs text-content-muted mt-1 tabular-nums">{d.departure_date}{d.return_date ? ` → ${d.return_date}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => setViewing(d)} title="Detalii"
                              className="grid place-items-center h-7 w-7 rounded text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"><Info className="h-4 w-4" /></button>
                            <button onClick={() => setPaying(d)} title="Plăți & buget"
                              className="grid place-items-center h-7 w-7 rounded text-content-secondary hover:bg-status-green/10 hover:text-status-green transition-colors"><Wallet className="h-4 w-4" /></button>
                            <button onClick={() => setEditing(d)} title="Editează — date, status și costuri"
                              className="grid place-items-center h-7 w-7 rounded text-content-secondary hover:bg-accent/10 hover:text-accent transition-colors"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => handleMarkReturned(d.id)} title="Marcat întors"
                              className="grid place-items-center h-7 w-7 rounded text-content-muted hover:bg-surface-tertiary hover:text-status-green transition-colors"><ArrowLeft className="h-4 w-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateDeplasareModal
          projects={projects}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetch(); void useDashboardStore.getState().invalidate(); }}
        />
      )}

      {editing && (
        <CreateDeplasareModal
          editing={editing}
          projects={projects}
          onClose={() => setEditing(null)}
          onCreated={() => { setEditing(null); fetch(); void useDashboardStore.getState().invalidate(); }}
        />
      )}

      {completing && (
        <CompleteCostsModal
          deplasare={completing}
          onClose={() => setCompleting(null)}
          onCompleted={() => { setCompleting(null); fetch(); void useDashboardStore.getState().invalidate(); }}
        />
      )}

      {viewing && (
        <DeplasareInfoModal
          deplasare={viewing}
          onClose={() => setViewing(null)}
          onCompleteCosts={() => { setCompleting(viewing); setViewing(null); }}
          onOpenPayments={() => { setPaying(viewing); setViewing(null); }}
        />
      )}

      {paying && (
        <PaymentsModal
          deplasare={paying}
          canClose={canCloseTrip}
          onClose={() => setPaying(null)}
          onChanged={() => { fetch(); void useDashboardStore.getState().invalidate(); }}
        />
      )}
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






function CreateDeplasareModal({
  projects, onClose, onCreated, editing,
}: {
  projects: Array<{ id: number; name: string }>;
  onClose: () => void;
  onCreated: () => void;
  editing?: Deplasare | null;
}) {
  useEscClose(true, onClose);
  const money = useMoney();
  const isEdit = !!editing;
  const [personName, setPersonName] = useState(editing?.person_name ?? '');
  const [destination, setDestination] = useState(editing?.destination ?? '');
  const [reason, setReason] = useState(editing?.reason ?? '');
  const [projectId, setProjectId] = useState<number | ''>(editing?.project_id ?? '');
  const [departureDate, setDepartureDate] = useState(editing?.departure_date ?? '');
  const [returnDate, setReturnDate] = useState(editing?.return_date ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [extraPersons, setExtraPersons] = useState<string[]>(editing?.additional_persons ?? []);
  
  
  const [status, setStatus] = useState(editing?.status ?? 'in_deplasare');
  const [transport, setTransport] = useState(editing?.transport_cost ? String(editing.transport_cost) : '');
  const [accommodation, setAccommodation] = useState(editing?.accommodation_cost ? String(editing.accommodation_cost) : '');
  const [diurnaPerDay, setDiurnaPerDay] = useState(editing?.diurna_per_day ? String(editing.diurna_per_day) : '');
  const [diurna, setDiurna] = useState(editing?.diurna_total ? String(editing.diurna_total) : '');
  const [otherCost, setOtherCost] = useState(editing?.other_costs ? String(editing.other_costs) : '');
  const [currency, setCurrency] = useState(editing?.currency ?? 'RON');
  const [submitting, setSubmitting] = useState(false);

  const addExtra = () => setExtraPersons(prev => [...prev, '']);
  const removeExtra = (i: number) => setExtraPersons(prev => prev.filter((_, idx) => idx !== i));
  const updateExtra = (i: number, v: string) => setExtraPersons(prev => prev.map((x, idx) => idx === i ? v : x));

  const submit = async () => {
    if (!personName.trim()) { toast.error('Persoana este obligatorie'); return; }
    if (!destination.trim()) { toast.error('Destinatia este obligatorie'); return; }
    if (!departureDate) { toast.error('Data plecarii este obligatorie'); return; }
    setSubmitting(true);
    try {
      const fields = {
        person_name: personName.trim(),
        destination: destination.trim(),
        reason: reason.trim() || null,
        project_id: projectId ? Number(projectId) : null,
        departure_date: departureDate,
        return_date: returnDate || null,
        notes: notes.trim() || null,
        additional_persons: extraPersons.map(s => s.trim()).filter(Boolean),
      };
      if (isEdit && editing) {
        
        
        await apiCommand('update_deplasare', { request: {
          id: editing.id, status, ...fields,
          transport_cost: Number(transport) || 0,
          accommodation_cost: Number(accommodation) || 0,
          diurna_per_day: Number(diurnaPerDay) || 0,
          diurna_total: Number(diurna) || 0,
          other_costs: Number(otherCost) || 0,
          currency,
          diurna_people: 1 + extraPersons.map(s => s.trim()).filter(Boolean).length,
        } });
        toast.success('Deplasare actualizată');
      } else {
        
        
        await apiCommand('create_deplasare', { request: fields });
        toast.success('Deplasare înregistrată');
      }
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la creare');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-primary border border-line w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="shrink-0 border-b border-line p-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2">
            <Plane className="h-4 w-4" /> {isEdit ? 'Editează deplasarea' : 'Deplasare nouă'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-tertiary"><XIcon className="h-4 w-4" /></button>
        </div>

        <div className="p-4 space-y-3 flex-1 min-h-0 overflow-y-auto">
          <Field label="Persoana" required>
            <input value={personName} onChange={e => setPersonName(e.target.value)}
              placeholder="Nume complet" className="w-full input-md" />
          </Field>

          {}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">
                Persoane suplimentare (optional)
              </label>
              <button type="button" onClick={addExtra}
                className="text-pm-2xs text-accent hover:underline flex items-center gap-1">
                <Plus className="h-3 w-3" /> adaugă
              </button>
            </div>
            {extraPersons.length === 0 ? (
              <p className="text-pm-2xs text-content-muted italic">Doar persoana principala.</p>
            ) : (
              <div className="space-y-1.5">
                {extraPersons.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input value={p} onChange={e => updateExtra(i, e.target.value)}
                      placeholder={`Persoana #${i + 2}`}
                      className="flex-1 input-md" />
                    <button type="button" onClick={() => removeExtra(i)}
                      title="Șterge"
                      className="p-1.5 text-content-muted hover:text-status-red hover:bg-surface-tertiary">
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field label="Destinatie" required>
            <input value={destination} onChange={e => setDestination(e.target.value)}
              placeholder="Oras / locatie" className="w-full input-md" />
          </Field>

          <Field label="Motiv">
            <input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="ex: Montaj statie, Service, PIF" className="w-full input-md" />
          </Field>

          <Field label="Proiect (optional)">
            <select value={projectId} onChange={e => setProjectId(e.target.value ? Number(e.target.value) : '')}
              className="w-full input-md">
              <option value="">— niciun proiect —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data plecare" required>
              <input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)}
                className="w-full input-md" />
            </Field>
            <Field label="Data intoarcere (estimata)">
              <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)}
                className="w-full input-md" />
            </Field>
          </div>

          <Field label="Note">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full input-md resize-none" />
          </Field>

          {isEdit ? (
            <>
              <Field label="Status">
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full input-md">
                  <option value="in_deplasare">În deplasare</option>
                  <option value="intors">Întors (de completat costuri)</option>
                  <option value="finalizat">Finalizat</option>
                  <option value="anulat">Anulat</option>
                </select>
                <p className="text-pm-2xs text-content-muted mt-1">
                  Pentru a redeschide sau prelungi o deplasare, schimbă statusul aici — modificarea datei nu schimbă singură statusul.
                </p>
              </Field>

              <div className="border-t border-line pt-3 mt-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Costuri</p>
                  <label className="flex items-center gap-1.5 text-pm-2xs text-content-muted">
                    Monedă
                    <CurrencySelect value={currency} onChange={setCurrency} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Transport"><input type="number" min={0} step="0.01" value={transport} onChange={e => setTransport(e.target.value)} placeholder="0" className="w-full input-md tabular-nums" /></Field>
                  <Field label="Cazare"><input type="number" min={0} step="0.01" value={accommodation} onChange={e => setAccommodation(e.target.value)} placeholder="0" className="w-full input-md tabular-nums" /></Field>
                  <Field label="Alte costuri"><input type="number" min={0} step="0.01" value={otherCost} onChange={e => setOtherCost(e.target.value)} placeholder="0" className="w-full input-md tabular-nums" /></Field>
                </div>
                <div className="mt-3">
                  <DiurnaField
                    days={tripDays(departureDate, returnDate)}
                    people={1 + extraPersons.map(s => s.trim()).filter(Boolean).length}
                    currency={currency}
                    ratePerDay={diurnaPerDay} onRateChange={setDiurnaPerDay}
                    total={diurna} onTotalChange={setDiurna}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between bg-surface-secondary px-3 py-1.5 rounded">
                  <span className="text-pm-xs text-content-muted">Total costuri</span>
                  <span className="text-sm font-semibold tabular-nums text-content-primary">{money((Number(transport) || 0) + (Number(accommodation) || 0) + (Number(diurna) || 0) + (Number(otherCost) || 0), currency)}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-pm-2xs text-content-muted italic">
              Costurile (transport, cazare, diurnă, alte) se completează din butonul de Editare, după întoarcere.
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-line p-3 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs border border-line hover:bg-surface-tertiary">
            Anulează
          </button>
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            {isEdit ? 'Salvează' : 'Înregistrează'}
          </Button>
        </div>
      </div>

      <ModalStyles />
    </div>
  );
}






function CompleteCostsModal({
  deplasare, onClose, onCompleted,
}: {
  deplasare: Deplasare;
  onClose: () => void;
  onCompleted: () => void;
}) {
  useEscClose(true, onClose);
  const money = useMoney();
  const [transport, setTransport] = useState<string>(String(deplasare.transport_cost || ''));
  const [accommodation, setAccommodation] = useState<string>(String(deplasare.accommodation_cost || ''));
  const [other, setOther] = useState<string>(String(deplasare.other_costs || ''));
  const [diurnaPerDay, setDiurnaPerDay] = useState<string>(String(deplasare.diurna_per_day || ''));
  const [diurna, setDiurna] = useState<string>(String(deplasare.diurna_total || ''));
  const [currency, setCurrency] = useState<string>(deplasare.currency ?? 'RON');
  const [submitting, setSubmitting] = useState(false);

  const transportNum = Number(transport) || 0;
  const accommodationNum = Number(accommodation) || 0;
  const otherNum = Number(other) || 0;
  const diurnaNum = Number(diurna) || 0;
  const total = transportNum + accommodationNum + otherNum + diurnaNum;
  const willFinalize = transportNum > 0 && accommodationNum > 0;

  const submit = async () => {
    if (transportNum < 0 || accommodationNum < 0 || otherNum < 0) {
      toast.error('Costurile nu pot fi negative'); return;
    }
    setSubmitting(true);
    try {
      await apiCommand('update_deplasare', {
        id: deplasare.id,
        transport_cost: transportNum,
        accommodation_cost: accommodationNum,
        other_costs: otherNum,
        diurna_per_day: Number(diurnaPerDay) || 0,
        diurna_total: diurnaNum,
        currency,
        diurna_people: 1 + (deplasare.additional_persons?.length ?? 0),
      });
      toast.success(willFinalize ? 'Deplasare finalizata' : 'Costuri salvate');
      if (willFinalize) {
        nativeNotify({
          title: 'Delegație închisă',
          body: `Delegația către ${deplasare.destination || '—'} a fost închisă, costurile au fost transferate în Cheltuieli.`,
          level: 'success',
        });
      }
      onCompleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-primary border border-line w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="shrink-0 border-b border-line p-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Completeaza costuri
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-tertiary"><XIcon className="h-4 w-4" /></button>
        </div>

        <div className="p-4 space-y-3 flex-1 min-h-0 overflow-y-auto">
          <div className="text-pm-xs text-content-secondary border-l-2 border-accent pl-3">
            <p className="font-medium text-content-primary">{deplasare.person_name} → {deplasare.destination}</p>
            <p className="text-content-muted">
              Plecare: {deplasare.departure_date}
              {deplasare.return_date && ` · Intoarcere: ${deplasare.return_date}`}
            </p>
          </div>

          <Field label="Monedă">
            <CurrencySelect value={currency} onChange={setCurrency} />
          </Field>

          <Field label="Cost transport" required>
            <input type="number" min={0} step="0.01" value={transport}
              onChange={e => setTransport(e.target.value)}
              placeholder="0" className="w-full input-md tabular-nums" />
          </Field>

          <Field label="Cost cazare" required>
            <input type="number" min={0} step="0.01" value={accommodation}
              onChange={e => setAccommodation(e.target.value)}
              placeholder="0" className="w-full input-md tabular-nums" />
          </Field>

          <Field label="Alte costuri (optional)">
            <input type="number" min={0} step="0.01" value={other}
              onChange={e => setOther(e.target.value)}
              placeholder="0" className="w-full input-md tabular-nums" />
          </Field>

          <DiurnaField
            days={tripDays(deplasare.departure_date, deplasare.return_date)}
            people={1 + (deplasare.additional_persons?.length ?? 0)}
            currency={currency}
            ratePerDay={diurnaPerDay} onRateChange={setDiurnaPerDay}
            total={diurna} onTotalChange={setDiurna}
          />

          <div className="bg-surface-secondary px-3 py-2 flex items-center justify-between">
            <span className="text-pm-xs text-content-muted">Total</span>
            <span className="text-sm font-semibold text-content-primary tabular-nums">{money(total, currency)}</span>
          </div>

          {willFinalize ? (
            <p className="text-pm-2xs text-status-green flex items-center gap-1">
              <Check className="h-3 w-3" /> După salvare, deplasarea va fi marcata ca <strong>finalizata</strong>.
            </p>
          ) : (
            <p className="text-pm-2xs text-content-muted">
              Transport si cazare sunt obligatorii pentru finalizare. Daca nu sunt completate in 7 zile, se trimite alerta.
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-line p-3 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs border border-line hover:bg-surface-tertiary">
            Mai tarziu
          </button>
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            {willFinalize ? 'Finalizează' : 'Salvează'}
          </Button>
        </div>
      </div>

      <ModalStyles />
    </div>
  );
}







function DeplasareInfoModal({
  deplasare, onClose, onCompleteCosts, onOpenPayments,
}: {
  deplasare: Deplasare;
  onClose: () => void;
  onCompleteCosts: () => void;
  onOpenPayments: () => void;
}) {
  useEscClose(true, onClose);
  const money = useMoney();
  const ds = daysSinceReturn(deplasare);
  const isOverdue = deplasare.status === 'intors' && ds != null && ds > 7
    && !(deplasare.transport_cost && deplasare.transport_cost > 0
         && deplasare.accommodation_cost && deplasare.accommodation_cost > 0);

  const transport = deplasare.transport_cost ?? 0;
  const accommodation = deplasare.accommodation_cost ?? 0;
  const other = deplasare.other_costs ?? 0;
  const diurna = deplasare.diurna_total ?? 0;
  const total = transport + accommodation + other + diurna;
  const hasCosts = total > 0;

  const allPersons = [deplasare.person_name, ...(deplasare.additional_persons ?? [])];

  
  const dep = new Date(deplasare.departure_date);
  const ret = deplasare.return_date ? new Date(deplasare.return_date) : null;
  const tripDays = ret
    ? Math.max(1, Math.round((ret.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : null;

  const statusToken = deplasareStatus(computeDisplayStatus(deplasare));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-primary border border-line w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {}
        <div className="shrink-0 border-b border-line p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Plane className="h-4 w-4 text-status-blue shrink-0" />
              <h3 className="text-sm font-semibold text-content-primary truncate">
                {deplasare.person_name} → {deplasare.destination}
              </h3>
              <StatusBadge {...statusToken} size="xs" />
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-pm-2xs px-1.5 py-0.5 bg-status-red/15 text-status-red font-bold uppercase">
                  <AlertOctagon className="h-3 w-3" /> {(ds ?? 0) - 7}z întârziere
                </span>
              )}
            </div>
            {deplasare.reason && <p className="text-pm-xs text-content-muted mt-1 truncate">{deplasare.reason}</p>}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-tertiary shrink-0"><XIcon className="h-4 w-4" /></button>
        </div>

        {}
        <div className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
          {}
          <Section icon={<Users className="h-3.5 w-3.5" />} title={`Persoane (${allPersons.length})`}>
            <div className="flex flex-wrap gap-1.5">
              {allPersons.map((p, i) => (
                <span key={i}
                  className={`text-xs px-2 py-1 border ${i === 0 ? 'border-status-blue/40 bg-status-blue/5 text-status-blue font-semibold' : 'border-line text-content-secondary bg-surface-secondary'}`}>
                  {i === 0 ? '★ ' : ''}{p}
                </span>
              ))}
            </div>
          </Section>

          {}
          <Section icon={<MapPin className="h-3.5 w-3.5" />} title="Traseu">
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Destinație" value={deplasare.destination} />
              <InfoRow label="Proiect" value={deplasare.project_name || '—'} highlight={!!deplasare.project_name} />
            </div>
          </Section>

          {}
          <Section icon={<Calendar className="h-3.5 w-3.5" />} title="Cronologie">
            <div className="grid grid-cols-3 gap-3">
              <InfoRow label="Plecare" value={deplasare.departure_date} />
              <InfoRow label="Întoarcere" value={deplasare.return_date || '—'} />
              <InfoRow label="Durată" value={tripDays != null ? `${tripDays} ${tripDays === 1 ? 'zi' : 'zile'}` : '—'} />
            </div>
            {deplasare.costs_completed_at && (
              <p className="text-pm-2xs text-content-muted mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Costuri completate la {new Date(deplasare.costs_completed_at).toLocaleString('ro-RO')}
              </p>
            )}
          </Section>

          {}
          <Section icon={<DollarSign className="h-3.5 w-3.5" />} title="Costuri">
            {!hasCosts ? (
              <div className="text-center py-3 px-3 bg-surface-tertiary/40 border border-dashed border-line">
                <p className="text-pm-xs text-content-muted italic">Costurile nu au fost completate încă.</p>
                {deplasare.status === 'intors' && (
                  <button onClick={onCompleteCosts}
                    className={`mt-2 text-xs font-semibold inline-flex items-center gap-1 ${isOverdue ? 'text-status-red hover:underline' : 'text-accent hover:underline'}`}>
                    <DollarSign className="h-3 w-3" /> Completează acum
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <CostBox label="Transport" value={transport} currency={deplasare.currency} />
                  <CostBox label="Cazare" value={accommodation} currency={deplasare.currency} />
                  <CostBox label="Diurnă" value={diurna} dim={!diurna} currency={deplasare.currency} />
                  <CostBox label="Alte costuri" value={other} dim={!other} currency={deplasare.currency} />
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                  <span className="text-pm-2xs uppercase font-bold tracking-wide text-content-muted">Total</span>
                  <span className="text-base font-semibold tabular-nums text-content-primary">{money(total, deplasare.currency)}</span>
                </div>
              </>
            )}
          </Section>

          {

}
          <PaymentsSection deplasare={deplasare} onOpenPayments={onOpenPayments} />

          {}
          {deplasare.notes && (
            <Section icon={<FileText className="h-3.5 w-3.5" />} title="Note">
              <p className="text-pm-xs text-content-secondary whitespace-pre-wrap leading-relaxed">{deplasare.notes}</p>
            </Section>
          )}

          {}
          <Section icon={<UserIcon className="h-3.5 w-3.5" />} title="Înregistrare">
            <p className="text-pm-xs text-content-muted">
              Creat de <span className="text-content-secondary font-medium">{deplasare.created_by_name || '—'}</span> la {new Date(deplasare.created_at).toLocaleString('ro-RO')}
            </p>
          </Section>
        </div>

        {}
        <div className="shrink-0 border-t border-line p-3 flex items-center justify-between">
          <div className="flex items-center gap-1 text-pm-2xs text-content-muted">
            <Briefcase className="h-3 w-3" />
            #{deplasare.id}
          </div>
          <div className="flex items-center gap-2">
            {deplasare.status === 'intors' && (
              <Button size="sm" onClick={onCompleteCosts}>
                <DollarSign className="h-3 w-3" /> Completează costuri
              </Button>
            )}
            <button onClick={onClose} className="px-3 py-1.5 text-xs border border-line hover:bg-surface-tertiary">
              Închide
            </button>
          </div>
        </div>
      </div>

      <ModalStyles />
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted mb-2">
        {icon} {title}
      </h4>
      {children}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-pm-2xs text-content-muted uppercase tracking-wide font-semibold mb-0.5">{label}</div>
      <div className={`text-xs tabular-nums ${highlight ? 'text-accent font-medium' : 'text-content-primary'}`}>{value}</div>
    </div>
  );
}

function CostBox({ label, value, dim, currency }: { label: string; value: number; dim?: boolean; currency?: string | null }) {
  const money = useMoney();
  return (
    <div className={`border border-line bg-surface-secondary px-2 py-2 ${dim ? 'opacity-60' : ''}`}>
      <div className="text-pm-2xs text-content-muted uppercase tracking-wide font-semibold">{label}</div>
      <div className="text-sm font-semibold tabular-nums text-content-primary mt-0.5">
        {money(value, currency)}
      </div>
    </div>
  );
}

interface TripPayment {
  id: number; amount: number; currency: string; paid_at: string;
  paid_to: string | null; note: string | null; created_by_name: string | null;
}







function PaymentsSection({ deplasare, onOpenPayments }: { deplasare: Deplasare; onOpenPayments?: () => void }) {
  const money = useMoney();
  const cur = deplasare.currency || 'RON';
  const [payments, setPayments] = useState<TripPayment[]>([]);
  const [summary, setSummary] = useState({ total_paid: 0, total_cost: deplasare.total_cost ?? 0, remaining: deplasare.total_cost ?? 0 });
  const [amount, setAmount] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiCommand<{ payments: TripPayment[]; total_paid: number; total_cost: number; remaining: number }>(
        'list_deplasare_payments', { deplasare_id: deplasare.id },
      );
      setPayments(res.payments || []);
      setSummary({ total_paid: res.total_paid || 0, total_cost: res.total_cost || 0, remaining: res.remaining || 0 });
    } catch {  }
  }, [deplasare.id]);
  useEffect(() => { void load(); }, [load]);

  const add = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) { toast.error('Suma trebuie să fie > 0'); return; }
    setBusy(true);
    try {
      await apiCommand('record_deplasare_payment', { deplasare_id: deplasare.id, amount: amt, currency: cur, paid_to: paidTo.trim() || null });
      setAmount(''); setPaidTo('');
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Eroare'); }
    finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    if (!(await confirmDialog({ title: 'Ștergi plata?', confirmLabel: 'Șterge', danger: true }))) return;
    try { await apiCommand('delete_deplasare_payment', { id }); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Eroare'); }
  };

  return (
    <Section icon={<Wallet className="h-3.5 w-3.5" />} title="Plăți / Decont">
      <div className="grid grid-cols-3 gap-2">
        <Mini label="Buget" value={money(summary.total_cost, cur)} />
        <Mini label="Plătit" value={money(summary.total_paid, cur)} />
        <Mini label="Rămas" value={money(summary.remaining, cur)} strong />
      </div>
      {onOpenPayments && (
        <button type="button" onClick={onOpenPayments}
          className="mt-2 text-pm-2xs text-accent hover:underline inline-flex items-center gap-1">
          <Wallet className="h-3 w-3" /> Deschide panoul complet Plăți &amp; buget (dată, beneficiar, notă, închidere)
        </button>
      )}
      {deplasare.exported_expense_id != null && (
        <p className="text-pm-2xs text-status-green mt-2 flex items-center gap-1">
          <Check className="h-3 w-3" /> Postat automat în Financiar / Cheltuieli
        </p>
      )}
      {payments.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {payments.map(p => (
            <div key={p.id} className="flex items-center gap-2 border border-line bg-surface-secondary px-2.5 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-pm-xs text-content-primary tabular-nums">{money(p.amount, p.currency)}{p.paid_to ? ` · ${p.paid_to}` : ''}</p>
                <p className="text-pm-2xs text-content-muted">{p.paid_at}{p.created_by_name ? ` · ${p.created_by_name}` : ''}</p>
              </div>
              <button type="button" onClick={() => remove(p.id)} title="Șterge plata"
                className="p-1 text-content-muted hover:text-status-red transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-1.5 mt-2">
        <div className="flex-1 min-w-0">
          <input type="number" min={0} step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder={`Sumă (${cur})`} className="w-full input-md tabular-nums" />
        </div>
        <div className="flex-1 min-w-0">
          <input value={paidTo} onChange={e => setPaidTo(e.target.value)} placeholder="Către (opțional)" className="w-full input-md" />
        </div>
        <Button size="sm" onClick={add} disabled={busy}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Plată
        </Button>
      </div>
    </Section>
  );
}










interface PaymentsSummary {
  total_paid: number; total_cost: number; remaining: number;
  currency: string; eur_rate: number;
}

function PaymentsModal({ deplasare, canClose, onClose, onChanged }: {
  deplasare: Deplasare;
  canClose: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  useEscClose(true, onClose);
  const money = useMoney();
  const eurRateStore = useSettingsStore(s => s.eurToRonRate);
  const tripCur = (deplasare.currency || 'RON').toUpperCase();
  const today = new Date().toISOString().split('T')[0];

  const [payments, setPayments] = useState<TripPayment[]>([]);
  const [summary, setSummary] = useState<PaymentsSummary>({
    total_paid: 0, total_cost: deplasare.total_cost ?? 0,
    remaining: deplasare.total_cost ?? 0, currency: tripCur, eur_rate: eurRateStore,
  });
  const [paidAt, setPaidAt] = useState(today);
  const [amount, setAmount] = useState('');
  const [payCur, setPayCur] = useState(tripCur);
  const [paidTo, setPaidTo] = useState(deplasare.person_name);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  
  
  const [status, setStatus] = useState(deplasare.status);
  const [exportedId, setExportedId] = useState<number | null>(deplasare.exported_expense_id ?? null);

  const persons = [deplasare.person_name, ...(deplasare.additional_persons ?? [])];

  const load = useCallback(async () => {
    try {
      const res = await apiCommand<PaymentsSummary & { payments: TripPayment[] }>(
        'list_deplasare_payments', { deplasare_id: deplasare.id },
      );
      setPayments(res.payments || []);
      setSummary({
        total_paid: res.total_paid || 0, total_cost: res.total_cost || 0,
        remaining: res.remaining ?? 0, currency: res.currency || tripCur,
        eur_rate: res.eur_rate || eurRateStore,
      });
    } catch {  }
  }, [deplasare.id, tripCur, eurRateStore]);
  useEffect(() => { void load(); }, [load]);

  const eurRate = summary.eur_rate || eurRateStore || 4.97;
  const amtNum = Number(amount) || 0;
  
  
  const amtInTripCur = payCur === tripCur ? amtNum
    : payCur === 'EUR' ? amtNum * eurRate
    : eurRate > 0 ? amtNum / eurRate : amtNum;
  const budget = summary.total_cost;
  const overBudget = budget > 0 && summary.total_paid > budget + 0.005;
  const paidPct = budget > 0 ? Math.min(100, (summary.total_paid / budget) * 100) : 0;
  const isClosed = status === 'finalizat';
  const isCancelled = status === 'anulat';

  const add = async () => {
    if (amtNum <= 0) { toast.error('Suma plății trebuie să fie > 0'); return; }
    if (budget > 0 && amtInTripCur > summary.remaining + 0.005) {
      const ok = await confirmDialog({
        title: 'Plata depășește bugetul rămas',
        body: `Rămas: ${money(summary.remaining, tripCur)} · această plată: ${money(amtInTripCur, tripCur)}.`,
        hint: 'Poți continua — depășirea va apărea cu roșu în sumar.',
        confirmLabel: 'Înregistrează oricum',
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await apiCommand('record_deplasare_payment', {
        deplasare_id: deplasare.id, amount: amtNum, currency: payCur,
        paid_at: paidAt || today, paid_to: paidTo.trim() || null, note: note.trim() || null,
      });
      toast.success('Plată înregistrată — bugetul rămas a fost actualizat');
      setAmount(''); setNote('');
      await load();
      onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Eroare la înregistrarea plății'); }
    finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    if (!(await confirmDialog({ title: 'Ștergi plata?', confirmLabel: 'Șterge', danger: true }))) return;
    try { await apiCommand('delete_deplasare_payment', { id }); await load(); onChanged(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Eroare'); }
  };

  const closeTrip = async () => {
    const ok = await confirmDialog({
      title: 'Închizi delegația?',
      body: `${deplasare.person_name} → ${deplasare.destination} · Total costuri: ${money(budget, tripCur)} · Plătit: ${money(summary.total_paid, tripCur)} · Rămas: ${money(summary.remaining, tripCur)}`,
      hint: !deplasare.project_id
        ? 'Atenție: fără proiect asociat, costurile NU pot fi transferate în Financiar/Cheltuieli. Setează proiectul din Editează (✎) înainte de închidere.'
        : budget <= 0
          ? 'Nu există costuri înregistrate — nu se va transfera nimic în Financiar. Completează costurile din Editează (✎) dacă lipsesc.'
          : 'Costurile (transport + cazare + altele) și diurna vor fi transferate automat în Financiar / Cheltuieli, cu beneficiar, perioadă și ID-ul deplasării.',
      confirmLabel: 'Marchează încheiată',
    });
    if (!ok) return;
    setClosing(true);
    try {
      const updated = await apiCommand<Deplasare>('update_deplasare', { id: deplasare.id, status: 'finalizat' });
      setStatus('finalizat');
      const expId = updated?.exported_expense_id ?? null;
      setExportedId(expId);
      if (expId != null) {
        toast.success('Delegație închisă — costurile au fost transferate în Financiar / Cheltuieli');
        nativeNotify({
          title: 'Delegație închisă',
          body: `Delegația ${deplasare.person_name} → ${deplasare.destination} a fost închisă; costurile au fost transferate în Cheltuieli.`,
          level: 'success',
        });
      } else {
        toast.success('Delegație închisă');
      }
      onChanged();
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Eroare la închiderea delegației'); }
    finally { setClosing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-primary border border-line w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {}
        <div className="shrink-0 border-b border-line p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Wallet className="h-4 w-4 text-accent shrink-0" />
              <h3 className="text-sm font-semibold text-content-primary truncate">
                Plăți &amp; buget — {deplasare.person_name} → {deplasare.destination}
              </h3>
              <StatusBadge {...deplasareStatus(computeDisplayStatus({ ...deplasare, status }))} size="xs" />
            </div>
            <p className="text-pm-2xs text-content-muted mt-1 tabular-nums">
              #{deplasare.id} · {deplasare.departure_date}{deplasare.return_date ? ` → ${deplasare.return_date}` : ''}
              {deplasare.project_name ? ` · ${deplasare.project_name}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-tertiary shrink-0"><XIcon className="h-4 w-4" /></button>
        </div>

        {}
        <div className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
          {}
          <Section icon={<DollarSign className="h-3.5 w-3.5" />} title="Buget deplasare">
            <div className="grid grid-cols-3 gap-2">
              <Mini label="Buget total" value={money(budget, tripCur)} />
              <Mini label="Cheltuit (plătit)" value={money(summary.total_paid, tripCur)} />
              <Mini label="Rămas" value={money(summary.remaining, tripCur)} strong />
            </div>
            <div className="mt-2 h-1.5 rounded bg-surface-tertiary overflow-hidden">
              <div className={`h-full rounded transition-all ${overBudget ? 'bg-status-red' : 'bg-accent'}`}
                style={{ width: `${paidPct}%` }} />
            </div>
            {overBudget && (
              <p className="text-pm-2xs text-status-red mt-1.5 flex items-center gap-1">
                <AlertOctagon className="h-3 w-3" /> Plățile depășesc bugetul cu {money(summary.total_paid - budget, tripCur)}.
              </p>
            )}
            {budget <= 0 && (
              <p className="text-pm-2xs text-content-muted mt-1.5">
                Bugetul (transport, cazare, diurnă, alte costuri) se înregistrează din butonul Editează (✎). Plățile se pot adăuga și înainte — vor apărea ca depășire până la setarea bugetului.
              </p>
            )}
          </Section>

          {}
          <Section icon={<Wallet className="h-3.5 w-3.5" />} title={`Plăți către delegați (${payments.length})`}>
            {payments.length === 0 ? (
              <p className="text-pm-xs text-content-muted italic py-1">Nicio plată înregistrată încă.</p>
            ) : (
              <div className="space-y-1.5">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center gap-2 border border-line bg-surface-secondary px-2.5 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-pm-xs text-content-primary tabular-nums">
                        <span className="font-semibold">{money(p.amount, p.currency)}</span>
                        {p.currency.toUpperCase() !== tripCur && (
                          <span className="text-content-muted"> ({p.amount.toLocaleString('ro-RO')} {p.currency.toUpperCase()})</span>
                        )}
                        {p.paid_to ? ` · ${p.paid_to}` : ''}
                      </p>
                      <p className="text-pm-2xs text-content-muted">
                        {p.paid_at}{p.created_by_name ? ` · înregistrat de ${p.created_by_name}` : ''}{p.note ? ` · ${p.note}` : ''}
                      </p>
                    </div>
                    <button type="button" onClick={() => remove(p.id)} title="Șterge plata"
                      className="p-1 text-content-muted hover:text-status-red transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}

            {}
            {!isCancelled && (
              <div className="mt-3 border border-line/60 bg-surface-secondary/40 p-2.5 space-y-2">
                <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Adaugă plată</p>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Data">
                    <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} className="w-full input-md" />
                  </Field>
                  <Field label="Sumă" required>
                    <input type="number" min={0} step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="0" className="w-full input-md tabular-nums" />
                  </Field>
                  <Field label="Monedă">
                    <CurrencySelect value={payCur} onChange={setPayCur} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Beneficiar">
                    <input list={`dep-persons-${deplasare.id}`} value={paidTo} onChange={e => setPaidTo(e.target.value)}
                      placeholder="Persoana plătită" className="w-full input-md" />
                    <datalist id={`dep-persons-${deplasare.id}`}>
                      {persons.map((p, i) => <option key={i} value={p} />)}
                    </datalist>
                  </Field>
                  <Field label="Notă (opțional)">
                    <input value={note} onChange={e => setNote(e.target.value)} placeholder="ex: avans numerar" className="w-full input-md" />
                  </Field>
                </div>
                {payCur !== tripCur && amtNum > 0 && (
                  <p className="text-pm-2xs text-content-muted tabular-nums">
                    ≈ {money(amtInTripCur, tripCur)} la cursul BNR ({eurRate.toFixed(4)} RON/EUR) — se scade din bugetul în {tripCur}.
                  </p>
                )}
                <div className="flex justify-end">
                  <Button size="sm" onClick={add} disabled={busy}>
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Adaugă plată
                  </Button>
                </div>
              </div>
            )}
          </Section>

          {}
          <Section icon={<CheckCircle2 className="h-3.5 w-3.5" />} title="Închidere delegație">
            {isClosed ? (
              <div className="border border-status-green/40 bg-status-green/5 px-3 py-2.5">
                <p className="text-pm-xs text-status-green font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Delegație încheiată
                </p>
                <p className="text-pm-2xs mt-1 flex items-center gap-1 text-content-secondary">
                  {exportedId != null
                    ? <><Check className="h-3 w-3 text-status-green" /> Costurile au fost transferate automat în Financiar / Cheltuieli (transport+cazare+altele și diurnă, cu beneficiar, perioadă și ID deplasare).</>
                    : 'Nu s-a transferat nimic în Financiar (lipsește proiectul sau costurile sunt 0).'}
                </p>
              </div>
            ) : isCancelled ? (
              <p className="text-pm-xs text-content-muted italic">Deplasarea este anulată.</p>
            ) : canClose ? (
              <div className="border border-line/60 bg-surface-secondary/40 px-3 py-2.5 flex items-center justify-between gap-3">
                <p className="text-pm-2xs text-content-secondary min-w-0">
                  La închidere, toate costurile înregistrate (buget + diurnă) se transferă automat în <span className="font-semibold">Financiar / Cheltuieli</span>{!deplasare.project_id && <span className="text-status-red font-semibold"> — necesită un proiect asociat (lipsește!)</span>}.
                </p>
                <Button size="sm" onClick={closeTrip} disabled={closing}>
                  {closing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Marchează încheiată
                </Button>
              </div>
            ) : (
              <p className="text-pm-2xs text-content-muted flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Doar Admin sau Manager poate închide delegația.
              </p>
            )}
          </Section>
        </div>

        {}
        <div className="shrink-0 border-t border-line p-3 flex items-center justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-xs border border-line hover:bg-surface-tertiary">
            Închide fereastra
          </button>
        </div>
      </div>

      <ModalStyles />
    </div>
  );
}

function Mini({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="border border-line bg-surface-secondary px-2 py-1.5">
      <div className="text-pm-2xs text-content-muted uppercase tracking-wide">{label}</div>
      <div className={`tabular-nums ${strong ? 'text-sm font-semibold text-content-primary' : 'text-pm-xs text-content-secondary'}`}>{value}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">
        {label}{required && <span className="text-status-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}


function CurrencySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="input-md tabular-nums" aria-label="Monedă">
      <option value="RON">RON</option>
      <option value="EUR">EUR</option>
    </select>
  );
}







function DiurnaField({ days, people, currency = 'RON', ratePerDay, onRateChange, total, onTotalChange }: {
  days: number;
  people: number;
  currency?: string;
  ratePerDay: string; onRateChange: (v: string) => void;
  total: string; onTotalChange: (v: string) => void;
}) {
  const money = useMoney();
  const rate = Number(ratePerDay) || 0;
  const headcount = Math.max(1, people);
  const computed = Math.round(rate * days * headcount * 100) / 100;
  const cur = currency || 'RON';
  const dayLabel = days === 1 ? 'zi' : 'zile';
  const persLabel = headcount === 1 ? 'persoană' : 'persoane';
  return (
    <div className="border border-line/60 bg-surface-secondary/40 p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Diurnă</label>
        <span className="text-pm-2xs text-content-muted inline-flex items-center gap-1" title="Persoane în delegație (principal + suplimentari)">
          <Users className="h-3 w-3" /> {headcount} {persLabel}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          <label className="text-pm-2xs text-content-muted block mb-1">{cur} / zi / persoană</label>
          <input type="number" min={0} step="0.01" value={ratePerDay}
            onChange={e => onRateChange(e.target.value)} placeholder="ex: 50"
            className="w-full input-md tabular-nums" />
        </div>
        <button type="button"
          onClick={() => onTotalChange(computed ? String(computed) : '')}
          disabled={rate <= 0}
          title={`Calculează: ${rate} ${cur} × ${days} ${dayLabel} × ${headcount} ${persLabel} = ${money(computed, cur)}`}
          className="h-9 shrink-0 px-2.5 inline-flex items-center gap-1 text-pm-xs font-semibold bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Calculator className="h-3.5 w-3.5" /> = total
        </button>
        <div className="flex-1 min-w-0">
          <label className="text-pm-2xs text-content-muted block mb-1">Total ({cur})</label>
          <input type="number" min={0} step="0.01" value={total}
            onChange={e => onTotalChange(e.target.value)} placeholder="0"
            className="w-full input-md tabular-nums" />
        </div>
      </div>
      <p className="text-pm-2xs text-content-muted mt-1.5">
        {rate > 0
          ? `${rate} ${cur} × ${days} ${dayLabel} × ${headcount} ${persLabel} = ${money(computed, cur)} — apasă „= total" sau scrie manual.`
          : `Deplasarea are ${days} ${dayLabel} și ${headcount} ${persLabel}. Introdu suma pe zi/persoană și apasă „= total", sau scrie manual.`}
      </p>
    </div>
  );
}

function ModalStyles() {
  return (
    <style>{`
      .input-md { border-radius: 0.25rem; border: 1px solid var(--color-border);
                  background-color: var(--color-bg-primary); padding: 0.5rem 0.75rem;
                  font-size: 0.8125rem; color: var(--color-text-primary); }
      .input-md:focus { outline: none; box-shadow: 0 0 0 1px var(--color-accent); }
    `}</style>
  );
}
