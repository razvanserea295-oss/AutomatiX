import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Wrench, Plus, Search, Trash2, Pencil, Loader2, X, Check, AlertCircle, Camera, ImageOff, ListChecks, Boxes, DollarSign, FolderKanban } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import type { User } from '@/core/types';
import type { ProjectPiece } from '@/types/piece';
import { useProjectStore } from '@/store/projectStore';
import { usePieceStore, usePiecesForProject } from '@/store/pieceStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { HeroHeader, GlassCard, MetricValue } from '@/components/ui';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';
import { confirmDialog } from '@/components/ConfirmDialog';
import { useMoney } from '@/store/settingsStore';
import { filterSelectCls } from '@/components/ui/filterControls';

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
  const openEdit = (row: PieceServiceRow) => { setEditing(row); setShowForm(true); };
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

  return (
    <Page className="mod-shell">
      {}
      <div className="px-5 pt-4 pb-8 space-y-4 shrink-0">
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Producție"
          icon={Wrench}
          title="Service & Mentenanță"
          subtitle="Istoric de servisări pe piese, costuri și status pe proiect"
          actions={
            <Button
              size="sm"
              onClick={openCreate}
              disabled={!selectedProject || pieces.length === 0}
              title={
                !selectedProject
                  ? 'Selectează întâi un proiect din lista de mai jos'
                  : pieces.length === 0
                    ? 'Proiectul selectat nu are piese — nu se poate înregistra o servisare'
                    : undefined
              }
            >
              <Plus className="h-3.5 w-3.5" /> Servisare nouă
            </Button>
          }
        />
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={ListChecks}  label="Servisări"   value={services.length} />
          <KpiMini icon={Boxes}       label="Piese"       value={pieces.length} />
          <KpiMini icon={DollarSign}  label="Cost total"  value={Math.round(totalCost)} format={(n) => money(n, 'RON')} />
          <KpiMini icon={FolderKanban} label="Proiecte"   value={projects.length} />
        </div>
      </div>

      {}
      <div className="shrink-0 flex items-center gap-3 px-6 h-14 border-b border-line bg-surface-secondary">
        <select
          value={selectedProject ?? ''}
          onChange={(e) => setSelectedProject(Number(e.target.value) || null)}
          className={`${filterSelectCls(!!selectedProject)} min-w-[280px]`}
        >
          <option value="">Selectează proiect...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {p.client_name}</option>
          ))}
        </select>
        {selectedProject && (
          <span className="text-pm-2xs text-content-muted uppercase tracking-wider">
            {services.length} servisari · {pieces.length} piese
          </span>
        )}
      </div>

      {

}
      <Page.Body maxWidth="full" padding="flush">
        {!selectedProject ? (
          <div className="flex items-center justify-center h-full text-content-muted text-sm bg-surface-primary">
            <div className="text-center">
              <Wrench className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>Selectează un proiect pentru a vedea servisările</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full text-content-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-content-muted">
            <AlertCircle className="h-8 w-8 opacity-40" />
            <p className="text-xs">Nu există servisari pentru acest proiect</p>
            {pieces.length > 0 && (
              <button onClick={openCreate} className="mt-2 h-8 bg-accent px-3.5 text-xs font-semibold text-surface-primary flex items-center gap-1.5 hover:opacity-90">
                <Plus className="h-3.5 w-3.5" /> Adaugă prima servisare
              </button>
            )}
          </div>
        ) : (
          <div className="px-5 py-4">
            <GlassCard size="regular" className="!p-0 overflow-hidden density-compact">
            {services.map((row) => {
              const badge = STATUS_BADGE[row.status] || { label: row.status, tone: 'neutral' as const };
              return (
                <div key={row.id} className="border-b border-line/50 last:border-b-0 px-5 py-3 flex items-start gap-4 hover:bg-surface-tertiary/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-content-primary truncate">{row.title}</span>
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
                            <img src={row.before_photo} alt="before" loading="lazy" decoding="async" className="h-full w-full object-cover" />
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
                            <img src={row.after_photo} alt="after" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                            <span className="absolute bottom-0 left-0 right-0 bg-status-green/80 text-white text-pm-2xs font-bold uppercase text-center py-0.5">After</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-pm-2xs text-content-muted uppercase tracking-wider">Total</div>
                    <div className="text-sm font-semibold text-content-primary tabular-nums">{money(row.total_cost, 'RON')}</div>
                    <div className="text-pm-2xs text-content-muted tabular-nums mt-0.5">
                      {money(row.labor_cost, 'RON')} mano · {money(row.parts_cost, 'RON')} piese
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => openEdit(row)} title="Editează"
                      className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => void handleDelete(row)} title="Șterge"
                      className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-status-red">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            </GlassCard>
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
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain shadow-2xl"
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
      className="absolute right-0 top-0 bottom-0 z-30 w-full sm:w-[560px] bg-surface-secondary border-l border-line shadow-xl flex flex-col animate-slide-in-right"
    >
        <div className="shrink-0 flex items-center justify-between border-b border-line px-5 h-14">
          <h2 className="text-sm font-semibold text-content-primary">
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
          <button type="button" onClick={onClose} className="h-8 border border-line px-3 text-xs font-semibold text-content-secondary hover:bg-surface-tertiary">
            Anulează
          </button>
          <button type="submit" disabled={saving || !pieceId || !title.trim()}
            className="h-8 bg-accent px-4 text-xs font-semibold text-surface-primary hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {editing ? 'Salvează' : 'Creeaza'}
          </button>
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
            <img src={src} alt={kind} loading="lazy" decoding="async" className="h-full w-full object-cover" />
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
