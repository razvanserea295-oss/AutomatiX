





































import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Wrench, Plus, Search, Trash2, Pencil, Loader2, X, Check, AlertCircle, Camera, ImageOff, ListChecks, Boxes, DollarSign, FolderKanban } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import type { User } from '@/core/types';
import type { ProjectPiece } from '@/types/piece';
import { useProjectStore } from '@/store/projectStore';
import { usePieceStore, usePiecesForProject } from '@/store/pieceStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import { useMoney } from '@/store/settingsStore';

import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import Page from '@/redesign/ui/Page';
import KpiCard from '@/redesign/ui/KpiCard';
import StatusBadge from '@/redesign/ui/StatusBadge';
import { GlassCard, MetricValue, EmptyState } from '@/redesign/ui';
import { filterSearchInputCls, filterSearchIconCls, filterClearInlineBtnCls, filterSelectCls, filterToggleCls } from '@/redesign/ui/filterControls';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';

interface PieceServiceRow {
  id: number;
  project_id: number;
  project_piece_id: number;
  piece_name: string | null;
  piece_category: string | null;
  project_name: string | null;
  title: string;
  defect: string | null;
  service_description: string | null;
  technician_id: number | null;
  technician_name: string | null;
  service_date: string;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  status: string;
  notes: string | null;
  before_photo: string | null;
  after_photo: string | null;
  created_at: string;
  updated_at: string;
}






async function compressImage(file: File, maxEdge = 1024, quality = 0.7): Promise<string> {
  
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('Imaginea nu a putut fi citită'));
      im.src = url;
    });
    let { width, height } = img;
    if (width > maxEdge || height > maxEdge) {
      const scale = maxEdge / Math.max(width, height);
      width  = Math.round(width  * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponibil');
    ctx.drawImage(img, 0, 0, width, height);
    
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const STATUS_BADGE: Record<string, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  in_lucru:   { label: 'In lucru',   tone: 'warning' },
  finalizat:  { label: 'Finalizat',  tone: 'success' },
  anulat:     { label: 'Anulat',     tone: 'danger' },
};

const STATUS_OPTIONS = [
  { value: 'in_lucru',  label: 'In lucru' },
  { value: 'finalizat', label: 'Finalizat' },
  { value: 'anulat',    label: 'Anulat' },
];

export default function MaintenancePage(_props: { user: User | null }) {
  const money = useMoney();
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const pieces = usePiecesForProject(selectedProject);
  const fetchPiecesStore = usePieceStore(s => s.fetchPieces);
  const [services, setServices] = useState<PieceServiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<PieceServiceRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  
  useEffect(() => { void fetchProjects(); }, [fetchProjects]);

  
  const reload = useCallback(() => {
    if (!selectedProject) { setServices([]); return; }
    setLoading(true);
    Promise.all([
      fetchPiecesStore(selectedProject, true),
      apiCommand<PieceServiceRow[]>('list_piece_services', { project_id: selectedProject }),
    ])
      .then(([_ps, ss]) => { setServices(ss); })
      .catch(() => { setServices([]); })
      .finally(() => setLoading(false));
  }, [selectedProject, fetchPiecesStore]);

  useEffect(() => { reload(); }, [reload]);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (row: PieceServiceRow) => {
    
    
    startMorphTransition(() => flushSync(() => { setEditing(row); setShowForm(true); }), { dir: 'forward' });
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleDelete = async (row: PieceServiceRow) => {
    if (!(await confirmDialog({ title: 'Șterge servisarea?', body: `"${row.title}" va fi ștearsă din istoricul de mentenanță.`, danger: true }))) return;
    try {
      await apiCommand('delete_piece_service', { id: row.id });
      toast.success('Sters cu succes');
      reload();
      
      await useProjectStore.getState().refreshAll();
      void useDashboardStore.getState().invalidate();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Eroare'); }
  };

  const totalCost = useMemo(() => services.reduce((s, r) => s + (r.total_cost || 0), 0), [services]);

  
  const laborTotal = useMemo(() => services.reduce((s, r) => s + (r.labor_cost || 0), 0), [services]);
  const partsTotal = useMemo(() => services.reduce((s, r) => s + (r.parts_cost || 0), 0), [services]);
  
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of services) m[r.status] = (m[r.status] || 0) + 1;
    return m;
  }, [services]);

  
  
  const visibleServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q)
        || (r.piece_name ?? '').toLowerCase().includes(q)
        || (r.piece_category ?? '').toLowerCase().includes(q)
        || (r.technician_name ?? '').toLowerCase().includes(q)
        || (r.defect ?? '').toLowerCase().includes(q)
        || (r.service_description ?? '').toLowerCase().includes(q)
      );
    });
  }, [services, search, statusFilter]);

  const newDisabled = !selectedProject || pieces.length === 0;

  return (
    <Page fit>
      <Page.Body fit maxWidth="full" padding="comfortable">

        {



}
        <div className="enter-up shrink-0 pb-3.5 border-b border-line/60" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            {}
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="h-11 w-11 rounded-2xl bg-accent-muted flex items-center justify-center shrink-0">
                <Wrench className="h-5 w-5 text-accent" aria-hidden />
              </span>
              <div className="min-w-0">
                {/* Eyebrow removed — breadcrumb already conveys the workspace. */}
                <h1 className="text-pm-2xl font-semibold text-content-primary leading-tight truncate">Service &amp; Mentenanță</h1>
                <p className="text-pm-sm text-content-muted truncate">Istoric de servisări pe piese, costuri și status pe proiect</p>
              </div>
            </div>

            {}
            <div className="flex flex-wrap items-center gap-2.5 xl:ml-auto">
              <select
                value={selectedProject ?? ''}
                onChange={(e) => setSelectedProject(Number(e.target.value) || null)}
                className={`${filterSelectCls(!!selectedProject)} min-w-[240px]`}
              >
                <option value="">Selectează proiect...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.client_name}</option>
                ))}
              </select>

              {selectedProject && (
                <>
                  <div className="relative group">
                    <Search className={filterSearchIconCls} />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Caută titlu, piesă, tehnician..."
                      className={filterSearchInputCls}
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        aria-label="Golește căutarea"
                        className={filterClearInlineBtnCls}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setStatusFilter('')} className={filterToggleCls(statusFilter === '')}>
                      Toate
                    </button>
                    {STATUS_OPTIONS.map((o) => (
                      <button key={o.value} onClick={() => setStatusFilter(o.value)} className={filterToggleCls(statusFilter === o.value)}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <Button
                size="md"
                onClick={openCreate}
                disabled={newDisabled}
                title={
                  !selectedProject
                    ? 'Selectează întâi un proiect din lista de mai jos'
                    : pieces.length === 0
                      ? 'Proiectul selectat nu are piese — nu se poate înregistra o servisare'
                      : undefined
                }
              >
                <Plus className="h-4 w-4" /> Servisare nouă
              </Button>
            </div>
          </div>
        </div>

        {

}
        <div className="enter-up shrink-0" style={{ animationDelay: '70ms' }}>
          <Page.Kpis cols={4}>
            <KpiCard label="Servisări"  value={services.length}              icon={ListChecks}   iconColor="text-accent" />
            <KpiCard label="Piese"      value={pieces.length}                icon={Boxes}        iconColor="text-status-blue" />
            <KpiCard label="Cost total" value={money(Math.round(totalCost), 'RON')} icon={DollarSign}   iconColor="text-status-green" />
            <KpiCard label="Proiecte"   value={projects.length}              icon={FolderKanban} iconColor="text-status-amber" />
          </Page.Kpis>
        </div>

        {


}
        {!selectedProject ? (
          <GlassCard size="regular" className="enter-up flex-1 min-h-0 !p-0 overflow-hidden flex items-center justify-center" style={{ animationDelay: '140ms' }}>
            <EmptyState
              icon={Wrench}
              title="Selectează un proiect"
              description="Alege un proiect din selectorul de mai sus pentru a vedea servisările."
            />
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 min-h-0 enter-up" style={{ animationDelay: '140ms' }}>

            {
}
            <section className="xl:col-span-8 min-w-0 min-h-0 flex flex-col">
              <GlassCard size="regular" className="!p-0 overflow-hidden flex flex-col min-h-0 flex-1">
                <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line/50">
                  <h2 className="text-pm-md font-semibold text-content-primary">Istoric servisări</h2>
                  <p className="text-pm-xs text-content-muted shrink-0">
                    {visibleServices.length} {visibleServices.length === 1 ? 'servisare' : 'servisări'}
                    {(search || statusFilter) ? ` din ${services.length}` : ''} · {pieces.length} piese
                  </p>
                </div>

                {loading ? (
                  <div className="flex-1 min-h-0 flex items-center justify-center py-16 text-content-muted">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : services.length === 0 ? (
                  <EmptyState
                    icon={AlertCircle}
                    title="Nu există servisări"
                    description="Acest proiect nu are încă servisări înregistrate."
                    action={pieces.length > 0 ? (
                      <Button size="sm" onClick={openCreate}>
                        <Plus className="h-3.5 w-3.5" /> Adaugă prima servisare
                      </Button>
                    ) : undefined}
                  />
                ) : visibleServices.length === 0 ? (
                  <EmptyState
                    icon={Search}
                    title="Niciun rezultat"
                    description="Nicio servisare nu corespunde căutării sau filtrului curent."
                  />
                ) : (
                  <div key={`${statusFilter}|${search}`} className="stagger-in density-compact flex-1 min-h-0 overflow-y-auto">
                    {visibleServices.map((row) => {
                      const badge = STATUS_BADGE[row.status] || { label: row.status, tone: 'neutral' as const };
                      const isActive = showForm && editing?.id === row.id;
                      return (
                        <div
                          key={row.id}
                          style={{ viewTransitionName: isActive ? vtName('service', row.id) : undefined }}
                          className={`group border-b border-line/50 last:border-b-0 px-5 py-3 flex items-start gap-4 hover:bg-surface-tertiary/40 transition-colors ${isActive ? 'border-l-2 border-l-accent bg-accent/5 vt-morph' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-pm-sm font-semibold text-content-primary truncate" title={row.title}>{row.title}</span>
                              <StatusBadge tone={badge.tone} label={badge.label} size="xs" uppercase />
                            </div>
                            <div className="text-pm-xs text-content-muted flex flex-wrap gap-x-3 gap-y-0.5">
                              <span><b className="text-content-secondary">Piesa:</b> {row.piece_name ?? '—'}</span>
                              {row.piece_category && <span className="text-accent">{row.piece_category}</span>}
                              <span><b className="text-content-secondary">Data:</b> {row.service_date}</span>
                              {row.technician_name && <span><b className="text-content-secondary">Tehnician:</b> {row.technician_name}</span>}
                            </div>
                            {row.defect && (
                              <p className="text-pm-xs text-content-secondary mt-1 line-clamp-2">
                                <b className="text-content-muted uppercase tracking-wider text-pm-2xs mr-1">Defect:</b>
                                {row.defect}
                              </p>
                            )}
                            {row.service_description && (
                              <p className="text-pm-xs text-content-secondary mt-0.5 line-clamp-2">
                                <b className="text-content-muted uppercase tracking-wider text-pm-2xs mr-1">Lucrare:</b>
                                {row.service_description}
                              </p>
                            )}
                            {(row.before_photo || row.after_photo) && (
                              <div className="flex items-start gap-2 mt-2">
                                {row.before_photo && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage(row.before_photo)}
                                    title="Vezi foto BEFORE"
                                    className="group relative h-16 w-20 overflow-hidden border border-line/60 hover:border-accent transition-colors"
                                  >
                                    <img src={row.before_photo} alt="before" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none" />
                                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-pm-2xs font-bold uppercase text-center py-0.5">Before</span>
                                  </button>
                                )}
                                {row.after_photo && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage(row.after_photo)}
                                    title="Vezi foto AFTER"
                                    className="group relative h-16 w-20 overflow-hidden border border-line/60 hover:border-accent transition-colors"
                                  >
                                    <img src={row.after_photo} alt="after" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none" />
                                    <span className="absolute bottom-0 left-0 right-0 bg-status-green/80 text-white text-pm-2xs font-bold uppercase text-center py-0.5">After</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-pm-2xs text-content-muted uppercase tracking-wider">Total</div>
                            <div className="text-pm-sm font-semibold text-content-primary tabular-nums">{money(row.total_cost, 'RON')}</div>
                            <div className="text-pm-2xs text-content-muted tabular-nums mt-0.5">
                              {money(row.labor_cost, 'RON')} mano · {money(row.parts_cost, 'RON')} piese
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                            <IconButton
                              intent="primary"
                              size="sm"
                              onClick={() => openEdit(row)}
                              aria-label="Editează servisarea"
                              title="Editează"
                            >
                              <Pencil />
                            </IconButton>
                            <IconButton
                              intent="danger"
                              size="sm"
                              onClick={() => void handleDelete(row)}
                              aria-label="Șterge servisarea"
                              title="Șterge"
                            >
                              <Trash2 />
                            </IconButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            </section>

            {
}
            <aside className="xl:col-span-4 space-y-5 min-h-0 overflow-y-auto">
              {}
              <GlassCard size="regular">
                <p className="text-pm-eyebrow text-accent mb-3 flex items-center gap-2">
                  <span className="inline-block h-px w-3.5 bg-accent/50" aria-hidden />
                  Cost total
                </p>
                <MetricValue value={Math.round(totalCost)} size="display-lg" format={(n) => money(n, 'RON')} className="block" />
                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center justify-between text-pm-sm">
                    <span className="text-content-muted">Manoperă</span>
                    <span className="font-medium text-content-primary tabular-nums">{money(laborTotal, 'RON')}</span>
                  </div>
                  <div className="flex items-center justify-between text-pm-sm">
                    <span className="text-content-muted">Piese</span>
                    <span className="font-medium text-content-primary tabular-nums">{money(partsTotal, 'RON')}</span>
                  </div>
                  {totalCost > 0 && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary flex">
                      <span className="anim-bar-grow h-full bg-accent" style={{ width: `${(laborTotal / totalCost) * 100}%` }} aria-hidden />
                      <span className="anim-bar-grow h-full bg-status-green" style={{ width: `${(partsTotal / totalCost) * 100}%`, animationDelay: '120ms' }} aria-hidden />
                    </div>
                  )}
                </div>
              </GlassCard>

              {}
              <GlassCard size="regular">
                <p className="text-pm-eyebrow text-accent mb-3 flex items-center gap-2">
                  <span className="inline-block h-px w-3.5 bg-accent/50" aria-hidden />
                  Distribuție status
                </p>
                {services.length === 0 ? (
                  <p className="text-pm-xs text-content-muted">Nicio servisare înregistrată.</p>
                ) : (
                  <div className="stagger-in space-y-2.5">
                    {STATUS_OPTIONS.map((o) => {
                      const count = statusCounts[o.value] || 0;
                      const badge = STATUS_BADGE[o.value];
                      return (
                        <button
                          key={o.value}
                          onClick={() => setStatusFilter(statusFilter === o.value ? '' : o.value)}
                          className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                            statusFilter === o.value ? 'bg-accent/5 ring-1 ring-accent/20' : 'hover:bg-surface-tertiary/30'
                          }`}
                        >
                          <StatusBadge tone={badge.tone} label={badge.label} size="xs" uppercase />
                          <span className="text-pm-sm font-semibold text-content-primary tabular-nums">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            </aside>
          </div>
        )}

      </Page.Body>

      {showForm && selectedProject && (
        <ServiceForm
          projectId={selectedProject}
          pieces={pieces}
          editing={editing}
          onClose={closeForm}
          onSaved={() => { closeForm(); reload(); }}
          onPreview={(src) => setPreviewImage(src)}
        />
      )}

      {}
      {previewImage && (
        <div
          className="enter-fade fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="enter-scale max-w-[90vw] max-h-[90vh] object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-surface-primary/20 text-white hover:bg-surface-primary/30 flex items-center justify-center"
            aria-label="Închide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </Page>
  );
}





function ServiceForm({
  projectId, pieces, editing, onClose, onSaved, onPreview,
}: {
  projectId: number;
  pieces: ProjectPiece[];
  editing: PieceServiceRow | null;
  onClose: () => void;
  onSaved: () => void;
  onPreview: (src: string) => void;
}) {
  const money = useMoney();
  const [pieceId, setPieceId] = useState<number | null>(editing?.project_piece_id ?? null);
  const [pieceSearch, setPieceSearch] = useState(editing?.piece_name ?? '');
  const [pieceDropdownOpen, setPieceDropdownOpen] = useState(false);
  const [title, setTitle] = useState(editing?.title ?? '');
  const [defect, setDefect] = useState(editing?.defect ?? '');
  const [serviceDescription, setServiceDescription] = useState(editing?.service_description ?? '');
  const [serviceDate, setServiceDate] = useState(editing?.service_date ?? new Date().toISOString().slice(0, 10));
  const [laborCost, setLaborCost] = useState(String(editing?.labor_cost ?? 0));
  const [partsCost, setPartsCost] = useState(String(editing?.parts_cost ?? 0));
  const [status, setStatus] = useState(editing?.status ?? 'in_lucru');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [technicianId, setTechnicianId] = useState<number | null>(editing?.technician_id ?? null);
  
  
  
  const [beforePhoto, setBeforePhoto] = useState<string | null>(editing?.before_photo ?? null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(editing?.after_photo ?? null);
  const [photoUploading, setPhotoUploading] = useState<'before' | 'after' | null>(null);
  const [users, setUsers] = useState<{ id: number; full_name: string; role_name?: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  
  const handlePhotoChange = async (which: 'before' | 'after', file: File | null) => {
    if (!file) return;
    setPhotoUploading(which);
    try {
      const dataUrl = await compressImage(file);
      if (which === 'before') setBeforePhoto(dataUrl);
      else                    setAfterPhoto(dataUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Imaginea nu a putut fi procesată');
    } finally {
      setPhotoUploading(null);
    }
  };

  
  
  
  useEffect(() => {
    apiCommand<{ id: number; full_name: string; role_name?: string }[]>('get_users')
      .then(u => setUsers(Array.isArray(u) ? u : []))
      .catch(() => setUsers([]));
  }, []);

  
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) setPieceDropdownOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filteredPieces = useMemo(() => {
    const q = pieceSearch.trim().toLowerCase();
    if (!q) return pieces.slice(0, 50);
    return pieces.filter((p) =>
      p.name.toLowerCase().includes(q)
      || (p.original_name ?? '').toLowerCase().includes(q)
      || (p.category ?? '').toLowerCase().includes(q),
    ).slice(0, 50);
  }, [pieces, pieceSearch]);

  const selectedPiece = pieces.find((p) => p.id === pieceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pieceId) { toast.error('Alege o piesa'); return; }
    if (!title.trim()) { toast.error('Titlu obligatoriu'); return; }
    setSaving(true);
    try {
      
      
      
      
      
      const photoFor = (current: string | null, original: string | null | undefined) => {
        if (current === original) return undefined; 
        if (current == null) return '';             
        return current;                             
      };
      const payload: Record<string, unknown> = {
        project_id: projectId,
        project_piece_id: pieceId,
        title: title.trim(),
        defect: defect.trim() || null,
        service_description: serviceDescription.trim() || null,
        service_date: serviceDate,
        technician_id: technicianId,
        labor_cost: Number(laborCost) || 0,
        parts_cost: Number(partsCost) || 0,
        status,
        notes: notes.trim() || null,
      };
      if (editing) {
        const beforeDelta = photoFor(beforePhoto, editing.before_photo);
        const afterDelta  = photoFor(afterPhoto,  editing.after_photo);
        if (beforeDelta !== undefined) payload.before_photo = beforeDelta;
        if (afterDelta  !== undefined) payload.after_photo  = afterDelta;
        await apiCommand('update_piece_service', { id: editing.id, ...payload });
        toast.success('Servisare actualizata');
      } else {
        if (beforePhoto) payload.before_photo = beforePhoto;
        if (afterPhoto)  payload.after_photo  = afterPhoto;
        await apiCommand('create_piece_service', payload);
        toast.success('Servisare creata');
      }
      
      
      await usePieceStore.getState().fetchPieces(projectId, true);
      await useProjectStore.getState().refreshAll();
      void useDashboardStore.getState().invalidate();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la salvare');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ viewTransitionName: editing ? vtName('service', editing.id) : undefined }}
      className="fixed right-0 top-0 bottom-0 z-30 w-full sm:w-[560px] bg-surface-secondary border-l border-line shadow-xl flex flex-col animate-slide-in-right vt-morph"
    >
        <div className="shrink-0 flex items-center justify-between border-b border-line px-5 h-14">
          <h2 className="text-pm-sm font-semibold text-content-primary">
            {editing ? 'Editează servisare' : 'Servisare noua'}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 text-content-muted hover:bg-surface-tertiary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {}
          <div ref={dropdownRef} className="border-b border-line px-5 py-4">
            <label className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-accent/70 mb-1.5">
              Piesa *
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
              <input
                type="text"
                value={pieceSearch}
                onChange={(e) => { setPieceSearch(e.target.value); setPieceDropdownOpen(true); setPieceId(null); }}
                onFocus={() => setPieceDropdownOpen(true)}
                placeholder={selectedPiece ? selectedPiece.name : 'Caută piesa după nume sau categorie...'}
                className="w-full h-9 border border-line bg-surface-secondary pl-8 pr-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {pieceId && selectedPiece && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 bg-accent/10 text-accent px-1.5 py-0.5 text-pm-2xs font-semibold">
                  <Check className="h-3 w-3" /> selectat
                </span>
              )}
              {pieceDropdownOpen && filteredPieces.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-0 z-10 max-h-72 overflow-y-auto border border-line bg-surface-secondary shadow-lg">
                  {filteredPieces.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setPieceId(p.id); setPieceSearch(p.name); setPieceDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs border-b border-line/40 hover:bg-surface-tertiary ${
                        pieceId === p.id ? 'bg-accent/10 text-accent' : 'text-content-primary'
                      }`}
                    >
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-pm-2xs text-content-muted truncate">
                        {p.category} · {p.stage_name ?? ''} {p.original_name && p.original_name !== p.name ? `· ${p.original_name}` : ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {}
          <div className="border-b border-line px-5 py-4">
            <label className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-accent/70 mb-1.5">Titlu *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Inlocuire rulment malaxor"
              className="w-full h-9 border border-line bg-surface-secondary px-3 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {}
          <div className="grid grid-cols-1 md:grid-cols-2 border-b border-line">
            <div className="border-r border-line px-5 py-4">
              <label className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-accent/70 mb-1.5">Defect</label>
              <textarea
                value={defect}
                onChange={(e) => setDefect(e.target.value)}
                rows={4}
                placeholder="Descrie problema..."
                className="w-full border border-line bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
            <div className="px-5 py-4">
              <label className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-accent/70 mb-1.5">Lucrare efectuata</label>
              <textarea
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                rows={4}
                placeholder="Ce s-a facut..."
                className="w-full border border-line bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
          </div>

          {
}
          <div className="grid grid-cols-2 border-b border-line">
            <PhotoSlot
              kind="before"
              src={beforePhoto}
              uploading={photoUploading === 'before'}
              inputRef={beforeInputRef}
              onPick={(f) => void handlePhotoChange('before', f)}
              onRemove={() => setBeforePhoto(null)}
              onPreview={onPreview}
            />
            <PhotoSlot
              kind="after"
              src={afterPhoto}
              uploading={photoUploading === 'after'}
              inputRef={afterInputRef}
              onPick={(f) => void handlePhotoChange('after', f)}
              onRemove={() => setAfterPhoto(null)}
              onPreview={onPreview}
            />
          </div>

          {}
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-line">
            <div className="border-r border-line px-4 py-4">
              <label className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-accent/70 mb-1.5">Data</label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full h-9 border border-line bg-surface-secondary px-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="border-r border-line px-4 py-4">
              <label className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-accent/70 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 border border-line bg-surface-secondary px-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="border-r border-line px-4 py-4">
              <label className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-accent/70 mb-1.5">Manopera (RON)</label>
              <input
                type="number" min={0} step="0.01"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
                className="w-full h-9 border border-line bg-surface-secondary px-2 text-sm text-content-primary tabular-nums focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="px-4 py-4">
              <label className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-accent/70 mb-1.5">Piese (RON)</label>
              <input
                type="number" min={0} step="0.01"
                value={partsCost}
                onChange={(e) => setPartsCost(e.target.value)}
                className="w-full h-9 border border-line bg-surface-secondary px-2 text-sm text-content-primary tabular-nums focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {}
          <div className="grid grid-cols-2 border-b border-line">
            <div className="border-r border-line px-5 py-4">
              <label className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-accent/70 mb-1.5">Tehnician</label>
              <select
                value={technicianId ?? ''}
                onChange={(e) => setTechnicianId(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-9 border border-line bg-surface-secondary px-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">— Neasignat —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}{u.role_name ? ` (${u.role_name})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end px-5 py-4">
              <div className="w-full border border-accent/20 bg-accent/5 px-3 py-2">
                <div className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-accent/70 mb-0.5">Total</div>
                <div className="text-sm font-semibold text-content-primary tabular-nums">
                  {money((Number(laborCost) || 0) + (Number(partsCost) || 0), 'RON', 2)}
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="px-5 py-4">
            <label className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-accent/70 mb-1.5">Note</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observatii suplimentare..."
              className="w-full border border-line bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-2 border-t border-line px-5 h-14 bg-surface-secondary">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Anulează
          </Button>
          <Button type="submit" size="sm" disabled={saving || !pieceId || !title.trim()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {editing ? 'Salvează' : 'Creeaza'}
          </Button>
        </div>
      </form>
  );
}
















function PhotoSlot({
  kind, src, uploading, inputRef, onPick, onRemove, onPreview,
}: {
  kind: 'before' | 'after';
  src: string | null;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onPick: (file: File) => void;
  onRemove: () => void;
  onPreview: (src: string) => void;
}) {
  const label = kind === 'before' ? 'Foto BEFORE' : 'Foto AFTER';
  const accent = kind === 'before' ? 'text-accent/70' : 'text-status-green';
  const borderClass = kind === 'before' ? '' : 'border-l border-line';
  return (
    <div className={`px-5 py-4 ${borderClass}`}>
      <label className={`block text-pm-2xs font-bold uppercase tracking-[0.14em] mb-1.5 ${accent}`}>{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          
          e.target.value = '';
        }}
      />
      {src ? (
        <div className="relative group">
          <button
            type="button"
            onClick={() => onPreview(src)}
            title="Click pentru a vedea poza la dimensiune mare"
            className="block w-full h-32 overflow-hidden border border-line/60 hover:border-accent transition-colors bg-black/5"
          >
            <img src={src} alt={kind} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none" />
          </button>
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              title="Înlocuiește poza"
              className="h-7 w-7 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              title="Șterge poza"
              className="h-7 w-7 rounded-full bg-status-red/80 text-white hover:bg-status-red flex items-center justify-center"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 flex flex-col items-center justify-center gap-1.5 border border-dashed border-line/80 bg-surface-primary/40 text-content-muted hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-pm-xs">Se procesează...</span>
            </>
          ) : (
            <>
              <ImageOff className="h-5 w-5" />
              <span className="text-pm-xs">Adaugă foto</span>
              <span className="text-pm-2xs">JPG/PNG · max 1024px</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
