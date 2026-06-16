










import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  CheckCircle2, Circle, ListTodo, CalendarClock, FolderKanban, UserPlus, RotateCcw, Loader2,
} from 'lucide-react';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { toast } from '@/store/toastStore';
import {
  Card, ListRow, RowTitle, RowMeta, Tag, Divider, EmptyState, CenterSpinner, Segmented,
  Sheet, MButton, fmtDate, type Tone,
} from './kit';

interface Task {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  notes: string | null;
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'normal' | 'high';
  due_date: string | null;
  project_name: string | null;
  assigned_by_user_id: number | null;
  assigned_by_name: string | null;
  created_at: string;
}

const PRIORITY: Record<Task['priority'], { label: string; tone: Tone }> = {
  high:   { label: 'Urgent', tone: 'red' },
  normal: { label: 'Normal', tone: 'blue' },
  low:    { label: 'Minor',  tone: 'neutral' },
};

function isOverdue(t: Task): boolean {
  if (!t.due_date || t.status === 'done' || t.status === 'cancelled') return false;
  const d = new Date(t.due_date).getTime();
  return !Number.isNaN(d) && d < Date.now();
}

export default function TasksTab({ user, refreshKey }: { user: User; refreshKey: number }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const [openId, setOpenId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const list = await apiCommand<Task[]>('list_personal_tasks', { include_done: true });
      setTasks(Array.isArray(list) ? list : []);
    } catch {
      
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (refreshKey > 0) void load(true); }, [refreshKey, load]);

  const active = useMemo(() => tasks.filter(t => t.status === 'open' || t.status === 'in_progress'), [tasks]);
  const done = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);
  const list = tab === 'active' ? active : done;

  
  const sorted = useMemo(() => [...list].sort((a, b) => {
    if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1;
    const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    if (da !== db) return da - db;
    const order = { high: 0, normal: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  }), [list]);

  const complete = useCallback(async (t: Task) => {
    setBusyId(t.id);
    
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: 'done' } : x));
    try {
      await apiCommand('update_personal_task', { request: {
        id: t.id, status: 'done', completion_status: 'resolved', completion_note: null,
      }});
      toast.success('Marcat ca gata');
    } catch (e) {
      setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: t.status } : x));
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setBusyId(null);
    }
  }, []);

  const reopen = useCallback(async (t: Task) => {
    setBusyId(t.id);
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: 'open' } : x));
    try {
      await apiCommand('update_personal_task', { request: {
        id: t.id, status: 'open', completion_status: null, completion_note: '',
      }});
      toast.success('Redeschis');
    } catch (e) {
      setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: t.status } : x));
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setBusyId(null);
    }
  }, []);

  const openTask = tasks.find(t => t.id === openId) || null;

  return (
    <div className="pt-3">
      <div className="px-3.5">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'active', label: 'De făcut', count: active.length },
            { value: 'done', label: 'Gata', count: done.length },
          ]}
        />
      </div>

      <div className="px-3.5 mt-3">
        {loading && tasks.length === 0 ? (
          <CenterSpinner label="Se încarcă task-urile…" />
        ) : sorted.length === 0 ? (
          <Card>
            <EmptyState
              icon={tab === 'active' ? ListTodo : CheckCircle2}
              title={tab === 'active' ? 'Niciun task activ' : 'Niciun task finalizat'}
              hint={tab === 'active' ? 'Ești la zi. 🎉' : undefined}
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            {sorted.map((t, i) => {
              const pr = PRIORITY[t.priority];
              const overdue = isOverdue(t);
              const isDone = t.status === 'done';
              return (
                <div key={t.id}>
                  {i > 0 && <Divider />}
                  <ListRow
                    onClick={() => setOpenId(t.id)}
                    accent={isDone ? 'green' : overdue ? 'red' : pr.tone}
                    right={
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); isDone ? reopen(t) : complete(t); }}
                        className="grid place-items-center h-11 w-11 rounded-full active:bg-surface-tertiary"
                        aria-label={isDone ? 'Redeschide' : 'Marchează gata'}
                      >
                        {busyId === t.id
                          ? <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
                          : isDone
                            ? <CheckCircle2 className="h-6 w-6 text-status-green" />
                            : <Circle className="h-6 w-6 text-content-muted" />}
                      </button>
                    }
                  >
                    <RowTitle>
                      <span className={isDone ? 'line-through text-content-muted' : ''}>{t.title}</span>
                    </RowTitle>
                    <RowMeta>
                      {!isDone && <Tag tone={pr.tone}>{pr.label}</Tag>}
                      {t.due_date && (
                        <span className={overdue ? 'text-status-red font-semibold' : ''}>
                          {overdue ? 'Depășit ' : 'Termen '}{fmtDate(t.due_date)}
                        </span>
                      )}
                      {t.assigned_by_name && <span>· de la {t.assigned_by_name}</span>}
                    </RowMeta>
                  </ListRow>
                </div>
              );
            })}
          </Card>
        )}
        <div className="h-2" />
      </div>

      <TaskSheet
        task={openTask}
        currentUserId={user.id}
        busy={busyId === openId}
        onClose={() => setOpenId(null)}
        onComplete={complete}
        onReopen={reopen}
      />
    </div>
  );
}

function TaskSheet({ task, busy, onClose, onComplete, onReopen }: {
  task: Task | null;
  currentUserId: number;
  busy: boolean;
  onClose: () => void;
  onComplete: (t: Task) => void;
  onReopen: (t: Task) => void;
}) {
  if (!task) return null;
  const pr = PRIORITY[task.priority];
  const isDone = task.status === 'done';

  return (
    <Sheet
      open={!!task}
      onClose={onClose}
      title={task.title}
      subtitle={<Tag tone={isDone ? 'green' : pr.tone}>{isDone ? 'Gata' : pr.label}</Tag>}
      footer={
        isDone ? (
          <MButton full variant="secondary" icon={RotateCcw} busy={busy} onClick={() => { onReopen(task); onClose(); }}>
            Redeschide task
          </MButton>
        ) : (
          <MButton full variant="primary" icon={CheckCircle2} busy={busy} onClick={() => { onComplete(task); onClose(); }}>
            Marchează ca gata
          </MButton>
        )
      }
    >
      <div className="space-y-3">
        {task.due_date && (
          <Meta icon={CalendarClock} label="Termen" value={fmtDate(task.due_date)} tone={isOverdue(task) ? 'red' : undefined} />
        )}
        {task.project_name && <Meta icon={FolderKanban} label="Proiect" value={task.project_name} />}
        {task.assigned_by_name && <Meta icon={UserPlus} label="Delegat de" value={task.assigned_by_name} />}

        {task.description && <Block title="Descriere" body={task.description} />}
        {task.instructions && <Block title="Instrucțiuni" body={task.instructions} />}
        {task.notes && <Block title="Note" body={task.notes} />}
      </div>
    </Sheet>
  );
}

function Meta({ icon: Icon, label, value, tone }: { icon: typeof CalendarClock; label: string; value: string; tone?: Tone }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`h-4 w-4 shrink-0 ${tone === 'red' ? 'text-status-red' : 'text-content-muted'}`} />
      <span className="text-pm-2xs uppercase tracking-wide text-content-muted w-20 shrink-0">{label}</span>
      <span className={`text-pm-md ${tone === 'red' ? 'text-status-red font-semibold' : 'text-content-primary'}`}>{value}</span>
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-secondary p-3">
      <div className="text-pm-2xs uppercase tracking-wide text-content-muted mb-1">{title}</div>
      <p className="text-pm-md text-content-primary whitespace-pre-wrap break-words">{body}</p>
    </div>
  );
}
