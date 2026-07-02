import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, ChevronRight, GripVertical } from '@/icons';
import { toast } from 'sonner';
import {
  useProjectStore,
  type BoardColumn,
  type BoardProject,
} from '@/store/projectStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/v2/components/ui/card';
import { Page, PageHeader, PageBody, PageToolbar, PageSearch } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';

function parseStageId(id: string | number): number | null {
  const s = String(id);
  if (s.startsWith('stage-')) return Number(s.slice(6));
  return null;
}

function parseProjectId(id: string | number): number | null {
  const s = String(id);
  if (s.startsWith('project-')) return Number(s.slice(8));
  return null;
}

function KanbanCard({
  project,
  stageId,
  columnIds,
  onMove,
}: {
  project: BoardProject;
  stageId: number;
  columnIds: number[];
  onMove: (projectId: number, toStageId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `project-${project.id}`,
    data: { projectId: project.id, stageId },
  });

  const stageIdx = columnIds.indexOf(stageId);

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined;

  const openProject = () => {
    window.location.hash = `/v2/projects/${project.id}`;
  };

  return (
    <Card ref={setNodeRef} style={style} className="shadow-none">
      <CardHeader className="flex flex-row items-start gap-2 p-[var(--density-card-p)] pb-1">
        <button
          type="button"
          className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground"
          {...listeners}
          {...attributes}
          aria-label="Mută card"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={openProject} className="text-left">
            <CardTitle className="text-sm hover:underline">{project.name}</CardTitle>
          </button>
          <p className="text-xs text-muted-foreground">{project.client_name}</p>
        </div>
        <StatusBadge status={project.priority} />
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {project.deadline && (
          <p className="text-xs text-muted-foreground">Termen: {project.deadline}</p>
        )}
        <div className="flex items-center justify-between gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            disabled={stageIdx <= 0}
            onClick={() => stageIdx > 0 && onMove(project.id, columnIds[stageIdx - 1])}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[10px] text-muted-foreground">
            {project.comment_count} comentarii
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            disabled={stageIdx < 0 || stageIdx >= columnIds.length - 1}
            onClick={() =>
              stageIdx >= 0 &&
              stageIdx < columnIds.length - 1 &&
              onMove(project.id, columnIds[stageIdx + 1])
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({
  column,
  columnIds,
  onMove,
}: {
  column: BoardColumn;
  columnIds: number[];
  onMove: (projectId: number, toStageId: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${column.stage.id}`,
    data: { stageId: column.stage.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`v2-kanban-column transition-colors ${isOver ? 'bg-muted/60' : 'bg-muted/20'}`}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{column.stage.name}</h3>
        <span className="text-xs text-muted-foreground">{column.projects.length}</span>
      </div>
      {column.projects.map((p) => (
        <KanbanCard
          key={p.id}
          project={p}
          stageId={column.stage.id}
          columnIds={columnIds}
          onMove={onMove}
        />
      ))}
    </div>
  );
}

function CardPreview({ project }: { project: BoardProject }) {
  return (
    <Card className="w-[260px] shadow-lg">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">{project.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
        {project.client_name}
      </CardContent>
    </Card>
  );
}

export default function KanbanPage() {
  const board = useProjectStore((s) => s.productionBoard);
  const loading = useProjectStore((s) => s.loadingBoard);
  const fetchBoard = useProjectStore((s) => s.fetchProductionBoard);
  const moveProjectToStage = useProjectStore((s) => s.moveProjectToStage);

  const [activeProject, setActiveProject] = useState<BoardProject | null>(null);
  const [moving, setMoving] = useState(false);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');

  const filteredBoard = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return board.map((col) => ({
      ...col,
      projects: col.projects.filter((p) => {
        if (priority && p.priority !== priority) return false;
        if (!needle) return true;
        return [p.name, p.client_name].some((v) => v.toLowerCase().includes(needle));
      }),
    }));
  }, [board, search, priority]);

  const priorities = useMemo(() => {
    const set = new Set(board.flatMap((c) => c.projects.map((p) => p.priority)));
    return Array.from(set).filter(Boolean).sort();
  }, [board]);

  const totalVisible = filteredBoard.reduce((n, c) => n + c.projects.length, 0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const columnIds = filteredBoard.map((c) => c.stage.id);

  useEffect(() => {
    void fetchBoard();
  }, [fetchBoard]);

  const handleMove = async (projectId: number, toStageId: number) => {
    const fromCol = board.find((c) => c.projects.some((p) => p.id === projectId));
    if (!fromCol || fromCol.stage.id === toStageId) return;

    setMoving(true);
    try {
      await moveProjectToStage(projectId, toStageId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nu s-a putut muta proiectul');
    } finally {
      setMoving(false);
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    const projectId = parseProjectId(event.active.id);
    if (!projectId) return;
    const project = board.flatMap((c) => c.projects).find((p) => p.id === projectId);
    setActiveProject(project ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveProject(null);
    const projectId = parseProjectId(event.active.id);
    if (!projectId || !event.over) return;

    const toStageId = parseStageId(event.over.id);
    if (!toStageId) return;

    void handleMove(projectId, toStageId);
  };

  return (
    <Page fill>
      <PageHeader title="Producție" description={`${totalVisible} proiecte pe board`} />
      <PageToolbar>
        <PageSearch
          placeholder="Caută proiect sau client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-8 rounded-md border bg-background px-2 text-sm"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">Toate prioritățile</option>
          {priorities.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {(search || priority) && (
          <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setPriority(''); }}>
            Resetează
          </Button>
        )}
      </PageToolbar>
      <PageBody>
        <AsyncContent loading={loading && board.length === 0} error={null} empty={board.length === 0}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className={`v2-kanban-board ${moving ? 'pointer-events-none opacity-80' : ''}`}>
              {filteredBoard.map((col) => (
                <KanbanColumn
                  key={col.stage.id}
                  column={col}
                  columnIds={columnIds}
                  onMove={(pid, sid) => void handleMove(pid, sid)}
                />
              ))}
            </div>
            <DragOverlay>
              {activeProject ? <CardPreview project={activeProject} /> : null}
            </DragOverlay>
          </DndContext>
        </AsyncContent>
      </PageBody>
    </Page>
  );
}
