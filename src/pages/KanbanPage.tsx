import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarClock, Loader2, BarChart3, AlertTriangle, CheckCircle2, Clock, Layers,
  MessageSquare, Timer, Package, Hash, Factory,
} from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { PieceTimerButton } from '@/components/TimeTrackerPill';
import Page from '@/components/ui/Page';
import { HeroHeader, GlassCard, MetricValue } from '@/components/ui';
import { ViewerBanner } from '@/components/ViewerBanner';
import { cn } from '@/lib/cn';
import { formatDateRo } from '@/lib/format';
import { toast } from '@/store/toastStore';
import { useMoney } from '@/store/settingsStore';
import type { User } from '@/core/types';
import type { ProjectPiece, ProductionTracking } from '@/types/piece';
import { parseProductionTracking } from '@/types/piece';
import { useProjectStore, type BoardColumn, type BoardProject } from '@/store/projectStore';
import { usePieceStore, usePiecesForProject } from '@/store/pieceStore';
import StatusBadge from '@/components/ui/StatusBadge';
import { pieceStatus } from '@/lib/statusTokens';
import { filterSelectCls } from '@/components/ui/filterControls';
import KanbanEnhancements from '@/pages/kanban/KanbanEnhancements';





interface PieceColumn {
  stage: { id: number; name: string; order_index: number };
  pieces: ProjectPiece[];
}





const STAGE_COLORS = [
  'var(--status-blue)',
  'var(--status-green)',
  'var(--status-amber)',
  'var(--status-teal)',
  'var(--status-red)',
  'var(--accent)',
];

const PRIORITY_STYLE: Record<string, { label: string }> = {
  urgenta:  { label: 'Urgent' },
  urgent:   { label: 'Urgent' },
  mare:     { label: 'Mare'   },
  high:     { label: 'Mare'   },
  medie:    { label: 'Medie'  },
  medium:   { label: 'Medie'  },
  mica:     { label: 'Mica'   },
  low:      { label: 'Mica'   },
};





function isDeadlineClose(deadline: string): boolean {
  if (!deadline) return false;
  const t = new Date(deadline);
  if (Number.isNaN(t.getTime())) return false;
  return (t.getTime() - Date.now()) / 86400000 <= 3;
}

function isOverdue(deadline: string): boolean {
  if (!deadline) return false;
  const t = new Date(deadline);
  if (Number.isNaN(t.getTime())) return false;
  return t.getTime() < Date.now();
}

function trackingProgress(t: ProductionTracking): { done: number; total: number; pct: number } {
  const vals = Object.values(t);
  const done = vals.filter(v => v === 'finalizat').length;
  const total = vals.length;
  return { done, total, pct: Math.round((done / total) * 100) };
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
}





interface KanbanPageProps {
  user: User | null;
  onNavigate?: (page: string, opts?: { projectId?: number }) => void;
}

export default function KanbanPage({ user: _user, onNavigate }: KanbanPageProps) {
  
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  
  const projectsList = useProjectStore(s => s.projects);
  const columns = useProjectStore(s => s.productionBoard);
  const stats = useProjectStore(s => s.productionStats);
  const loadingBoard = useProjectStore(s => s.loadingBoard);
  const moveProjectToStage = useProjectStore(s => s.moveProjectToStage);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const fetchProductionBoard = useProjectStore(s => s.fetchProductionBoard);
  const fetchProductionStats = useProjectStore(s => s.fetchProductionStats);

  const [filterClient, setFilterClient] = useState('');

  
  
  
  const piecesFromStore = usePiecesForProject(selectedProjectId);
  const fetchPieces = usePieceStore(s => s.fetchPieces);
  const movePieceToStageStore = usePieceStore(s => s.movePieceToStage);
  const [mergedStages, setMergedStages] = useState<{ id: number; name: string; order_index: number }[]>([]);
  const [loadingPieces, setLoadingPieces] = useState(false);

  const dragItem = useRef<{ id: number; fromStageId: number } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<number | null>(null);

  
  useEffect(() => {
    void fetchProjects();
    void fetchProductionBoard();
    void fetchProductionStats();
  }, [fetchProjects, fetchProductionBoard, fetchProductionStats]);

  
  const loading = loadingBoard && columns.length === 0;

  
  
  
  
  const reloadStages = useCallback(async (projectId: number) => {
    setLoadingPieces(true);
    try {
      const [customStages, projectBoard] = await Promise.all([
        apiCommand<{ id: number; name: string; order_index: number }[]>('get_project_stages_custom', { project_id: projectId }),
        apiCommand<BoardColumn[]>('get_production_board'),
      ]);
      const projectStages = (projectBoard ?? []).map(c => ({
        id: c.stage.id,
        name: c.stage.name,
        order_index: c.stage.order_index,
      }));
      const byId = new Map<number, { id: number; name: string; order_index: number }>();
      for (const s of projectStages) byId.set(s.id, s);
      for (const s of (customStages ?? [])) byId.set(s.id, s);
      setMergedStages([...byId.values()].sort((a, b) => a.order_index - b.order_index));
    } catch (err) {
      console.error('[KanbanPage] stages load failed:', err);
      setMergedStages([]);
    } finally {
      setLoadingPieces(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId === null) return;
    void reloadStages(selectedProjectId);
    void fetchPieces(selectedProjectId);
  }, [selectedProjectId, reloadStages, fetchPieces]);

  
  const pieceCols: PieceColumn[] = useMemo(() => {
    const byStage = new Map<number, ProjectPiece[]>();
    for (const p of piecesFromStore) {
      const arr = byStage.get(p.stage_id) ?? [];
      arr.push(p);
      byStage.set(p.stage_id, arr);
    }
    return mergedStages.map(s => ({ stage: s, pieces: byStage.get(s.id) ?? [] }));
  }, [piecesFromStore, mergedStages]);

  
  const uniqueClients = useMemo(() => {
    const names = new Set<string>();
    for (const col of columns) for (const p of col.projects) if (p.client_name) names.add(p.client_name);
    return Array.from(names).sort();
  }, [columns]);

  const filteredColumns = useMemo(() => {
    if (!filterClient) return columns;
    return columns.map(col => ({
      ...col,
      projects: col.projects.filter(p => p.client_name === filterClient),
    }));
  }, [columns, filterClient]);

  
  
  
  const handleProjectDrop = async (e: React.DragEvent, toStageId: number) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!dragItem.current) return;
    const { id: projectId, fromStageId } = dragItem.current;
    dragItem.current = null;
    if (fromStageId === toStageId) return;

    try {
      await moveProjectToStage(projectId, toStageId);
      toast.success('Proiect mutat');
    } catch (err: unknown) {
      console.error('[KanbanPage] move project failed:', err);
      const e = err as { message?: string; data?: { error?: string } };
      const msg = e?.message || e?.data?.error || 'Eroare la mutarea proiectului';
      toast.error(msg);
    }
  };

  
  
  
  
  const handlePieceDrop = async (e: React.DragEvent, toStageId: number) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!dragItem.current) return;
    const { id: pieceId, fromStageId } = dragItem.current;
    dragItem.current = null;
    if (fromStageId === toStageId || selectedProjectId == null) return;

    try {
      await movePieceToStageStore(pieceId, selectedProjectId, toStageId);
      toast.success('Piesa mutată');
    } catch (err: unknown) {
      console.error('[KanbanPage] move piece failed:', err);
      const e = err as { message?: string; data?: { error?: string } };
      const msg = e?.message || e?.data?.error || 'Eroare la mutarea piesei';
      toast.error(msg);
    }
  };

  const handleDragStart = (id: number, fromStageId: number) => {
    dragItem.current = { id, fromStageId };
  };
  const handleDragOver = (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };
  const handleDragLeave = () => setDragOverStage(null);

  
  const isPiecesMode = selectedProjectId !== null;
  const showLoading = isPiecesMode ? loadingPieces : loading;

  return (
    
    
    
    
    <Page className="!overflow-hidden">
      <Page.Body maxWidth="full" padding="flush" className="flex flex-1 flex-col min-h-0 !space-y-0 overflow-hidden">
        <ViewerBanner page="production" />

        {}
        <div className="px-4 pt-4 pb-1 shrink-0">
          <HeroHeader
            className="enter-up" style={{ animationDelay: '0ms' }}
            eyebrow="Producție"
            icon={Factory}
            title="Producție"
            subtitle="Kanban de proiecte și piese pe etapele de producție"
          />
        </div>

        {}
        {!isPiecesMode && stats && (
          <div className="px-4 pt-3 pb-6 shrink-0">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 enter-up" style={{ animationDelay: '80ms' }}>
              <KpiMini icon={Layers}        label="Total proiecte" value={stats.total ?? 0} />
              <KpiMini icon={Clock}         label="În producție"   value={stats.in_production ?? 0} />
              <KpiMini icon={CheckCircle2}  label="Aprobate"       value={stats.approved ?? 0} />
              <KpiMini icon={AlertTriangle} label="Blocate"        value={stats.blocked ?? 0} warn={(stats.blocked ?? 0) > 0} />
              <KpiMini icon={BarChart3}     label="Finalizate"     value={stats.completed ?? 0} />
            </div>
          </div>
        )}

        {}
        <section className="bg-surface-secondary border-b border-line">
          <div className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Vizualizare</span>
            <select
              value={selectedProjectId ?? ''}
              onChange={e => {
                const v = e.target.value;
                setSelectedProjectId(v === '' ? null : Number(v));
              }}
              className={cn(filterSelectCls(false), 'min-w-[240px]')}
            >
              <option value="">Kanban proiecte (toate)</option>
              <optgroup label="Piesele unui proiect">
                {projectsList.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.client_name ? ` — ${p.client_name}` : ''}</option>
                ))}
              </optgroup>
            </select>

            {!isPiecesMode && (
              <select
                value={filterClient}
                onChange={e => setFilterClient(e.target.value)}
                className={filterSelectCls(filterClient !== '')}
              >
                <option value="">Toti clientii</option>
                {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {isPiecesMode && (
              <span className="text-pm-2xs text-content-muted">
                {pieceCols.reduce((s, c) => s + c.pieces.length, 0)} piese · {pieceCols.length} etape
              </span>
            )}
          </div>
        </section>

        {}
        {showLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
          </div>
        ) : isPiecesMode ? (
          <PiecesBoard
            columns={pieceCols}
            dragOverStage={dragOverStage}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handlePieceDrop}
            onPieceClick={(pieceId) => {
              if (!onNavigate || selectedProjectId == null) return;
              
              sessionStorage.setItem('promix_focus_piece', String(pieceId));
              onNavigate('parts-tree', { projectId: selectedProjectId });
            }}
          />
        ) : (
          <ProjectsBoard
            columns={filteredColumns}
            dragOverStage={dragOverStage}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleProjectDrop}
            onProjectClick={(projectId) => onNavigate?.('parts-tree', { projectId })}
            onProjectEdit={(projectId) => {
              
              
              sessionStorage.setItem('promix_focus_project', String(projectId));
              sessionStorage.setItem('promix_focus_project_action', 'edit');
              onNavigate?.('projects', { projectId });
            }}
          />
        )}

        {}
        <KanbanEnhancements
          scope={isPiecesMode ? 'pieces' : 'projects'}
          stages={
            isPiecesMode
              ? pieceCols.map(c => ({ id: c.stage.id, name: c.stage.name }))
              : filteredColumns.map(c => ({ id: c.stage.id, name: c.stage.name }))
          }
          cards={
            isPiecesMode
              ? pieceCols.flatMap(c => c.pieces.map(p => ({
                  id: p.id,
                  stageId: c.stage.id,
                  createdAt: p.created_at as string | null,
                  priority: null,
                  clientName: null,
                  assignee: null,
                })))
              : filteredColumns.flatMap(c => c.projects.map(p => ({
                  id: p.id,
                  stageId: c.stage.id,
                  createdAt: (p as BoardProject & { created_at?: string | null }).created_at ?? null,
                  priority: p.priority ?? null,
                  clientName: p.client_name ?? null,
                  assignee: null,
                })))
          }
          currentFilter={{ filterClient }}
          onApplyFilter={(payload) => {
            const fc = payload.filterClient;
            if (typeof fc === 'string') setFilterClient(fc);
          }}
        />
      </Page.Body>
    </Page>
  );
}





function ProjectsBoard({
  columns, dragOverStage, onDragStart, onDragOver, onDragLeave, onDrop, onProjectClick, onProjectEdit,
}: {
  columns: BoardColumn[];
  dragOverStage: number | null;
  onDragStart: (id: number, fromStageId: number) => void;
  onDragOver: (e: React.DragEvent, stageId: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, stageId: number) => void | Promise<void>;
  onProjectClick?: (id: number) => void;
  onProjectEdit?: (id: number) => void;
}) {
  return (
    <div className="flex flex-1 overflow-x-auto overflow-y-hidden scroll-fade-x">
      {columns.map((col, i) => {
        const color = STAGE_COLORS[i % STAGE_COLORS.length];
        const isOver = dragOverStage === col.stage.id;
        return (
          <motion.div
            key={col.stage.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className={cn(
              'flex min-w-[280px] flex-1 flex-col bg-surface-secondary border-r border-line last:border-r-0 transition-colors',
              isOver && 'bg-accent/5',
            )}
            onDragOver={e => onDragOver(e, col.stage.id)}
            onDragLeave={onDragLeave}
            onDrop={e => void onDrop(e, col.stage.id)}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-line" style={{ borderTop: `3px solid ${color}` }}>
              <h3 className="text-pm-sm font-medium text-content-primary">{col.stage.name}</h3>
              <span className="bg-surface-tertiary px-2 text-pm-2xs font-semibold text-content-muted tabular-nums">
                {col.projects.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {col.projects.length === 0 ? (
                <p className="py-4 text-center text-pm-xs text-content-muted">Niciun proiect</p>
              ) : (
                col.projects.map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onDragStart={() => onDragStart(p.id, col.stage.id)}
                    onClick={() => onProjectClick?.(p.id)}
                    onEdit={() => onProjectEdit?.(p.id)}
                  />
                ))
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function ProjectCard({ project, onDragStart, onClick, onEdit }: { project: BoardProject; onDragStart: () => void; onClick?: () => void; onEdit?: () => void }) {
  const money = useMoney();
  const priKey = (project.priority || '').toLowerCase();
  const pri = PRIORITY_STYLE[priKey];
  const close = project.deadline ? isDeadlineClose(project.deadline) : false;
  const overdue = project.deadline ? isOverdue(project.deadline) : false;

  return (
    <div
      role="article"
      aria-label={`Card proiect ${project.name}`}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="group cursor-pointer border border-line bg-surface-primary p-3 mb-1 transition-shadow hover:shadow-sm hover:border-accent/40 active:cursor-grabbing"
    >
      {}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-pm-sm font-medium text-content-primary truncate">{project.name}</p>
          <p className="mt-0.5 text-pm-xs text-content-muted truncate">{project.client_name}</p>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="Editează proiect"
            aria-label="Editează proiect"
            className="shrink-0 p-1 text-content-muted hover:bg-accent/15 hover:text-accent border border-transparent hover:border-accent/40 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        )}
        {pri && (
          <StatusBadge
            tone={
              priKey === 'urgenta' || priKey === 'urgent'
                ? 'danger'
                : priKey === 'mare' || priKey === 'high'
                  ? 'warning'
                  : priKey === 'medie' || priKey === 'medium'
                    ? 'info'
                    : 'neutral'
            }
            label={pri.label}
            size="xs"
            uppercase
            className="shrink-0"
          />
        )}
      </div>

      {}
      {project.estimated_value > 0 && (
        <div className="mt-2 text-pm-xs font-semibold text-content-primary tabular-nums">
          {money(project.estimated_value, 'EUR')}
        </div>
      )}

      {}
      <div className="mt-2 flex items-center gap-3 text-pm-2xs text-content-muted">
        {project.comment_count > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            <span className="tabular-nums">{project.comment_count}</span>
          </span>
        )}
        {project.time_entries_count > 0 && (
          <span className="inline-flex items-center gap-1">
            <Timer className="h-3 w-3" />
            <span className="tabular-nums">{project.time_entries_count}</span>
          </span>
        )}
        {project.client_name && (
          <span
            className="ml-auto inline-flex items-center justify-center h-5 w-5 bg-accent/15 text-accent text-pm-2xs font-bold"
            title={project.client_name}
          >
            {initials(project.client_name)}
          </span>
        )}
        {project.deadline && (
          <span
            className={cn(
              'inline-flex items-center gap-1 tabular-nums',
              overdue ? 'text-status-red font-medium' : close ? 'text-status-amber' : '',
            )}
          >
            <CalendarClock className="h-3 w-3" />
            {formatDateRo(project.deadline)}
          </span>
        )}
      </div>
    </div>
  );
}





function PiecesBoard({
  columns, dragOverStage, onDragStart, onDragOver, onDragLeave, onDrop, onPieceClick,
}: {
  columns: PieceColumn[];
  dragOverStage: number | null;
  onDragStart: (id: number, fromStageId: number) => void;
  onDragOver: (e: React.DragEvent, stageId: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, stageId: number) => void | Promise<void>;
  onPieceClick?: (id: number) => void;
}) {
  if (columns.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-content-muted">
        <Package className="h-8 w-8 opacity-40" />
        <p className="text-pm-xs">Proiectul nu are etape definite sau piese importate.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-x-auto overflow-y-hidden scroll-fade-x">
      {columns.map((col, i) => {
        const color = STAGE_COLORS[i % STAGE_COLORS.length];
        const isOver = dragOverStage === col.stage.id;
        return (
          <motion.div
            key={col.stage.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
            className={cn(
              'flex min-w-[260px] flex-1 flex-col bg-surface-secondary border-r border-line last:border-r-0 transition-colors',
              isOver && 'bg-accent/5',
            )}
            onDragOver={e => onDragOver(e, col.stage.id)}
            onDragLeave={onDragLeave}
            onDrop={e => void onDrop(e, col.stage.id)}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-line" style={{ borderTop: `3px solid ${color}` }}>
              <h3 className="text-pm-sm font-medium text-content-primary truncate">{col.stage.name}</h3>
              <span className="bg-surface-tertiary px-2 text-pm-2xs font-semibold text-content-muted tabular-nums">
                {col.pieces.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {col.pieces.length === 0 ? (
                <p className="py-4 text-center text-pm-xs text-content-muted">Nicio piesa</p>
              ) : (
                col.pieces.map(piece => (
                  <PieceCard
                    key={piece.id}
                    piece={piece}
                    onDragStart={() => onDragStart(piece.id, col.stage.id)}
                    onClick={() => onPieceClick?.(piece.id)}
                  />
                ))
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function PieceCard({ piece, onDragStart, onClick }: { piece: ProjectPiece; onDragStart: () => void; onClick?: () => void }) {
  const progress = useMemo(() => trackingProgress(parseProductionTracking(piece.production_tracking)), [piece.production_tracking]);

  return (
    <div
      role="article"
      aria-label={`Card piesa ${piece.name}`}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="cursor-pointer border border-line bg-surface-primary p-2.5 mb-1 transition-shadow hover:shadow-sm hover:border-accent/40 active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-pm-xs font-semibold text-content-primary truncate leading-snug">{piece.name}</p>
          <div className="mt-1 flex items-center gap-1 flex-wrap">
            <span className="inline-flex items-center px-1.5 py-px text-pm-2xs font-semibold uppercase tracking-wide bg-accent/10 text-accent">
              {piece.category}
            </span>
            <span className="inline-flex items-center gap-0.5 text-pm-2xs text-content-muted tabular-nums">
              <Hash className="h-2.5 w-2.5" />{piece.quantity}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          <PieceTimerButton pieceId={piece.id} pieceName={piece.name} />
          <StatusBadge {...pieceStatus(piece.status)} size="xs" uppercase />
        </div>
      </div>

      {}
      <div className="mt-2 flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-line overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progress.pct}%`,
              background: progress.pct === 100 ? 'var(--status-green)' : progress.pct > 0 ? 'var(--status-amber)' : 'transparent',
            }}
          />
        </div>
        <span className="text-pm-2xs text-content-muted tabular-nums w-10 text-right">{progress.done}/{progress.total}</span>
      </div>
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
