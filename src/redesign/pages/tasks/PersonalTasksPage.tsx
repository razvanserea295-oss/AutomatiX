




































import { useState, useEffect, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import {
  CheckSquare, Plus, Trash2, AtSign, Clock, UserPlus, Info, X, Edit2,
  AlertTriangle, HelpCircle, Calendar, FileText, Layers, ListTodo, Reply, Send,
  CheckCircle2, Inbox,
} from 'lucide-react';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { toast } from '@/store/toastStore';
import { formatDateTimeRo } from '@/lib/format';
import type { StatusTone } from '@/lib/statusTokens';

import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import Page from '@/redesign/ui/Page';
import KpiCard from '@/redesign/ui/KpiCard';
import StatusBadge from '@/redesign/ui/StatusBadge';
import FilterBar from '@/redesign/ui/FilterBar';
import { GlassCard, Skeleton, EmptyState } from '@/redesign/ui';
import Tabs from '@/redesign/ui/Tabs';
import { confirmDialog } from '@/redesign/ui/ConfirmDialog';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';

interface Task {
  id: number; user_id: number; user_name: string | null;
  title: string; description: string | null;
  instructions: string | null;
  notes: string | null;
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'normal' | 'high';
  due_date: string | null; project_id: number | null; project_name: string | null;
  assigned_by_user_id: number | null; assigned_by_name: string | null;
  completed_at: string | null;
  completed_by_user_id: number | null;
  completed_by_name: string | null;
  completion_note: string | null;
  completion_status: 'resolved' | 'unresolved' | 'needs_clarification' | null;
  
  clarification_pending?: boolean;
  created_at: string;
}

interface UserItem { id: number; full_name: string; username: string; }

interface Mention {
  id: number; actor_name: string | null; source_type: string;
  source_id: number; snippet: string; is_read: boolean; created_at: string;
}

const PRIORITY_TONE: Record<Task['priority'], StatusTone> = {
  high: 'danger',
  normal: 'info',
  low: 'neutral',
};

const STATUS_LABEL = {
  open: 'Deschis', in_progress: 'În lucru', done: 'Gata', cancelled: 'Anulat',
};

const COMPLETION_STATUS_LABEL: Record<string, string> = {
  resolved:            'Rezolvat',
  unresolved:          'Nerezolvat',
  needs_clarification: 'Necesită clarificări',
};

const COMPLETION_STATUS_TONE: Record<string, StatusTone> = {
  resolved:            'success',
  unresolved:          'danger',
  needs_clarification: 'warning',
};

export default function PersonalTasksPage({ user }: { user: User | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [delegated, setDelegated] = useState<Task[]>([]);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [tab, setTab] = useState<'tasks' | 'delegated' | 'statusuri' | 'mentions'>('tasks');

  
  
  const [search, setSearch] = useState('');

  
  
  
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewReassignTo, setReviewReassignTo] = useState<number | ''>('');

  
  
  const [clarifyOpen, setClarifyOpen] = useState(false);
  const [clarifyText, setClarifyText] = useState('');

  
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editorDraft, setEditorDraft] = useState<Partial<Task> & { assignee_id?: number | null }>({});

  
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTask, setInfoTask] = useState<Task | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [completionStatus, setCompletionStatus] = useState<'resolved' | 'unresolved' | 'needs_clarification'>('resolved');

  
  
  
  
  const canAssign = true;

  const fetch = useCallback(() => {
    setLoading(true);
    
    
    
    
    Promise.all([
      apiCommand<Task[]>('list_personal_tasks', { include_done: true }),
      apiCommand<Mention[]>('list_mentions'),
      apiCommand<Task[]>('list_tasks_assigned_by_me', { include_done: true }).catch(() => [] as Task[]),
      apiCommand<UserItem[]>('list_assignable_users').catch(() => [] as UserItem[]),
    ]).then(([taskList, mentionList, delegatedList, usersList]) => {
      setTasks(taskList);
      setMentions(mentionList);
      setDelegated(delegatedList);
      setUsers(usersList);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  












  const reviewBuckets = useMemo(() => {
    const myId = user?.id ?? -1;
    
    const completedDelegated = delegated.filter(t => t.status === 'done');
    
    const myTasksWaiting = tasks.filter(t =>
      t.assigned_by_user_id != null
        && t.assigned_by_user_id !== myId
        && (
          (t.status === 'done' && t.completion_status != null)
          || t.clarification_pending === true
        ),
    );
    return {
      resolved:            completedDelegated.filter(t => !t.completion_status || t.completion_status === 'resolved'),
      needs_clarification: completedDelegated.filter(t => t.completion_status === 'needs_clarification'),
      unresolved:          completedDelegated.filter(t => t.completion_status === 'unresolved'),
      waiting_response:    myTasksWaiting,
      total:               completedDelegated.length + myTasksWaiting.length,
    };
  }, [delegated, tasks, user?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  
  const openCreate = () => {
    setEditorMode('create');
    setEditorDraft({ priority: 'normal', assignee_id: null });
    setEditorOpen(true);
  };
  const openEdit = (t: Task) => {
    setEditorMode('edit');
    setEditorDraft({
      id: t.id, title: t.title, description: t.description,
      instructions: t.instructions, notes: t.notes,
      priority: t.priority, due_date: t.due_date,
    });
    setEditorOpen(true);
  };
  const closeEditor = () => { setEditorOpen(false); setEditorDraft({}); };

  const saveEditor = async () => {
    const title = (editorDraft.title || '').trim();
    if (!title) { toast.error('Titlu obligatoriu'); return; }
    try {
      if (editorMode === 'create') {
        const isDelegating = editorDraft.assignee_id && Number(editorDraft.assignee_id) !== user?.id;
        if (isDelegating) {
          await apiCommand('assign_task_to_user', { request: {
            target_user_id: Number(editorDraft.assignee_id),
            title,
            description: editorDraft.description || null,
            instructions: editorDraft.instructions || null,
            notes: editorDraft.notes || null,
            priority: editorDraft.priority || 'normal',
            due_date: editorDraft.due_date || null,
          }});
          toast.success('Task delegat');
        } else {
          await apiCommand('create_personal_task', { request: {
            title,
            description: editorDraft.description || null,
            instructions: editorDraft.instructions || null,
            notes: editorDraft.notes || null,
            priority: editorDraft.priority || 'normal',
            due_date: editorDraft.due_date || null,
          }});
          toast.success('Task creat');
        }
      } else {
        await apiCommand('update_personal_task', { request: {
          id: editorDraft.id,
          title,
          description: editorDraft.description ?? null,
          instructions: editorDraft.instructions ?? null,
          notes: editorDraft.notes ?? null,
          priority: editorDraft.priority,
          due_date: editorDraft.due_date ?? null,
        }});
        toast.success('Task actualizat');
      }
      closeEditor();
      fetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  
  const openInfo = async (t: Task) => {
    
    let fresh = t;
    try {
      fresh = await apiCommand<Task>('get_personal_task', { id: t.id });
    } catch {
      fresh = t;
    }
    setCompletionNote('');
    setCompletionStatus('resolved');
    
    
    
    startMorphTransition(() => flushSync(() => {
      setInfoTask(fresh);
      setInfoOpen(true);
    }), { dir: 'forward' });
  };
  const closeInfo = () => { setInfoOpen(false); setInfoTask(null); };

  const completeTask = async (newStatus: 'resolved' | 'unresolved' | 'needs_clarification') => {
    if (!infoTask) return;
    try {
      await apiCommand('update_personal_task', { request: {
        id: infoTask.id,
        status: 'done',
        completion_status: newStatus,
        completion_note: completionNote.trim() || null,
      }});
      toast.success(
        newStatus === 'resolved' ? 'Marcat ca rezolvat' :
        newStatus === 'unresolved' ? 'Marcat ca nerezolvat — delegatorul este notificat' :
        'Marcat — necesită clarificări',
      );
      closeInfo();
      fetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const reopenTask = async () => {
    if (!infoTask) return;
    try {
      await apiCommand('update_personal_task', { request: {
        id: infoTask.id, status: 'open',
        completion_note: '', completion_status: null,
      }});
      toast.success('Redeschis');
      closeInfo();
      fetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  
  const openReview = (t: Task) => {
    setReviewTask(t);
    setReviewNote('');
    setReviewReassignTo('');
  };
  const closeReview = () => { setReviewTask(null); setReviewNote(''); setReviewReassignTo(''); };

  
  const confirmResolution = async () => {
    if (!reviewTask) return;
    try {
      await apiCommand('delete_personal_task', { id: reviewTask.id });
      toast.success('Confirmat — task închis');
      closeReview();
      fetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  





  const sendBack = async (assigneeOverride?: number | null) => {
    if (!reviewTask) return;
    const note = reviewNote.trim();
    const reassignTo = assigneeOverride ?? (reviewReassignTo ? Number(reviewReassignTo) : null);
    try {
      await apiCommand('reopen_personal_task', { request: {
        id: reviewTask.id,
        response_note: note,
        reassign_to_user_id: reassignTo,
      }});
      toast.success(reassignTo ? 'Reasignat' : 'Trimis înapoi');
      closeReview();
      fetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  
  const submitClarification = async () => {
    if (!infoTask || !clarifyText.trim()) return;
    try {
      await apiCommand('request_task_clarification', { request: {
        id: infoTask.id, question: clarifyText.trim(),
      }});
      toast.success('Clarificare cerută — delegatorul a fost notificat');
      setClarifyOpen(false);
      setClarifyText('');
      closeInfo();
      fetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  
  const quickToggle = async (task: Task) => {
    if (task.status !== 'done') {
      
      
      
      void openInfo(task);
      return;
    }
    try {
      await apiCommand('update_personal_task', { request: {
        id: task.id, status: 'open',
        completion_note: '', completion_status: null,
      }});
      fetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const remove = async (id: number) => {
    
    
    const ok = await confirmDialog({
      title: 'Șterge task-ul?',
      body: 'Task-ul va fi șters definitiv.',
      confirmLabel: 'Șterge',
      danger: true,
    });
    if (!ok) return;
    try {
      await apiCommand('delete_personal_task', { id });
      fetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  
  const markRead = async (id: number) => {
    try { await apiCommand('mark_mention_read', { mention_id: id }); fetch(); }
    catch {  }
  };
  const markAllRead = async () => {
    try { await apiCommand('mark_all_mentions_read', {}); toast.success('Toate marcate citite'); fetch(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const unread = mentions.filter(m => !m.is_read).length;

  
  const todayIso = new Date().toISOString().slice(0, 10);
  const weekMs = Date.now() + 7 * 86_400_000;
  const openCount = tasks.filter(t => t.status !== 'done').length;
  const dueTodayCount = tasks.filter(t => t.status !== 'done' && (t.due_date || '').slice(0, 10) === todayIso).length;
  const dueWeekCount = tasks.filter(t => t.status !== 'done' && t.due_date && (t.due_date.slice(0, 10) >= todayIso) && new Date(t.due_date).getTime() <= weekMs).length;
  const delegatedOpen = delegated.filter(t => t.status !== 'done').length;

  
  const mainTab = tab === 'mentions' ? 'tasks' : tab;

  
  const q = search.trim().toLowerCase();
  const matchesSearch = (t: Task) =>
    !q ||
    t.title.toLowerCase().includes(q) ||
    (t.description || '').toLowerCase().includes(q) ||
    (t.instructions || '').toLowerCase().includes(q) ||
    (t.notes || '').toLowerCase().includes(q) ||
    (t.user_name || '').toLowerCase().includes(q) ||
    (t.assigned_by_name || '').toLowerCase().includes(q);

  const visibleOwn = (showDone ? tasks : tasks.filter(t => t.status !== 'done')).filter(matchesSearch);
  const visibleDelegated = delegated.filter(t => showDone || t.status !== 'done').filter(matchesSearch);

  return (
    <Page fit>
      <Page.Body fit maxWidth="wide" padding="comfortable">

        {


}
        <div className="enter-up shrink-0 pb-4 border-b border-line/60" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            {}
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                <CheckSquare className="h-5 w-5 text-accent" />
              </span>
              <div className="min-w-0">
                {/* Eyebrow removed — breadcrumb already shows "Personal". */}
                <h1 className="text-pm-lg font-semibold text-content-primary leading-tight truncate">Task-urile mele</h1>
                <p className="mt-0.5 text-pm-sm text-content-muted">TODO personal, task-uri delegate și mențiuni</p>
              </div>
            </div>

            {}
            <div className="min-w-0 overflow-x-auto">
              <Tabs
                variant="segmented"
                activeId={mainTab}
                onChange={(id) => setTab(id as 'tasks' | 'delegated' | 'statusuri')}
                tabs={[
                  { id: 'tasks', label: 'Ale mele', count: openCount },
                  { id: 'delegated', label: 'Delegate', count: delegatedOpen },
                  { id: 'statusuri', label: 'Statusuri', icon: <Inbox className="h-3.5 w-3.5" />, count: reviewBuckets.total || undefined },
                ]}
              />
            </div>

            {}
            <div className="shrink-0">
              <Button size="md" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Task nou
              </Button>
            </div>
          </div>

          {}
          {(mainTab === 'tasks' || mainTab === 'delegated') && (
            <div className="mt-4 pt-4 border-t border-line/60 flex flex-wrap items-center gap-3">
              <FilterBar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Caută în task-uri…"
              >
                <label className="text-pm-xs inline-flex items-center gap-2 text-content-muted cursor-pointer transition-smooth duration-150 hover:text-content-primary">
                  <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} className="accent-accent" />
                  Arată terminate
                </label>
              </FilterBar>
            </div>
          )}
        </div>

        {

}
        <div className="enter-up shrink-0" style={{ animationDelay: '70ms' }}>
          <Page.Kpis cols={4}>
            <KpiCard label="Deschise"         value={openCount}     icon={ListTodo} iconColor="text-accent" />
            <KpiCard label="Scadente azi"     value={dueTodayCount} icon={Calendar} iconColor={dueTodayCount > 0 ? 'text-status-red' : 'text-status-green'} hint={dueTodayCount > 0 ? 'necesită atenție' : 'nimic urgent'} />
            <KpiCard label="Săptămâna asta"   value={dueWeekCount}  icon={Clock}    iconColor="text-status-amber" />
            <KpiCard label="Delegate de mine" value={delegatedOpen} icon={UserPlus} iconColor="text-status-purple" />
          </Page.Kpis>
        </div>

        {

}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-0">

          {}
          <aside className="xl:col-span-4 enter-up min-h-0 flex" style={{ animationDelay: '140ms' }}>
            <GlassCard size="regular" className="!p-0 overflow-hidden flex flex-col min-h-0 w-full">
              <div className="shrink-0 flex items-center justify-between gap-2 px-5 pt-5 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <AtSign className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">Mențiuni recente</span>
                  {unread > 0 && <span className="text-pm-2xs font-bold tabular-nums text-status-amber">{unread}</span>}
                </div>
                {unread > 0 && <button onClick={markAllRead} className="text-pm-xs text-accent rounded transition-smooth duration-150 hover:underline focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-[0.98] shrink-0">Toate citite</button>}
              </div>
              <div className="density-compact px-5 pb-5 flex-1 min-h-0 overflow-y-auto">
                {loading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={56} rounded="lg" />)}</div>
                ) : mentions.length === 0 ? (
                  <EmptyState icon={AtSign} title="Nicio mențiune" description="Aici apar mențiunile (@) și task-urile delegate ție." />
                ) : (
                  <div key={`mentions-${mentions.length}-${unread}`} className="space-y-2 stagger-in">
                    {mentions.map(m => {
                      const isTaskAssignment = m.source_type === 'personal_task';
                      const SourceIcon = isTaskAssignment ? UserPlus : AtSign;
                      const sourceLabel = isTaskAssignment ? `Task delegat #${m.source_id}` : `${m.source_type} #${m.source_id}`;
                      const headerLabel = isTaskAssignment ? `${m.actor_name || 'Cineva'} ți-a delegat un task` : (m.actor_name || 'Cineva');
                      return (
                        <div key={m.id} className={`glass-surface rounded-lg p-3 transition-smooth duration-150 ${m.is_read ? 'opacity-60' : 'border-accent/30'}`}>
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-pm-sm font-semibold text-content-primary flex items-center gap-1.5 min-w-0">
                              <SourceIcon className={`h-3 w-3 shrink-0 ${isTaskAssignment ? 'text-status-purple' : 'text-accent'}`} />
                              <span className="truncate">{headerLabel}</span>
                            </span>
                            <span className="text-pm-2xs text-content-muted shrink-0">{formatDateTimeRo(m.created_at)}</span>
                          </div>
                          <p className="text-pm-sm text-content-secondary whitespace-pre-wrap">{m.snippet}</p>
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <span className="text-pm-2xs text-content-muted min-w-0 truncate">{sourceLabel}</span>
                            {!m.is_read && <button onClick={() => markRead(m.id)} className="text-pm-2xs text-accent rounded transition-smooth duration-150 hover:underline focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-[0.98] shrink-0">Marchează citit</button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </GlassCard>
          </aside>

          {}
          <section className="xl:col-span-8 enter-up min-w-0 min-h-0 flex" style={{ animationDelay: '200ms' }}>
            <GlassCard size="regular" className="!p-0 overflow-hidden flex flex-col min-h-0 w-full">
              <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-line/40">
                <h2 className="text-pm-md font-semibold text-content-primary">
                  {mainTab === 'tasks' ? 'Ale mele' : mainTab === 'delegated' ? 'Delegate de mine' : 'Statusuri'}
                </h2>
                {(mainTab === 'tasks' || mainTab === 'delegated') && (
                  <p className="text-pm-xs text-content-muted shrink-0">
                    {(mainTab === 'tasks' ? visibleOwn.length : visibleDelegated.length)}
                    {' '}
                    {((mainTab === 'tasks' ? visibleOwn.length : visibleDelegated.length) === 1 ? 'task' : 'task-uri')}
                    {q ? ` găsite pentru „${search}"` : ''}
                  </p>
                )}
              </div>
              <div key={mainTab} className="density-compact px-5 py-5 flex-1 min-h-0 overflow-y-auto enter-up">
                {loading ? (
                  <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={64} rounded="lg" />)}</div>
                ) : mainTab === 'tasks' ? (
                  visibleOwn.length === 0 ? (
                    <EmptyState icon={CheckSquare} title={q ? 'Niciun rezultat' : 'Niciun task activ'} description={q ? 'Încearcă alt termen de căutare.' : 'Adaugă un task nou ca să începi.'} />
                  ) : (
                    <div key={`own-${q}-${showDone}`} className="space-y-2 stagger-in">
                      {visibleOwn.map(t => (
                        <TaskCard key={t.id} task={t} canEdit selected={infoTask?.id === t.id && infoOpen}
                          onToggle={() => quickToggle(t)} onInfo={() => void openInfo(t)}
                          onEdit={() => openEdit(t)} onDelete={() => remove(t.id)} />
                      ))}
                    </div>
                  )
                ) : mainTab === 'delegated' ? (
                  visibleDelegated.length === 0 ? (
                    <EmptyState icon={UserPlus} title={q ? 'Niciun rezultat' : 'Nu ai delegat task-uri'} description={q ? 'Încearcă alt termen de căutare.' : 'Creează un task și asignează-l cuiva.'} />
                  ) : (
                    <div key={`deleg-${q}-${showDone}`} className="space-y-2 stagger-in">
                      {visibleDelegated.map(t => (
                        <TaskCard key={t.id} task={t} canEdit showAssignee selected={infoTask?.id === t.id && infoOpen}
                          onInfo={() => void openInfo(t)} onEdit={() => openEdit(t)} onDelete={() => remove(t.id)} />
                      ))}
                    </div>
                  )
                ) : (
                  <StatusuriTab buckets={reviewBuckets} onReview={openReview} />
                )}
              </div>
            </GlassCard>
          </section>
        </div>
      </Page.Body>

      {}
      {editorOpen && (
        <TaskEditorModal
          mode={editorMode}
          draft={editorDraft}
          setDraft={setEditorDraft}
          users={users}
          canAssign={canAssign}
          currentUserId={user?.id}
          onClose={closeEditor}
          onSave={saveEditor}
        />
      )}

      {}
      {infoOpen && infoTask && (
        <TaskInfoModal
          task={infoTask}
          completionNote={completionNote}
          setCompletionNote={setCompletionNote}
          completionStatus={completionStatus}
          setCompletionStatus={setCompletionStatus}
          onClose={closeInfo}
          onComplete={completeTask}
          onReopen={reopenTask}
          onAskClarification={() => setClarifyOpen(true)}
          canEdit={infoTask.user_id === user?.id || infoTask.assigned_by_user_id === user?.id}
          isAssignee={infoTask.user_id === user?.id && infoTask.assigned_by_user_id !== null}
        />
      )}

      {}
      {reviewTask && (
        <ReviewModal
          task={reviewTask}
          users={users.filter(u => u.id !== reviewTask.user_id)}
          note={reviewNote}
          setNote={setReviewNote}
          reassignTo={reviewReassignTo}
          setReassignTo={setReviewReassignTo}
          onClose={closeReview}
          onConfirm={confirmResolution}
          onSendBack={() => sendBack()}
          onReassign={() => sendBack(Number(reviewReassignTo))}
        />
      )}

      {}
      {clarifyOpen && infoTask && (
        <ClarificationModal
          task={infoTask}
          text={clarifyText}
          setText={setClarifyText}
          onClose={() => { setClarifyOpen(false); setClarifyText(''); }}
          onSubmit={submitClarification}
        />
      )}
    </Page>
  );
}






function KpiMini({ icon: Icon, label, value, warn }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; warn?: boolean;
}) {
  return (
    <GlassCard size="compact" className="flex items-center gap-3 !p-5">
      <span className="h-11 w-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted truncate">{label}</p>
        <span className={`mt-0.5 block text-2xl font-semibold tabular-nums leading-none ${warn ? 'text-status-red' : 'text-content-primary'}`}>{value}</span>
      </div>
    </GlassCard>
  );
}


void KpiMini;






function TaskCard({
  task, canEdit = false, showAssignee = false, selected = false,
  onToggle, onInfo, onEdit, onDelete,
}: {
  task: Task; canEdit?: boolean; showAssignee?: boolean; selected?: boolean;
  onToggle?: () => void; onInfo?: () => void; onEdit?: () => void; onDelete?: () => void;
}) {
  const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const completion = task.completion_status
    ? { label: COMPLETION_STATUS_LABEL[task.completion_status], tone: COMPLETION_STATUS_TONE[task.completion_status] }
    : null;
  return (
    <div
      style={{ viewTransitionName: selected ? vtName('task', task.id) : undefined }}
      className={`group glass-surface rounded-lg hover-lift transition-smooth duration-150 p-3 flex items-start gap-3 ${selected ? 'vt-morph ring-1 ring-accent/40' : ''} ${
      task.status === 'done'
        ? (task.completion_status === 'unresolved' ? 'border-status-red/40 opacity-80'
          : task.completion_status === 'needs_clarification' ? 'border-status-amber/40 opacity-80'
          : 'opacity-50')
        : overdue ? 'border-status-red/40' : 'border-line'
    }`}>
      {onToggle && (
        <input type="checkbox" checked={task.status === 'done'} onChange={onToggle} className="mt-0.5 accent-accent cursor-pointer" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-pm-base text-content-primary truncate ${task.status === 'done' && task.completion_status === 'resolved' ? 'line-through' : ''}`}>
          {task.title}
        </p>
        {task.description && <p className="text-pm-sm text-content-muted mt-0.5 truncate">{task.description}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <StatusBadge tone={PRIORITY_TONE[task.priority]} label={task.priority} size="xs" />
          {task.due_date && (
            <span className={`text-pm-2xs flex items-center gap-1 ${overdue ? 'text-status-red font-bold' : 'text-content-muted'}`}>
              <Clock className="h-3 w-3" /> {task.due_date}
            </span>
          )}
          {task.project_name && <span className="text-pm-2xs text-content-muted">• {task.project_name}</span>}
          <span className="text-pm-2xs text-content-muted">• {STATUS_LABEL[task.status]}</span>
          {completion && (
            <StatusBadge tone={completion.tone} label={completion.label} size="xs" />
          )}
          {task.assigned_by_name && (
            <span className="text-pm-2xs px-1.5 py-0.5 rounded-md bg-accent/15 text-accent inline-flex items-center gap-1 max-w-[12rem] min-w-0">
              <UserPlus className="h-2.5 w-2.5 shrink-0" /> <span className="truncate">de la {task.assigned_by_name}</span>
            </span>
          )}
          {showAssignee && task.user_name && (
            <span className="text-pm-2xs px-1.5 py-0.5 rounded-md bg-status-blue/15 text-status-blue inline-flex items-center gap-1 max-w-[12rem] min-w-0">
              <UserPlus className="h-2.5 w-2.5 shrink-0" /> <span className="truncate">către {task.user_name}</span>
            </span>
          )}
          {

}
          {task.completed_by_name && task.completed_by_user_id !== task.user_id && (
            <span className="text-pm-2xs text-content-muted">
              ✓ bifat de {task.completed_by_name}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
        {onInfo && (
          <IconButton intent="primary" size="sm" onClick={onInfo} title="Detalii" aria-label="Detalii">
            <Info />
          </IconButton>
        )}
        {canEdit && onEdit && (
          <IconButton intent="primary" size="sm" onClick={onEdit} title="Editează" aria-label="Editează">
            <Edit2 />
          </IconButton>
        )}
        {onDelete && (
          <IconButton intent="danger" size="sm" onClick={onDelete} title="Șterge" aria-label="Șterge">
            <Trash2 />
          </IconButton>
        )}
      </div>
    </div>
  );
}





function TaskEditorModal({
  mode, draft, setDraft, users, canAssign, currentUserId, onClose, onSave,
}: {
  mode: 'create' | 'edit';
  draft: Partial<Task> & { assignee_id?: number | null };
  setDraft: (v: any) => void;
  users: UserItem[];
  canAssign: boolean;
  currentUserId: number | undefined;
  onClose: () => void;
  onSave: () => void;
}) {
  const set = <K extends string>(key: K, value: any) =>
    setDraft((prev: any) => ({ ...prev, [key]: value }));
  const isDelegating = canAssign && draft.assignee_id && Number(draft.assignee_id) !== currentUserId;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 anim-fade-in" onClick={onClose}>
      <div className="bg-surface-secondary rounded-2xl border border-line shadow-[var(--elevation-4)] w-full max-w-2xl max-h-[90vh] overflow-y-auto anim-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line">
          <h3 className="text-pm-md font-semibold text-content-primary min-w-0 truncate">
            {mode === 'create' ? (isDelegating ? 'Task delegat nou' : 'Task nou') : 'Editează task'}
          </h3>
          <button onClick={onClose} aria-label="Închide" className="shrink-0 p-1.5 -mr-1 rounded-lg text-content-muted transition-smooth duration-150 hover:text-content-primary hover:bg-surface-tertiary focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-95"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {}
          <div>
            <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">Titlu *</label>
            <input
              autoFocus
              value={draft.title || ''}
              onChange={e => set('title', e.target.value)}
              placeholder="Ce trebuie făcut?"
              className="w-full h-9 rounded-xl border border-line bg-surface-primary px-3 text-pm-base text-content-primary transition-smooth duration-150 focus:outline-none focus-visible:outline-none focus:shadow-[var(--ring-soft)] focus:border-accent"
            />
          </div>

          {}
          <div>
            <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">Descriere scurtă</label>
            <textarea
              value={draft.description || ''}
              onChange={e => set('description', e.target.value)}
              placeholder="Sumar 1-2 propoziții"
              rows={2}
              className="w-full rounded-xl border border-line bg-surface-primary px-3 py-2 text-pm-base text-content-primary resize-none transition-smooth duration-150 focus:outline-none focus-visible:outline-none focus:shadow-[var(--ring-soft)] focus:border-accent"
            />
          </div>

          {}
          <div>
            <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Instrucțiuni detaliate
            </label>
            <textarea
              value={draft.instructions || ''}
              onChange={e => set('instructions', e.target.value)}
              placeholder="Pași concreți, criterii de acceptare, link-uri către documente, etc."
              rows={4}
              className="w-full rounded-xl border border-line bg-surface-primary px-3 py-2 text-pm-base text-content-primary resize-none transition-smooth duration-150 focus:outline-none focus-visible:outline-none focus:shadow-[var(--ring-soft)] focus:border-accent"
            />
          </div>

          {}
          <div>
            <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1 flex items-center gap-1">
              <Layers className="h-3 w-3" /> Note suplimentare
            </label>
            <textarea
              value={draft.notes || ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="Context, observații, referințe"
              rows={2}
              className="w-full rounded-xl border border-line bg-surface-primary px-3 py-2 text-pm-base text-content-primary resize-none transition-smooth duration-150 focus:outline-none focus-visible:outline-none focus:shadow-[var(--ring-soft)] focus:border-accent"
            />
          </div>

          {}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {canAssign && mode === 'create' && (
              <div>
                <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">Asignează</label>
                <select
                  value={draft.assignee_id ?? ''}
                  onChange={e => set('assignee_id', e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-9 rounded-xl border border-line bg-surface-primary px-2 text-pm-base text-content-primary transition-smooth duration-150 focus:outline-none focus-visible:outline-none focus:shadow-[var(--ring-soft)] focus:border-accent"
                >
                  <option value="">— Pentru mine —</option>
                  {users.filter(u => u.id !== currentUserId).map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">Prioritate</label>
              <select
                value={draft.priority || 'normal'}
                onChange={e => set('priority', e.target.value)}
                className="w-full h-9 rounded-xl border border-line bg-surface-primary px-2 text-pm-base text-content-primary transition-smooth duration-150 focus:outline-none focus-visible:outline-none focus:shadow-[var(--ring-soft)] focus:border-accent"
              >
                <option value="low">Scăzută</option>
                <option value="normal">Normală</option>
                <option value="high">Înaltă</option>
              </select>
            </div>
            <div>
              <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Deadline
              </label>
              <input
                type="date"
                value={draft.due_date || ''}
                onChange={e => set('due_date', e.target.value || null)}
                className="w-full h-9 rounded-xl border border-line bg-surface-primary px-2 text-pm-base text-content-primary transition-smooth duration-150 focus:outline-none focus-visible:outline-none focus:shadow-[var(--ring-soft)] focus:border-accent"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-line flex justify-end gap-2 bg-surface-primary/40">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Anulează
          </Button>
          <Button size="sm" onClick={onSave}>
            {mode === 'create' ? (isDelegating ? 'Deleagă' : 'Creează') : 'Salvează'}
          </Button>
        </div>
      </div>
    </div>
  );
}






function TaskInfoModal({
  task, completionNote, setCompletionNote, completionStatus, setCompletionStatus,
  onClose, onComplete, onReopen, onAskClarification, canEdit, isAssignee,
}: {
  task: Task;
  completionNote: string;
  setCompletionNote: (v: string) => void;
  completionStatus: 'resolved' | 'unresolved' | 'needs_clarification';
  setCompletionStatus: (v: 'resolved' | 'unresolved' | 'needs_clarification') => void;
  onClose: () => void;
  onComplete: (status: 'resolved' | 'unresolved' | 'needs_clarification') => void;
  onReopen: () => void;
  onAskClarification: () => void;
  canEdit: boolean;
  

  isAssignee: boolean;
}) {
  const isDone = task.status === 'done';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 anim-fade-in" onClick={onClose}>
      <div className="bg-surface-secondary rounded-2xl border border-line shadow-[var(--elevation-4)] w-full max-w-2xl max-h-[90vh] overflow-y-auto anim-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line">
          <h3 className="text-pm-md font-semibold text-content-primary flex items-center gap-2 min-w-0">
            <Info className="h-4 w-4 text-accent shrink-0" /> <span className="truncate">Detalii task</span>
          </h3>
          <button onClick={onClose} aria-label="Închide" className="shrink-0 p-1.5 -mr-1 rounded-lg text-content-muted transition-smooth duration-150 hover:text-content-primary hover:bg-surface-tertiary focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-95"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {}
          <div
            className="vt-morph"
            style={{ viewTransitionName: vtName('task', task.id) }}
          >
            <p className="text-base font-semibold text-content-primary">{task.title}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge tone={PRIORITY_TONE[task.priority]} label={task.priority} size="xs" />
              <span className="text-pm-2xs text-content-muted">• {STATUS_LABEL[task.status]}</span>
              {task.due_date && <span className="text-pm-2xs text-content-muted flex items-center gap-1"><Clock className="h-3 w-3" /> Termen: {task.due_date}</span>}
              {task.assigned_by_name && (
                <span className="text-pm-2xs px-1.5 py-0.5 rounded-md bg-accent/15 text-accent inline-flex items-center gap-1">
                  <UserPlus className="h-2.5 w-2.5 shrink-0" /> delegat de {task.assigned_by_name}
                </span>
              )}
              {task.user_name && (
                <span className="text-pm-2xs px-1.5 py-0.5 rounded-md bg-status-blue/15 text-status-blue inline-flex items-center gap-1">
                  <UserPlus className="h-2.5 w-2.5 shrink-0" /> către {task.user_name}
                </span>
              )}
            </div>
          </div>

          {}
          {task.description && (
            <div>
              <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">Descriere</p>
              <p className="text-pm-base text-content-secondary whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {}
          {task.instructions && (
            <div>
              <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Instrucțiuni
              </p>
              <div className="text-pm-base text-content-secondary whitespace-pre-wrap bg-surface-primary/40 border border-line/60 rounded-lg p-3">
                {task.instructions}
              </div>
            </div>
          )}

          {}
          {task.notes && (
            <div>
              <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1 flex items-center gap-1">
                <Layers className="h-3 w-3" /> Note
              </p>
              <p className="text-pm-base text-content-secondary whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}

          {}
          {isDone && (
            <div className={`border-l-4 rounded-lg p-3 ${
              task.completion_status === 'unresolved' ? 'border-l-status-red bg-status-red/5'
              : task.completion_status === 'needs_clarification' ? 'border-l-status-amber bg-status-amber/5'
              : 'border-l-status-green bg-status-green/5'
            }`}>
              <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">Finalizare</p>
              <p className="text-pm-base text-content-primary">
                {task.completion_status && COMPLETION_STATUS_LABEL[task.completion_status]}
                {task.completed_by_name && <span className="text-content-muted"> · de {task.completed_by_name}</span>}
                {task.completed_at && <span className="text-content-muted"> · {formatDateTimeRo(task.completed_at)}</span>}
              </p>
              {task.completion_note && (
                <p className="text-pm-base text-content-secondary mt-2 whitespace-pre-wrap">"{task.completion_note}"</p>
              )}
            </div>
          )}

          {}
          {!isDone && canEdit && (
            <div className="border-t border-line pt-4">
              {

}
              {isAssignee && (
                <div className="mb-3 bg-status-blue/5 border-l-2 border-status-blue/40 rounded-lg p-3">
                  <p className="text-pm-xs text-content-secondary mb-2">
                    Nu e clar ce ai de făcut? Cere clarificări delegatorului — task-ul rămâne deschis.
                  </p>
                  <button
                    type="button"
                    onClick={onAskClarification}
                    className="h-8 px-3 bg-status-blue/15 text-status-blue text-pm-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-smooth duration-150 hover:bg-status-blue/25 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-[0.98]"
                  >
                    <HelpCircle className="h-3.5 w-3.5" /> Cere clarificări
                  </button>
                </div>
              )}

              <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-2">Marchează ca finalizat</p>
              <textarea
                value={completionNote}
                onChange={e => setCompletionNote(e.target.value)}
                placeholder="Notă opțională — ce s-a făcut, ce a rămas, etc."
                rows={3}
                className="w-full rounded-xl border border-line bg-surface-primary px-3 py-2 text-pm-base text-content-primary resize-none transition-smooth duration-150 focus:outline-none focus-visible:outline-none focus:shadow-[var(--ring-soft)] focus:border-accent"
              />
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => { setCompletionStatus('resolved'); onComplete('resolved'); }}
                  className="h-8 px-3 bg-status-green/15 text-status-green text-pm-sm font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-smooth duration-150 hover:bg-status-green/25 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-[0.98]"
                >
                  <CheckSquare className="h-3.5 w-3.5" /> Rezolvat
                </button>
                <button
                  type="button"
                  onClick={() => { setCompletionStatus('needs_clarification'); onComplete('needs_clarification'); }}
                  className="h-8 px-3 bg-status-amber/15 text-status-amber text-pm-sm font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-smooth duration-150 hover:bg-status-amber/25 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-[0.98]"
                >
                  <HelpCircle className="h-3.5 w-3.5" /> Necesită clarificări
                </button>
                <button
                  type="button"
                  onClick={() => { setCompletionStatus('unresolved'); onComplete('unresolved'); }}
                  className="h-8 px-3 bg-status-red/15 text-status-red text-pm-sm font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-smooth duration-150 hover:bg-status-red/25 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-[0.98]"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Nerezolvat
                </button>
              </div>
              {
}
              <span className="hidden">{completionStatus}</span>
            </div>
          )}

          {}
          {isDone && canEdit && (
            <div className="border-t border-line pt-4">
              <Button variant="outline" size="sm" onClick={onReopen}>
                Redeschide task-ul
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}






function StatusuriTab({
  buckets, onReview,
}: {
  buckets: {
    resolved: Task[]; needs_clarification: Task[]; unresolved: Task[];
    waiting_response: Task[]; total: number;
  };
  onReview: (t: Task) => void;
}) {
  if (buckets.total === 0) {
    return (
      <EmptyState
        icon={ListTodo}
        title="Niciun task care așteaptă atenția cuiva"
        description="Aici apar task-urile delegate de tine pe care asignații le-au finalizat și aștepți să le confirmi/trimiți înapoi, plus task-urile la care ești asignat dar aștepți răspuns de la delegator."
      />
    );
  }
  
  const delegatorSections: Array<{
    key: 'needs_clarification' | 'unresolved' | 'resolved';
    title: string;
    description: string;
    items: Task[];
    tone: string;
  }> = [
    {
      key: 'needs_clarification',
      title: `Necesită clarificări — pentru tine (${buckets.needs_clarification.length})`,
      description: 'Asignatul a marcat task-ul ca având nevoie de informații suplimentare. Răspunde și trimite-i-l înapoi.',
      items: buckets.needs_clarification,
      tone: 'border-l-status-amber',
    },
    {
      key: 'unresolved',
      title: `Nerezolvate — pentru tine (${buckets.unresolved.length})`,
      description: 'Asignatul nu a putut rezolva. Acceptă ca atare, trimite-l înapoi cu instrucțiuni noi sau reasignează.',
      items: buckets.unresolved,
      tone: 'border-l-status-red',
    },
    {
      key: 'resolved',
      title: `Rezolvate — pentru tine (${buckets.resolved.length})`,
      description: 'Asignatul a marcat task-ul ca finalizat. Confirmă pentru a-l închide sau trimite-l înapoi cu observații.',
      items: buckets.resolved,
      tone: 'border-l-status-green',
    },
  ];
  return (
    <div className="space-y-5 stagger-in">
      {}
      {delegatorSections.map(s => s.items.length > 0 && (
        <div key={s.key} className={`bg-surface-primary border-l-2 ${s.tone} pl-3`}>
          <p className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">{s.title}</p>
          <p className="text-pm-xs text-content-muted mt-0.5 mb-2">{s.description}</p>
          <div className="space-y-2">
            {s.items.map(t => (
              <div key={t.id} className="glass-surface rounded-lg p-3 flex items-start gap-3 transition-smooth duration-150">
                <div className="flex-1 min-w-0">
                  <p className="text-pm-base font-medium text-content-primary truncate">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {t.user_name && (
                      <span className="text-pm-2xs px-1.5 py-0.5 rounded-md bg-status-blue/15 text-status-blue">
                        finalizat de {t.completed_by_name || t.user_name}
                      </span>
                    )}
                    {t.completed_at && (
                      <span className="text-pm-2xs text-content-muted">
                        {formatDateTimeRo(t.completed_at)}
                      </span>
                    )}
                    {t.completion_status && COMPLETION_STATUS_TONE[t.completion_status] && (
                      <StatusBadge tone={COMPLETION_STATUS_TONE[t.completion_status]} label={COMPLETION_STATUS_LABEL[t.completion_status]} size="xs" />
                    )}
                  </div>
                  {t.completion_note && (
                    <p className="text-pm-xs text-content-secondary mt-2 italic">"{t.completion_note}"</p>
                  )}
                </div>
                <button
                  onClick={() => onReview(t)}
                  className="shrink-0 h-8 px-3 bg-accent text-[var(--color-on-accent)] text-pm-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-smooth duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-[0.98]"
                >
                  <Reply className="h-3.5 w-3.5" /> Review
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {}
      {buckets.waiting_response.length > 0 && (
        <div className="bg-surface-primary border-l-2 border-l-status-blue pl-3">
          <p className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">
            Aștepți răspuns ({buckets.waiting_response.length})
          </p>
          <p className="text-pm-xs text-content-muted mt-0.5 mb-2">
            Task-uri pe care le-ai marcat finalizate sau pentru care ai cerut clarificări — aștepți decizia delegatorului.
          </p>
          <div className="space-y-2">
            {buckets.waiting_response.map(t => (
              <div key={t.id} className="glass-surface rounded-lg p-3 transition-smooth duration-150">
                <p className="text-pm-base font-medium text-content-primary truncate">{t.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {t.assigned_by_name && (
                    <span className="text-pm-2xs px-1.5 py-0.5 rounded-md bg-accent/15 text-accent">
                      delegat de {t.assigned_by_name}
                    </span>
                  )}
                  {t.clarification_pending && (
                    <span className="text-pm-2xs px-1.5 py-0.5 rounded-md bg-status-blue/15 text-status-blue">
                      clarificare cerută
                    </span>
                  )}
                  {t.completion_status && COMPLETION_STATUS_TONE[t.completion_status] && (
                    <StatusBadge tone={COMPLETION_STATUS_TONE[t.completion_status]} label={`marcat: ${COMPLETION_STATUS_LABEL[t.completion_status]}`} size="xs" />
                  )}
                  {t.completed_at && (
                    <span className="text-pm-2xs text-content-muted">
                      {formatDateTimeRo(t.completed_at)}
                    </span>
                  )}
                </div>
                {t.completion_note && (
                  <p className="text-pm-xs text-content-secondary mt-2 italic">"{t.completion_note}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}





function ReviewModal({
  task, users, note, setNote, reassignTo, setReassignTo,
  onClose, onConfirm, onSendBack, onReassign,
}: {
  task: Task;
  users: UserItem[];
  note: string;
  setNote: (v: string) => void;
  reassignTo: number | '';
  setReassignTo: (v: number | '') => void;
  onClose: () => void;
  onConfirm: () => void;
  onSendBack: () => void;
  onReassign: () => void;
}) {
  const status = task.completion_status || 'resolved';
  const statusLabel = COMPLETION_STATUS_LABEL[status] || 'Finalizat';
  const promptText =
    status === 'resolved' ? 'Confirmă rezultatul sau trimite-l înapoi cu observații.'
    : status === 'needs_clarification' ? 'Răspunde la întrebare și trimite task-ul înapoi.'
    : 'Acceptă-l ca nerezolvat sau reasignează altcuiva.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 anim-fade-in" onClick={onClose}>
      <div className="bg-surface-secondary rounded-2xl border border-line shadow-[var(--elevation-4)] w-full max-w-xl max-h-[90vh] overflow-y-auto anim-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line">
          <h3 className="text-pm-md font-semibold text-content-primary flex items-center gap-2 min-w-0">
            <Inbox className="h-4 w-4 text-accent shrink-0" /> <span className="truncate">Review status — {statusLabel}</span>
          </h3>
          <button onClick={onClose} aria-label="Închide" className="shrink-0 p-1.5 -mr-1 rounded-lg text-content-muted transition-smooth duration-150 hover:text-content-primary hover:bg-surface-tertiary focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-95"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-base font-semibold text-content-primary">{task.title}</p>
            <p className="text-pm-xs text-content-muted mt-0.5">{promptText}</p>
          </div>

          {task.completion_note && (
            <div className="bg-surface-primary/40 border border-line/60 rounded-lg p-3">
              <p className="text-pm-2xs uppercase tracking-wide text-content-muted mb-1">Notă de la asignat</p>
              <p className="text-pm-base text-content-secondary whitespace-pre-wrap">"{task.completion_note}"</p>
            </div>
          )}

          <div>
            <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">
              {status === 'needs_clarification' ? 'Răspuns / clarificări' : 'Notă pentru asignat'}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ce vrei să-i transmiți..."
              rows={4}
              className="w-full rounded-xl border border-line bg-surface-primary px-3 py-2 text-pm-base text-content-primary resize-none transition-smooth duration-150 focus:outline-none focus-visible:outline-none focus:shadow-[var(--ring-soft)] focus:border-accent"
            />
          </div>

          {status === 'unresolved' && (
            <div>
              <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">Reasignează altcuiva</label>
              <select
                value={reassignTo}
                onChange={e => setReassignTo(e.target.value ? Number(e.target.value) : '')}
                className="w-full h-9 rounded-xl border border-line bg-surface-primary px-2 text-pm-base text-content-primary transition-smooth duration-150 focus:outline-none focus-visible:outline-none focus:shadow-[var(--ring-soft)] focus:border-accent"
              >
                <option value="">— păstrează același asignat —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-line flex flex-wrap items-center justify-end gap-2 bg-surface-primary/40">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Anulează
          </Button>
          {status === 'unresolved' ? (
            <>
              {reassignTo ? (
                <Button size="sm" onClick={onReassign}>
                  <UserPlus className="h-3.5 w-3.5" /> Reasignează
                </Button>
              ) : (
                <Button variant="danger" size="sm" onClick={onConfirm}>
                  Acceptă ca nerezolvat
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={onSendBack}>
                <Reply className="h-3.5 w-3.5" /> Trimite înapoi
              </Button>
              <Button variant="success" size="sm" onClick={onConfirm}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirmă
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}





function ClarificationModal({
  task, text, setText, onClose, onSubmit,
}: {
  task: Task;
  text: string;
  setText: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 anim-fade-in" onClick={onClose}>
      <div className="bg-surface-secondary rounded-2xl border border-line shadow-[var(--elevation-4)] w-full max-w-lg anim-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line">
          <h3 className="text-pm-md font-semibold text-content-primary flex items-center gap-2 min-w-0">
            <HelpCircle className="h-4 w-4 text-status-blue shrink-0" /> <span className="truncate">Cere clarificări</span>
          </h3>
          <button onClick={onClose} aria-label="Închide" className="shrink-0 p-1.5 -mr-1 rounded-lg text-content-muted transition-smooth duration-150 hover:text-content-primary hover:bg-surface-tertiary focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-95"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-pm-xs text-content-muted">
            Trimite o întrebare către <strong>{task.assigned_by_name || 'delegator'}</strong>. Task-ul rămâne deschis.
          </p>
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Ce trebuie clarificat?"
            rows={4}
            className="w-full rounded-xl border border-line bg-surface-primary px-3 py-2 text-pm-base text-content-primary resize-none transition-smooth duration-150 focus:outline-none focus-visible:outline-none focus:shadow-[var(--ring-soft)] focus:border-accent"
          />
        </div>
        <div className="px-5 py-3 border-t border-line flex justify-end gap-2 bg-surface-primary/40">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Anulează
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={!text.trim()}>
            <Send className="h-3.5 w-3.5" /> Trimite
          </Button>
        </div>
      </div>
    </div>
  );
}
