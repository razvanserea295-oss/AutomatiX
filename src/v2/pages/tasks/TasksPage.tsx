import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Plus, Trash2, CheckCircle, Circle, AlertTriangle, Clock } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { formatDateRo } from '@/lib/format';
import { confirmDialog } from '@/components/ConfirmDialog';
import { Page, PageHeader, PageBody, PageToolbar, PageKpis } from '@/v2/components/app/Page';
import { KPICard } from '@/v2/analytics';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Card } from '@/v2/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/v2/components/ui/tabs';

interface Task {
  id: number; title: string; status: string; priority: string; due_date: string | null;
}

type Filter = 'all' | 'open' | 'done';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState('normal');

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<Task[]>('list_personal_tasks', { include_done: true })
      .then((d) => setTasks(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: tasks.length,
      open: tasks.filter((t) => t.status !== 'done').length,
      done: tasks.filter((t) => t.status === 'done').length,
      overdue: tasks.filter((t) => t.status !== 'done' && t.due_date && t.due_date < today).length,
    };
  }, [tasks]);

  const filtered = useMemo(() => {
    if (filter === 'open') return tasks.filter((t) => t.status !== 'done');
    if (filter === 'done') return tasks.filter((t) => t.status === 'done');
    return tasks;
  }, [tasks, filter]);

  const toggle = async (t: Task) => {
    const done = t.status !== 'done';
    try {
      await apiCommand('update_personal_task', {
        request: { id: t.id, status: done ? 'done' : 'open' },
      });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const create = async () => {
    if (!title.trim()) { toast.error('Titlul este obligatoriu'); return; }
    try {
      await apiCommand('create_personal_task', {
        request: { title: title.trim(), due_date: due || null, priority },
      });
      toast.success('Task creat');
      setOpen(false);
      setTitle('');
      setDue('');
      setPriority('normal');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const remove = async (t: Task) => {
    const ok = await confirmDialog({ title: 'Șterge task', body: t.title, danger: true });
    if (!ok) return;
    try {
      await apiCommand('delete_personal_task', { id: t.id });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Page fill>
      <PageHeader
        title="Task-uri"
        description="Task-uri personale"
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Task nou</Button>}
      />
      <PageBody>
        <PageKpis>
          <KPICard label="Total" value={kpis.total} icon={<Circle className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="De făcut" value={kpis.open} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Finalizate" value={kpis.done} icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Întârziate" value={kpis.overdue} icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} />
        </PageKpis>

        <PageToolbar>
          <Tabs>
            <TabsList>
              <TabsTrigger active={filter === 'all'} onClick={() => setFilter('all')}>Toate</TabsTrigger>
              <TabsTrigger active={filter === 'open'} onClick={() => setFilter('open')}>De făcut</TabsTrigger>
              <TabsTrigger active={filter === 'done'} onClick={() => setFilter('done')}>Finalizate</TabsTrigger>
            </TabsList>
          </Tabs>
        </PageToolbar>

        <AsyncContent loading={loading} error={null} empty={filtered.length === 0}>
          <Card className="v2-panel min-h-0 flex-1 divide-y shadow-none">
            {filtered.map((t) => {
              const overdue = t.status !== 'done' && t.due_date && t.due_date < today;
              return (
                <div key={t.id} className="density-list-item flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => void toggle(t)} className="shrink-0">
                    <Check className={`h-4 w-4 ${t.status === 'done' ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-medium text-[length:var(--density-fs-body)] ${t.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                      {t.title}
                    </p>
                    {t.due_date && (
                      <p className={`density-meta ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {overdue ? 'Depășit: ' : 'Termen: '}{formatDateRo(t.due_date)}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={t.priority} />
                  <Button size="sm" variant="ghost" onClick={() => void remove(t)} className="shrink-0">
                    <Trash2 className="h-4 w-4 text-destructive/60 hover:text-destructive" />
                  </Button>
                </div>
              );
            })}
          </Card>
        </AsyncContent>
      </PageBody>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Task nou</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Titlu *</Label>
              <Input placeholder="ce trebuie făcut…" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label>Termen</Label>
                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Prioritate</Label>
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="low">Scăzută</option>
                  <option value="normal">Normală</option>
                  <option value="high">Ridicată</option>
                  <option value="urgent">Urgentă</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
            <Button onClick={() => void create()}>Creează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
