import React, { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Edit2, Trash2, FolderKanban, MessageSquare, Plus, CheckCircle2, Clock, Circle, Network, ChevronDown, History, Loader2, FileText, X as XIcon, Download as DownloadIcon, Eye, Link2, Copy, Trash, DollarSign } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { ViewerBanner } from '@/components/ViewerBanner';
import { useViewerMode } from '@/hooks/useViewerMode';
import { cn } from '@/lib/cn';
import { formatDateRo } from '@/lib/format';
import { getErrorMessage } from '@/utils/errors';
import { downloadOneContractAttachment } from '@/lib/downloadPdf';
import { toast } from '@/store/toastStore';
import { useMoney } from '@/store/settingsStore';
import type { User, Project } from '@/core/types';
import { useProjectStore } from '@/store/projectStore';
import { useClientStore } from '@/store/clientStore';
import type { ProjectPiece, TrackingPhase, ProductionTracking } from '@/types/piece';
import { parseProductionTracking } from '@/types/piece';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
import SplitViewToggle, { useSplitView } from '@/components/ui/SplitViewToggle';
import Page from '@/components/ui/Page';
import StatusBadge from '@/components/ui/StatusBadge';
import { filterSearchInputCls, filterSearchIconCls } from '@/components/ui/filterControls';
import { projectStatus } from '@/lib/statusTokens';
import { PanelLeft } from 'lucide-react';
import { confirmDialog } from '@/components/ConfirmDialog';
import Button from '@/components/ui/Button';
import { HeroHeader, GlassCard, MetricValue } from '@/components/ui';
import ProjectsEnhancements from '@/pages/projects/ProjectsEnhancements';



const DxfViewer = lazy(() => import('@/components/DxfViewer'));





interface StageRevision {
  stage: string;
  status: string;
  timestamp: string;
  note: string;
}





interface Comment {
  id: number;
  
  
  user_name: string;
  content: string;
  created_at: string;
}





interface ProjectsPageProps {
  user: User | null;
  onNavigate: (page: string, opts?: { projectId?: number }) => void;
}

export default function ProjectsPage({ user: _user, onNavigate }: ProjectsPageProps) {
  const money = useMoney();
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const productionBoard = useProjectStore(s => s.productionBoard);
  const fetchProductionBoard = useProjectStore(s => s.fetchProductionBoard);
  const createProjectStore = useProjectStore(s => s.createProject);
  const updateProjectStore = useProjectStore(s => s.updateProject);
  const deleteProjectStore = useProjectStore(s => s.deleteProject);
  const projectsLoading = useProjectStore(s => s.loadingProjects);

  const clients = useClientStore(s => s.clients);
  const fetchClients = useClientStore(s => s.fetchClients);
  const clientsLoading = useClientStore(s => s.loading);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [splitView, setSplitView] = useSplitView('split:projects', true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [search, setSearch] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  
  interface ProjectDoc {
    id: number;
    name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    category_name: string;
    uploaded_by_name: string;
    uploaded_at: string;
    
    
    source?: 'document' | 'contract';
  }
  const [projectDocs, setProjectDocs] = useState<ProjectDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ProjectDoc | null>(null);
  const { isOpen, editingItem, openModal, closeModal, isEditing } = useFormModal();
  
  
  
  const isViewer = useViewerMode('projects');

  const loading = projectsLoading || clientsLoading;

  
  const projStats = useMemo(() => {
    const active = projects.filter(p => p.status !== 'finalizat' && p.status !== 'anulat');
    const value = active.reduce((s, p) => s + ((p as { estimated_value?: number }).estimated_value ?? p.budget ?? 0), 0);
    return {
      total: projects.length,
      active: active.length,
      done: projects.filter(p => p.status === 'finalizat').length,
      value,
    };
  }, [projects]);

  
  
  useEffect(() => {
    void fetchProjects();
    void fetchClients();
    void fetchProductionBoard();
  }, [fetchProjects, fetchClients, fetchProductionBoard]);

  
  
  useEffect(() => {
    const focusId = sessionStorage.getItem('promix_focus_project');
    const action = sessionStorage.getItem('promix_focus_project_action');
    if (!focusId || projects.length === 0) return;
    const target = projects.find(p => p.id === Number(focusId));
    if (!target) return;
    sessionStorage.removeItem('promix_focus_project');
    sessionStorage.removeItem('promix_focus_project_action');
    setSelectedId(target.id);
    if (action === 'edit') openModal(target);
  }, [projects, openModal]);

  
  useEffect(() => {
    if (selectedId == null) {
      setComments([]);
      return;
    }
    let cancelled = false;

    async function loadComments() {
      setCommentsLoading(true);
      try {
        const result = await apiCommand<Comment[]>('get_project_comments', { project_id: selectedId });
        if (!cancelled) setComments(result);
      } catch {
        if (!cancelled) setComments([]);
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    }

    void loadComments();
    return () => { cancelled = true; };
  }, [selectedId]);

  
  
  const postComment = useCallback(async () => {
    const text = newComment.trim();
    if (!text || selectedId == null) return;
    setPostingComment(true);
    try {
      await apiCommand('add_project_comment', { request: { project_id: selectedId, content: text } });
      setNewComment('');
      const result = await apiCommand<Comment[]>('get_project_comments', { project_id: selectedId });
      setComments(result || []);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Nu am putut adăuga comentariul'));
    } finally {
      setPostingComment(false);
    }
  }, [newComment, selectedId]);

  
  useEffect(() => {
    if (selectedId == null) { setProjectDocs([]); return; }
    let cancelled = false;
    setDocsLoading(true);
    apiCommand<ProjectDoc[]>('get_project_documents', { project_id: selectedId })
      .then(r => { if (!cancelled) setProjectDocs(r || []); })
      .catch(() => { if (!cancelled) setProjectDocs([]); })
      .finally(() => { if (!cancelled) setDocsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  
  
  
  

  
  const [stageRevisions, setStageRevisions] = useState<StageRevision[]>([]);
  const [revisionNote, setRevisionNote] = useState('');

  useEffect(() => {
    if (selectedId == null) { setStageRevisions([]); return; }
    const sel = projects.find(p => p.id === selectedId);
    if (!sel) return;
    
    try {
      const stored = localStorage.getItem(`promix_stage_revisions_${selectedId}`);
      if (stored) {
        setStageRevisions(JSON.parse(stored));
      } else {
        
        const initial: StageRevision[] = [{
          stage: sel.stage || sel.status || '—',
          status: sel.status,
          timestamp: sel.created_at || new Date().toISOString(),
          note: 'Stadiu initial',
        }];
        setStageRevisions(initial);
        localStorage.setItem(`promix_stage_revisions_${selectedId}`, JSON.stringify(initial));
      }
    } catch { setStageRevisions([]); }
  }, [selectedId, projects]);

  const addStageRevision = () => {
    if (!selectedId) return;
    const sel = projects.find(p => p.id === selectedId);
    if (!sel) return;
    const rev: StageRevision = {
      stage: sel.stage || sel.status,
      status: sel.status,
      timestamp: new Date().toISOString(),
      note: revisionNote || 'Actualizare stadiu',
    };
    const updated = [...stageRevisions, rev];
    setStageRevisions(updated);
    setRevisionNote('');
    localStorage.setItem(`promix_stage_revisions_${selectedId}`, JSON.stringify(updated));
  };

  
  const [treeCount, setTreeCount] = useState(0);
  useEffect(() => {
    if (selectedId == null) { setTreeCount(0); return; }
    apiCommand<{ name: string; children: unknown[] }[]>('get_project_parts_tree', { project_id: selectedId })
      .then((t: { name: string; children: unknown[] }[]) => {
        let count = 0;
        function walk(nodes: { children?: unknown[] }[]) {
          for (const n of nodes) { count++; if (Array.isArray((n as any).children)) walk((n as any).children); }
        }
        walk(t || []);
        setTreeCount(count);
      })
      .catch(() => setTreeCount(0));
  }, [selectedId]);

  
  const clientMap = useMemo(() => {
    const map = new Map<number, string>();
    clients.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  const getClientName = useCallback(
    (project: Project) => project.client_name ?? clientMap.get(project.client_id) ?? '—',
    [clientMap],
  );

  
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((p) =>
      (p.name || '').toLowerCase().includes(term) ||
      getClientName(p).toLowerCase().includes(term)
    );
  }, [projects, search, getClientName]);

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? null,
    [projects, selectedId],
  );

  
  const formFields: FormField[] = [
    { name: 'name', label: 'Nume proiect', type: 'text', required: true, placeholder: 'Nume proiect' },
    { name: 'description', label: 'Descriere', type: 'textarea', required: false, placeholder: 'Descriere proiect' },
    {
      name: 'client_id',
      label: 'Client',
      type: 'select',
      required: true,
      options: clients.map(c => ({ value: c.id, label: c.name }))
    },
    { name: 'estimated_value', label: 'Buget (EUR)', type: 'number', required: true, placeholder: '0.00' },
    { name: 'deadline', label: 'Deadline', type: 'date', required: true },
    {
      
      
      
      name: 'stage_id',
      label: 'Etapa productie',
      type: 'select',
      required: false,
      options: productionBoard.map(c => ({ value: c.stage.id, label: c.stage.name })),
    },
    
    
    
    
    {
      name: 'priority',
      label: 'Prioritate',
      type: 'select',
      required: false,
      options: [
        { value: 'low', label: 'Scazuta' },
        { value: 'medium', label: 'Medie' },
        { value: 'high', label: 'Ridicata' },
      ]
    },
  ];

  const handleSubmit = async (data: Record<string, any>) => {
    
    
    const name = String(data.name ?? '').trim();
    if (!name) throw new Error('Numele proiectului este obligatoriu');
    const clientId = Number(data.client_id);
    if (!clientId || !clients.find(c => c.id === clientId)) {
      throw new Error('Selectează un client valid');
    }
    const ev = data.estimated_value ? Number(data.estimated_value) : 0;
    if (ev < 0) throw new Error('Bugetul nu poate fi negativ');
    if (data.deadline && Number.isNaN(new Date(String(data.deadline)).getTime())) {
      throw new Error('Format data invalid');
    }

    const payload = {
      ...data,
      name,
      client_id: clientId,
      estimated_value: ev,
      stage_id: data.stage_id ? Number(data.stage_id) : undefined,
    };
    if (isEditing) {
      await updateProjectStore(editingItem.id, payload);
    } else {
      await createProjectStore(payload);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ title: 'Șterge proiectul?', body: 'Toate datele asociate (piese, comentarii, predări) vor fi șterse.', danger: true }))) return;
    try {
      await deleteProjectStore(id);
      if (selectedId === id) setSelectedId(null);
      toast.success('Proiect sters cu succes');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la ștergere');
    }
  };

  
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-page">
        <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
      </div>
    );
  }

  return (
    <Page className="mod-shell">
      <Page.Body maxWidth="full" padding="flush" className="flex min-h-0 flex-1 flex-col space-y-0">
        <ViewerBanner page="projects" />

        {}
        <div className="px-5 pt-4 pb-8 space-y-4 shrink-0">
          <HeroHeader
            className="enter-up" style={{ animationDelay: '0ms' }}
            eyebrow="Proiecte & Contracte"
            icon={FolderKanban}
            title="Proiecte"
            subtitle="Portofoliul de proiecte, etapele de producție și documentele asociate"
            actions={<>
              <SplitViewToggle enabled={splitView} onToggle={setSplitView} />
              {!isViewer && (
                <Button size="sm" onClick={() => openModal()}>
                  <Plus className="h-3.5 w-3.5" /> Proiect nou
                </Button>
              )}
            </>}
          />
          <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
            <KpiMini icon={FolderKanban} label="Total proiecte" value={projStats.total} />
            <KpiMini icon={Clock}        label="În execuție"   value={projStats.active} />
            <KpiMini icon={CheckCircle2} label="Finalizate"    value={projStats.done} />
            <KpiMini icon={DollarSign}   label="Valoare activă" value={projStats.value} format={(n) => money(n, 'RON')} />
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-row enter-up" style={{ animationDelay: '160ms' }}>
        {}
        {splitView && (
          <aside className="relative flex w-[clamp(320px,25vw,460px)] shrink-0 flex-col overflow-hidden border-r border-line bg-surface-secondary">
            {}
            <div className="shrink-0 px-3.5 pt-3 pb-2 border-b border-line bg-surface-secondary">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-pm-eyebrow font-semibold uppercase tracking-wide text-content-muted flex-1">Proiecte</h2>
                <span className="text-pm-2xs text-content-muted tabular-nums px-1.5 py-px bg-surface-tertiary">
                  {filtered.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 group">
                  <Search className={filterSearchIconCls} aria-hidden />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Caută proiect..."
                    aria-label="Caută proiect"
                    className={`${filterSearchInputCls} !w-full`}
                  />
                </div>
              </div>
            </div>

            {}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-pm-sm text-content-muted">Niciun proiect găsit</p>
                  <p className="mt-1 text-pm-2xs text-content-muted/70">Încearcă alți termeni sau adaugă unul nou.</p>
                </div>
              ) : (
                filtered.map((project) => {
                  const isSelected = project.id === selectedId;
                  return (
                    <div
                      key={project.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(project.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedId(project.id); }}
                      aria-label={`Selectează proiectul ${project.name}`}
                      className={cn(
                        'group relative w-full cursor-pointer border-b border-line px-3.5 py-3 text-left transition-all duration-150',
                        isSelected
                          ? 'bg-accent/8'
                          : 'hover:bg-surface-tertiary/40',
                      )}
                    >
                      {}
                      <span
                        aria-hidden
                        className={cn(
                          'absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-200',
                          isSelected
                            ? 'bg-accent'
                            : 'bg-transparent group-hover:bg-content-muted/30',
                        )}
                      />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            'truncate text-pm-base leading-tight',
                            isSelected ? 'font-semibold text-content-primary' : 'font-medium text-content-primary',
                          )}>
                            {project.name}
                          </p>
                          <p className="mt-0.5 truncate text-pm-xs text-content-muted">
                            {getClientName(project)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusBadge {...projectStatus(project.status)} size="xs" />
                          {!isViewer && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openModal(project); }}
                              title="Editează proiectul"
                              aria-label={`Editează proiectul ${project.name}`}
                              className="opacity-70 group-hover:opacity-100 focus:opacity-100 inline-flex items-center justify-center h-6 w-6 text-content-muted hover:bg-accent/12 hover:text-accent transition-all duration-150"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {}
        {!splitView && (
          <button
            type="button"
            onClick={() => setSplitView(true)}
            aria-label="Arata lista proiecte"
            title="Arata lista proiecte"
            className="absolute left-2 top-3 z-10 flex h-7 w-7 items-center justify-center border border-line bg-surface-secondary text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-colors"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
        )}

        {}
        <main className="flex-1 min-h-0 overflow-y-auto bg-surface-page">
          {!selected ? (
            <div className="flex h-full items-center justify-center p-8">
              <GlassCard size="regular" className="enter-up w-full max-w-md flex flex-col items-center gap-3 px-8 py-12 text-center">
                <span className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <FolderKanban className="h-8 w-8 text-accent/70" aria-hidden />
                </span>
                <div>
                  <p className="text-pm-md font-semibold text-content-primary">Niciun proiect selectat</p>
                  <p className="mt-1 text-pm-sm text-content-muted">
                    Alege un proiect din listă pentru a-i vedea etapele de producție, piesele și documentele asociate.
                  </p>
                </div>
              </GlassCard>
            </div>
          ) : (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {}
              <section className="bg-surface-secondary border-b border-line">
                <div className="flex items-center justify-between px-4 py-3">
                  <h1 className="text-pm-md font-semibold text-content-primary">{selected.name}</h1>
                  <div className="flex items-center gap-1">
                    {}
                    {selected.status !== 'blocat' && selected.status !== 'anulat' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await updateProjectStore(selected.id, { status: 'blocat' });
                          toast.success('Proiect marcat blocat');
                        }}
                        title="Marchează proiect blocat"
                        className="h-7 px-2 text-pm-xs font-semibold border border-line text-content-secondary hover:bg-status-red/10 hover:text-status-red hover:border-status-red/40 transition-colors"
                      >
                        Blocheaza
                      </button>
                    )}
                    {selected.status !== 'anulat' && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!(await confirmDialog({ title: 'Anulează proiectul?', body: 'Va dispărea din pipeline.', danger: true, confirmLabel: 'Anulează proiectul' }))) return;
                          await updateProjectStore(selected.id, { status: 'anulat' });
                          toast.success('Proiect anulat');
                        }}
                        title="Anulează proiect"
                        className="h-7 px-2 text-pm-xs font-semibold border border-line text-content-secondary hover:bg-status-red/10 hover:text-status-red hover:border-status-red/40 transition-colors"
                      >
                        Anulează
                      </button>
                    )}
                    {(selected.status === 'blocat' || selected.status === 'anulat') && (
                      <button
                        type="button"
                        onClick={async () => {
                          await updateProjectStore(selected.id, { status: 'în producție' });
                          toast.success('Proiect reactivat');
                        }}
                        title="Reia proiect (revine la status derivat din etapa)"
                        className="h-7 px-2 text-pm-xs font-semibold border border-status-green/40 text-status-green hover:bg-status-green/10 transition-colors"
                      >
                        Reia
                      </button>
                    )}
                    {!isViewer && (
                      <button
                        type="button"
                        onClick={() => openModal(selected)}
                        aria-label="Editează proiectul"
                        className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    <PortalTokensButton projectId={selected.id} />
                    {!isViewer && (
                      <button
                        type="button"
                        onClick={() => handleDelete(selected.id)}
                        aria-label="Șterge proiectul"
                        className="p-1.5 text-content-muted hover:bg-status-red/10 hover:text-status-red transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {}
              <section className="bg-surface-secondary border-b border-line">
                <header className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line/60">
                  <span className="inline-flex h-7 w-7 items-center justify-center bg-surface-tertiary text-content-muted">
                    <FolderKanban className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-pm-sm font-semibold text-content-primary flex-1">Informatii generale</h2>
                </header>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <p className="text-pm-2xs text-content-muted">Client</p>
                      <p className="text-pm-sm text-content-primary font-medium">{getClientName(selected)}</p>
                    </div>
                    <div>
                      <p className="text-pm-2xs text-content-muted">Status</p>
                      <StatusBadge {...projectStatus(selected.status)} />
                    </div>
                    <div>
                      <p className="text-pm-2xs text-content-muted">Stadiu</p>
                      <p className="text-pm-sm text-content-primary font-medium">{selected.stage || '—'}</p>
                    </div>
                    <div>
                      <p className="text-pm-2xs text-content-muted">Deadline</p>
                      <p className="text-pm-sm text-content-primary font-medium">{formatDateRo(selected.deadline)}</p>
                    </div>
                    <div>
                      <p className="text-pm-2xs text-content-muted">Buget</p>
                      <p className="text-pm-sm text-content-primary font-medium tabular-nums">{money(selected.estimated_value ?? selected.budget ?? 0, 'EUR')}</p>
                    </div>
                    <div>
                      <p className="text-pm-2xs text-content-muted">Prioritate</p>
                      <p className="text-pm-sm text-content-primary font-medium">{selected.priority || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-pm-2xs text-content-muted">Descriere</p>
                      <p className="text-pm-xs text-content-secondary">{selected.description || '—'}</p>
                    </div>
                  </div>
                </div>
              </section>

              {}
              <section className="bg-surface-secondary border-b border-line">
                <header className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line/60">
                  <span className="inline-flex h-7 w-7 items-center justify-center bg-surface-tertiary text-content-muted">
                    <History className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-pm-sm font-semibold text-content-primary flex-1">Revizuire stadii</h2>
                </header>
                <div className="p-4">
                  {}
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                      placeholder="Nota revizuire (optional)..."
                      className="flex-1 bg-surface-primary border border-line h-8 px-3 text-pm-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent/60"
                    />
                    <Button size="sm" onClick={addStageRevision}>
                      <Plus className="h-3.5 w-3.5" /> Adaugă revizuire
                    </Button>
                  </div>

                  {}
                  {stageRevisions.length === 0 ? (
                    <p className="text-pm-xs text-content-muted">Nicio revizuire înregistrată.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto">
                      {[...stageRevisions].reverse().map((rev, i) => (
                        <div key={i} className="flex items-start gap-2 px-2 py-1.5 border-b border-line/40 last:border-b-0 bg-surface-primary text-pm-xs">
                          <div className="mt-0.5 h-2 w-2 bg-accent shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-content-primary">{rev.stage}</span>
                              <StatusBadge {...projectStatus(rev.status)} size="xs" />
                            </div>
                            <p className="text-content-muted mt-0.5">{rev.note}</p>
                          </div>
                          <span className="text-content-muted shrink-0">{formatDateRo(rev.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {}
              <section
                className="bg-surface-secondary border-b border-line cursor-pointer hover:bg-surface-tertiary/30 transition-colors"
                onClick={() => onNavigate('parts-tree', { projectId: selectedId! })}
              >
                <header className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line/60">
                  <span className="inline-flex h-7 w-7 items-center justify-center bg-accent/10 text-accent">
                    <Network className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-pm-sm font-semibold text-content-primary flex-1">Arbore piese</h2>
                  {treeCount > 0 && (
                    <span className="text-pm-2xs font-semibold px-2 py-0.5 bg-accent/15 text-accent tabular-nums">
                      {treeCount} componente
                    </span>
                  )}
                </header>
                <div className="p-4">
                  {treeCount > 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
                        {Array.from({ length: Math.min(treeCount, 30) }, (_, i) => (
                          <div key={i} className="h-2 w-2 bg-accent/40" />
                        ))}
                        {treeCount > 30 && <span className="text-pm-2xs text-content-muted">+{treeCount - 30}</span>}
                      </div>
                      <span className="text-pm-xs text-accent ml-auto">Deschide &rarr;</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-pm-xs text-content-muted">Nicio componenta încărcată.</p>
                      <span className="text-pm-xs text-accent">Încarcă fisiere &rarr;</span>
                    </div>
                  )}
                </div>
              </section>

              {}
              <section className="bg-surface-secondary border-b border-line">
                <header className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line/60">
                  <span className="inline-flex h-7 w-7 items-center justify-center bg-surface-tertiary text-content-muted">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-pm-sm font-semibold text-content-primary flex-1">Documente atașate ({projectDocs.length})</h2>
                </header>
                <div className="p-4">
                  {docsLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-content-muted" />
                      <span className="text-pm-xs text-content-muted">Se încarcă...</span>
                    </div>
                  ) : projectDocs.length === 0 ? (
                    <p className="text-pm-xs text-content-muted">Niciun document atașat. Adaugă documente din pagina <span className="font-medium text-content-secondary">Documente</span> selectând acest proiect.</p>
                  ) : (
                    <div>
                      {projectDocs.map((d) => (
                        <div key={`${d.source ?? 'document'}-${d.id}`} className="flex items-center gap-3 border-b border-line/40 last:border-b-0 bg-surface-primary px-3 py-2">
                          <FileText className="h-4 w-4 text-content-muted shrink-0" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <p className="text-pm-sm font-medium text-content-primary truncate">{d.name}</p>
                            <p className="text-pm-2xs text-content-muted truncate">
                              {d.category_name} · {d.file_type?.toUpperCase()} · {(d.file_size / 1024).toFixed(0)} KB · {d.uploaded_by_name} · {formatDateRo(d.uploaded_at)}
                            </p>
                          </div>
                          {d.source === 'contract' ? (
                            <button
                              type="button"
                              onClick={() => void downloadOneContractAttachment(d.id)}
                              className="shrink-0 px-2 py-1 text-pm-xs text-accent hover:bg-accent/10 inline-flex items-center gap-1"
                              title="Descarcă fișierul contractului"
                            >
                              <DownloadIcon className="h-3.5 w-3.5" /> Descarcă
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(d)}
                              className="shrink-0 px-2 py-1 text-pm-xs text-accent hover:bg-accent/10 inline-flex items-center gap-1"
                              title="Vizualizează în aplicație"
                            >
                              <Eye className="h-3.5 w-3.5" /> Vizualizează
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {}
              <section className="bg-surface-secondary border-b border-line">
                <header className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line/60">
                  <span className="inline-flex h-7 w-7 items-center justify-center bg-surface-tertiary text-content-muted">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-pm-sm font-semibold text-content-primary flex-1">Comentarii</h2>
                </header>
                <div className="p-4 space-y-3">
                  {!isViewer && (
                    <div className="flex items-start gap-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void postComment(); } }}
                        placeholder="Scrie un comentariu… (@menționează cu numele de utilizator)"
                        rows={2}
                        className="flex-1 px-2.5 py-1.5 border border-line bg-surface-primary rounded text-pm-xs text-content-primary placeholder:text-content-muted/70 focus:outline-none focus:border-accent resize-none"
                      />
                      <Button size="sm" onClick={() => void postComment()} disabled={postingComment || !newComment.trim()}>
                        {postingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Adaugă
                      </Button>
                    </div>
                  )}
                  {commentsLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-content-muted" />
                      <span className="text-pm-xs text-content-muted">Se încarcă...</span>
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-pm-xs text-content-muted">Niciun comentariu.</p>
                  ) : (
                    <div>
                      {comments.map((c) => (
                        <div key={c.id} className="border-b border-line/40 pb-2 last:border-b-0 last:pb-0 py-2 first:pt-0">
                          <div className="flex items-center justify-between">
                            <span className="text-pm-xs font-medium text-content-primary">{c.user_name}</span>
                            <span className="text-pm-xs text-content-muted">{formatDateRo(c.created_at)}</span>
                          </div>
                          <p className="mt-1 text-pm-xs text-content-secondary">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}
          {

}
          {selectedId != null && (() => {
            const p = projects.find(x => x.id === selectedId);
            if (!p) return null;
            return (
              <ProjectsEnhancements
                project={{
                  id: p.id,
                  name: p.name,
                  client_name: p.client_name ?? null,
                  deadline: p.deadline ?? null,
                  budget: (p as { budget?: number | null }).budget ?? null,
                  status: p.status ?? null,
                  stage: p.stage ?? null,
                  description: (p as { description?: string | null }).description ?? null,
                }}
              />
            );
          })()}
        </main>
        </div>

        <FormModal
          isOpen={isOpen}
          onClose={closeModal}
          title={isEditing ? 'Editează proiect' : 'Adaugă proiect'}
          fields={formFields}
          onSubmit={handleSubmit}
          initialData={editingItem || {}}
          submitLabel={isEditing ? 'Actualizează' : 'Adaugă'}
        />

        {previewDoc && (
          <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
        )}
      </Page.Body>
    </Page>
  );
}



function DocumentPreviewModal({
  doc,
  onClose,
}: {
  doc: { id: number; name: string; file_path: string; file_type: string; file_size: number };
  onClose: () => void;
}) {
  const ext = (doc.file_type || '').toLowerCase().replace(/^\./, '');
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
  const isText = ['txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'log'].includes(ext);

  
  
  const url = (() => {
    const p = doc.file_path || '';
    if (!p) return '';
    if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('file://')) return p;
    if (p.startsWith('/')) return `file://${p}`;
    return `/api/files/${encodeURIComponent(p)}`;
  })();

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-[85vh] w-[90vw] max-w-5xl flex-col overflow-hidden border border-line bg-surface-primary shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line bg-surface-secondary px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-pm-sm font-medium text-content-primary">{doc.name}</p>
            <p className="truncate text-pm-2xs text-content-muted">{doc.file_path}</p>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2 py-1 text-pm-xs text-content-muted hover:bg-surface-tertiary hover:text-content-primary"
            title="Descarcă"
          >
            <DownloadIcon className="h-3.5 w-3.5" /> Descarcă
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="p-1 text-content-muted hover:bg-surface-tertiary hover:text-content-primary"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-auto bg-surface-primary">
          {!url ? (
            <div className="flex h-full items-center justify-center text-content-muted">Calea fișierului lipsește.</div>
          ) : isPdf ? (
            <iframe src={url} title={doc.name} className="h-full w-full border-0" />
          ) : isImage ? (
            <div className="flex h-full items-center justify-center p-4">
              <img src={url} alt={doc.name} className="max-h-full max-w-full object-contain" />
            </div>
          ) : isText ? (
            <iframe src={url} title={doc.name} className="h-full w-full border-0 bg-white" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <FileText className="h-12 w-12 text-content-muted" />
              <p className="text-pm-sm text-content-primary">Previzualizare indisponibilă pentru <span className="font-mono">.{ext || '?'}</span></p>
              <p className="max-w-md text-pm-xs text-content-muted">
                Acest tip de fișier nu poate fi afișat direct în aplicație. Folosește butonul „Descarcă" pentru a-l deschide cu aplicația implicită.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 bg-accent px-3 py-1.5 text-pm-xs font-medium text-surface-primary hover:opacity-90"
              >
                <DownloadIcon className="h-3.5 w-3.5" /> Descarcă fișierul
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





const PHASE_COLS: { key: keyof ProductionTracking; label: string }[] = [
  { key: 'proiectare', label: 'Proiect.' },
  { key: 'achizitie_materiale', label: 'Achiz.' },
  { key: 'debitare', label: 'Debit.' },
  { key: 'sudare', label: 'Sudare' },
  { key: 'prelucrare_mecanica', label: 'Preluc.' },
  { key: 'vopsire', label: 'Vopsire' },
  { key: 'asamblare', label: 'Asambl.' },
  { key: 'dxf', label: 'DXF' },
  { key: 'desene', label: 'Desene' },
  { key: 'executie', label: 'Exec.' },
  { key: 'testare', label: 'Test' },
  { key: 'livrat', label: 'Livrat' },
  { key: 'montat', label: 'Montat' },
  { key: 'punere_functiune', label: 'P.F.' },
];

function PhaseCell({ phase }: { phase: TrackingPhase }) {
  if (phase === 'finalizat')
    return <CheckCircle2 className="mx-auto h-4 w-4 text-status-green" />;
  if (phase === 'in_lucru')
    return <Clock className="mx-auto h-4 w-4 text-status-amber" />;
  return <Circle className="mx-auto h-4 w-4 text-content-muted/30" />;
}

function getProgressSummary(tracking: ProductionTracking) {
  const vals = Object.values(tracking);
  const done = vals.filter((v) => v === 'finalizat').length;
  const inProgress = vals.filter((v) => v === 'in_lucru').length;
  return { done, inProgress, total: vals.length };
}

export function PiecesTrackingTable({ pieces }: { pieces: ProjectPiece[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[900px]">
        <thead>
          <tr className="bg-surface-tertiary/40">
            <th className="px-2 py-1.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line whitespace-nowrap">Piesa</th>
            <th className="px-2 py-1.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line whitespace-nowrap text-center">Cant.</th>
            <th className="px-2 py-1.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line whitespace-nowrap">Progres</th>
            {PHASE_COLS.map((col) => (
              <th
                key={col.key}
                className="px-1 py-1.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line whitespace-nowrap text-center"
                title={col.key.replace(/_/g, ' ')}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pieces.map((piece) => {
            const tracking = parseProductionTracking(piece.production_tracking);
            const { done, inProgress, total } = getProgressSummary(tracking);
            const pct = Math.round((done / total) * 100);

            return (
              <React.Fragment key={piece.id}>
              <tr className="hover:bg-surface-tertiary/50 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === piece.id ? null : piece.id)}>
                <td className="px-2 py-1.5 text-pm-xs text-content-primary font-medium border-b border-line whitespace-nowrap max-w-[180px] truncate" title={piece.name}>
                  <span className="flex items-center gap-1">
                    <ChevronDown className={cn('h-3 w-3 text-content-muted transition-transform', expandedId === piece.id && 'rotate-180')} />
                    {piece.name}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-pm-xs text-content-primary border-b border-line text-center tabular-nums">
                  {piece.quantity}
                </td>
                <td className="px-2 py-1.5 border-b border-line whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-line overflow-hidden">
                      <div
                        className="h-full bg-status-green transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={cn(
                      'text-pm-2xs font-semibold tabular-nums',
                      pct === 100 ? 'text-status-green' : inProgress > 0 ? 'text-status-amber' : 'text-content-muted'
                    )}>
                      {done}/{total}
                    </span>
                  </div>
                </td>
                {PHASE_COLS.map((col) => (
                  <td key={col.key} className="px-1 py-1.5 border-b border-line text-center">
                    <PhaseCell phase={tracking[col.key]} />
                  </td>
                ))}
              </tr>
              {expandedId === piece.id && piece.source_file_path && (
                <tr key={`dxf-${piece.id}`}>
                  <td colSpan={PHASE_COLS.length + 3} className="p-3 border-b border-line bg-surface-tertiary/30">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Suspense fallback={<div className="ds-skeleton h-32 w-full rounded" />}>
                          <DxfViewer sldprtPath={piece.source_file_path} compact />
                        </Suspense>
                      </div>
                      <div className="w-48 text-pm-xs space-y-1.5">
                        <div className="text-content-muted text-pm-2xs">Fisier sursa</div>
                        <div className="font-mono text-pm-2xs text-content-primary break-all">{piece.source_file_name || piece.name}</div>
                        {piece.category && (
                          <><div className="text-content-muted text-pm-2xs mt-2">Categorie</div>
                          <div className="text-content-primary capitalize">{piece.category}</div></>
                        )}
                        {piece.specs && (
                          <><div className="text-content-muted text-pm-2xs mt-2">Specificatii</div>
                          <div className="text-content-primary">{piece.specs}</div></>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {expandedId === piece.id && !piece.source_file_path && (
                <tr key={`dxf-${piece.id}`}>
                  <td colSpan={PHASE_COLS.length + 3} className="p-3 border-b border-line bg-surface-tertiary/30 text-pm-xs text-content-muted text-center">
                    Niciun fisier sursa asociat acestei piese
                  </td>
                </tr>
              )}
            </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {}
      {pieces.length > 0 && (() => {
        const allTrackings = pieces.map((p) => parseProductionTracking(p.production_tracking));
        const totalPhases = allTrackings.length * PHASE_COLS.length;
        const totalDone = allTrackings.reduce((s, t) => s + Object.values(t).filter((v) => v === 'finalizat').length, 0);
        const totalInProgress = allTrackings.reduce((s, t) => s + Object.values(t).filter((v) => v === 'in_lucru').length, 0);
        const overallPct = Math.round((totalDone / totalPhases) * 100);

        return (
          <div className="mt-3 flex items-center gap-4 text-pm-xs px-2">
            <div className="flex items-center gap-1.5">
              <div className="w-24 h-2 bg-line overflow-hidden">
                <div className="h-full bg-status-green transition-all" style={{ width: `${overallPct}%` }} />
              </div>
              <span className="font-semibold text-content-primary tabular-nums">{overallPct}%</span>
            </div>
            <span className="text-content-muted tabular-nums">{pieces.length} piese</span>
            <span className="flex items-center gap-1 text-status-green"><CheckCircle2 className="h-3 w-3" /><span className="tabular-nums">{totalDone}</span> finalizate</span>
            <span className="flex items-center gap-1 text-status-amber"><Clock className="h-3 w-3" /><span className="tabular-nums">{totalInProgress}</span> in lucru</span>
          </div>
        );
      })()}
    </div>
  );
}

function PortalTokensButton({ projectId }: { projectId: number }) {
  const [open, setOpen] = useState(false);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<any[]>('list_portal_tokens', { project_id: projectId })
      .then(setTokens).catch(() => setTokens([])).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const create = async () => {
    const label = window.prompt('Etichetă (opțional, ex: "Trimisă pe email")', '') || null;
    try {
      await apiCommand('create_portal_token', { project_id: projectId, label });
      toast.success('Link portal creat');
      load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const revoke = async (id: number) => {
    try {
      await apiCommand('revoke_portal_token', { token_id: id });
      toast.success('Token revocat');
      load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const remove = async (id: number) => {
    try {
      await apiCommand('delete_portal_token', { token_id: id });
      toast.success('Token șters');
      load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const portalUrl = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/#/portal/${token}`;
  };

  const copyLink = (token: string) => {
    const url = portalUrl(token);
    navigator.clipboard?.writeText(url).then(
      () => toast.success('Link copiat în clipboard'),
      () => toast.error('Nu s-a putut copia'),
    );
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        aria-label="Link portal client"
        className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors">
        <Link2 className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-primary border border-line w-full max-w-2xl">
            <div className="border-b border-line p-4 flex items-center justify-between">
              <h3 className="text-pm-sm font-semibold text-content-primary">Portal client — link-uri proiect</h3>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-surface-tertiary"><XIcon className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-pm-xs text-content-muted">
                Generează un link unic pentru clientul acestui proiect. Vede status, contracte, facturi și tichete service — read-only, fără login.
              </p>
              <Button size="sm" onClick={create}>
                <Plus className="h-3.5 w-3.5" /> Generează link nou
              </Button>

              {loading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
              ) : tokens.length === 0 ? (
                <p className="text-pm-xs text-content-muted italic text-center py-4">Niciun link generat încă</p>
              ) : (
                <div>
                  {tokens.map(t => (
                    <div key={t.id} className={`bg-surface-secondary border border-line border-b-0 last:border-b p-3 ${t.revoked ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-pm-xs font-semibold text-content-primary truncate">{t.label || `Link #${t.id}`}</p>
                          <p className="text-pm-2xs text-content-muted">
                            {t.access_count} accesări • Creat {new Date(t.created_at).toLocaleDateString('ro-RO')}
                            {t.last_accessed_at && <> • Ultim acces {new Date(t.last_accessed_at).toLocaleString('ro-RO')}</>}
                            {t.revoked && <span className="text-status-red font-semibold ml-1">• REVOCAT</span>}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => copyLink(t.token)} title="Copiază link"
                            className="p-1 hover:bg-surface-tertiary text-content-muted hover:text-accent">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {!t.revoked && (
                            <button onClick={() => revoke(t.id)} title="Revocă"
                              className="p-1 hover:bg-surface-tertiary text-content-muted hover:text-status-amber">
                              <XIcon className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => remove(t.id)} title="Șterge"
                            className="p-1 hover:bg-surface-tertiary text-content-muted hover:text-status-red">
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <input readOnly value={portalUrl(t.token)}
                        onFocus={e => e.currentTarget.select()}
                        className="w-full text-pm-2xs font-mono px-2 py-1 border border-line bg-surface-primary text-content-secondary" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
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
