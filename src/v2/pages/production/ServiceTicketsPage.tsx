import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { useClientStore } from '@/store/clientStore';
import { formatDateTimeRo } from '@/lib/format';
import { Page, PageHeader, PageBody, PageToolbar, PageSearch, PageKpis, PageSplit, PagePanel, DataTableCard } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatCard from '@/v2/components/app/StatCard';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/v2/components/ui/tabs';
import { Textarea } from '@/v2/components/ui/textarea';

type Filter = 'open' | 'all' | 'overdue';
type TicketStatus = 'open' | 'in_progress' | 'waiting_parts' | 'waiting_client' | 'resolved' | 'closed' | 'cancelled';
type Severity = 'critical' | 'high' | 'medium' | 'low';

interface Ticket {
  id: number;
  ticket_number: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  severity: Severity;
  client_name: string | null;
  station_name: string | null;
  assigned_user_name: string | null;
  is_overdue: boolean;
  created_at: string;
  comments?: { id: number; user_name: string | null; body: string; created_at: string }[];
}

interface Stats {
  open: number;
  in_progress: number;
  overdue: number;
  resolved_this_week: number;
}

interface Station { id: number; name: string }
interface UserItem { id: number; full_name: string }

const STATUS_OPTIONS: TicketStatus[] = [
  'open', 'in_progress', 'waiting_parts', 'waiting_client', 'resolved', 'closed', 'cancelled',
];

export default function ServiceTicketsPage() {
  const clients = useClientStore((s) => s.clients);
  const fetchClients = useClientStore((s) => s.fetchClients);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('open');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [comment, setComment] = useState('');

  const [stations, setStations] = useState<Station[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [form, setForm] = useState({
    title: '', description: '', severity: 'medium' as Severity,
    station_id: '', client_id: '', assigned_user_id: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiCommand<Ticket[]>('list_service_tickets', filter === 'open' ? { only_open: true } : {}),
      apiCommand<Stats>('get_service_ticket_stats'),
    ])
      .then(([ts, st]) => {
        let list = Array.isArray(ts) ? ts : [];
        if (filter === 'overdue') list = list.filter((t) => t.is_overdue);
        setTickets(list);
        setStats(st ?? null);
      })
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
    void fetchClients();
    apiCommand<Station[]>('get_all_stations').then((s) => setStations(Array.isArray(s) ? s : [])).catch(() => {});
    apiCommand<UserItem[]>('get_users').then((u) => setUsers(Array.isArray(u) ? u : [])).catch(() => {});
  }, [load, fetchClients]);

  const refreshSelected = async (id: number) => {
    try {
      const t = await apiCommand<Ticket>('get_service_ticket', { ticket_id: id });
      setSelected(t);
      setTickets((prev) => prev.map((x) => (x.id === id ? { ...x, ...t } : x)));
    } catch {
      toast.error('Nu s-a putut reîncărca tichetul');
    }
  };

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return tickets;
    return tickets.filter((t) =>
      [t.ticket_number, t.title, t.client_name, t.station_name]
        .some((v) => (v || '').toLowerCase().includes(needle)),
    );
  }, [tickets, search]);

  const create = async () => {
    if (!form.title.trim()) {
      toast.error('Titlul este obligatoriu');
      return;
    }
    try {
      const t = await apiCommand<Ticket>('create_service_ticket', {
        request: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          severity: form.severity,
          station_id: form.station_id ? Number(form.station_id) : null,
          client_id: form.client_id ? Number(form.client_id) : null,
          assigned_user_id: form.assigned_user_id ? Number(form.assigned_user_id) : null,
          reported_via: 'internal',
        },
      });
      toast.success('Tichet creat');
      setCreateOpen(false);
      setForm({ title: '', description: '', severity: 'medium', station_id: '', client_id: '', assigned_user_id: '' });
      load();
      setSelected(t);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const updateStatus = async (status: TicketStatus) => {
    if (!selected) return;
    try {
      await apiCommand('update_service_ticket', { request: { id: selected.id, status } });
      await refreshSelected(selected.id);
      load();
      toast.success('Status actualizat');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const addComment = async () => {
    if (!selected || !comment.trim()) return;
    try {
      await apiCommand('add_service_ticket_comment', { ticket_id: selected.id, body: comment.trim() });
      setComment('');
      await refreshSelected(selected.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const selectTicket = async (t: Ticket) => {
    setSelected(t);
    await refreshSelected(t.id);
  };

  return (
    <Page fill>
      <PageHeader
        title="Service"
        description={`${visible.length} tichete`}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />Tichet nou
          </Button>
        }
      />

      {stats && (
        <PageKpis>
          <StatCard label="Deschise" value={stats.open} animateValue />
          <StatCard label="În lucru" value={stats.in_progress} animateValue />
          <StatCard label="Întârziate" value={stats.overdue} animateValue />
          <StatCard label="Rezolvate săpt." value={stats.resolved_this_week} animateValue />
        </PageKpis>
      )}

      <PageToolbar>
        <Tabs className="mb-0">
          <TabsList>
            <TabsTrigger active={filter === 'open'} onClick={() => setFilter('open')}>Deschise</TabsTrigger>
            <TabsTrigger active={filter === 'overdue'} onClick={() => setFilter('overdue')}>Întârziate</TabsTrigger>
            <TabsTrigger active={filter === 'all'} onClick={() => setFilter('all')}>Toate</TabsTrigger>
          </TabsList>
        </Tabs>
        <PageSearch
          placeholder="Caută tichet…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </PageToolbar>

      <PageBody>
        <PageSplit variant="detail">
          <AsyncContent loading={loading} error={null} empty={visible.length === 0}>
            <DataTableCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nr.</TableHead>
                    <TableHead>Titlu</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Severitate</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody stagger>
                  {visible.map((t) => (
                    <TableRow
                      key={t.id}
                      className={`cursor-pointer ${selected?.id === t.id ? 'bg-muted/50' : ''}`}
                      onClick={() => void selectTicket(t)}
                    >
                      <TableCell>{t.ticket_number}</TableCell>
                      <TableCell className="font-medium">
                        {t.title}
                        {t.is_overdue && <span className="ml-2 text-xs text-destructive">SLA</span>}
                      </TableCell>
                      <TableCell>{t.client_name || '—'}</TableCell>
                      <TableCell><StatusBadge status={t.severity} /></TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableCard>
          </AsyncContent>

          <PagePanel scroll>
            <div className="space-y-2 p-3 text-sm">
              {!selected ? (
                <p className="text-muted-foreground">Selectează un tichet.</p>
              ) : (
                <>
                  <h3 className="font-semibold">{selected.ticket_number} — {selected.title}</h3>
                  {selected.description && <p className="text-muted-foreground">{selected.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={selected.severity} />
                    <StatusBadge status={selected.status} />
                  </div>
                  <p>Client: {selected.client_name || '—'}</p>
                  <p>Stație: {selected.station_name || '—'}</p>
                  <p>Responsabil: {selected.assigned_user_name || '—'}</p>
                  <p className="text-xs text-muted-foreground">Creat {formatDateTimeRo(selected.created_at)}</p>

                  <div className="grid gap-1.5">
                    <Label>Schimbă status</Label>
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={selected.status}
                      onChange={(e) => void updateStatus(e.target.value as TicketStatus)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 border-t pt-2">
                    <Label>Comentarii</Label>
                    {(selected.comments || []).map((c) => (
                      <div key={c.id} className="rounded border px-2 py-1 text-xs">
                        <p className="font-medium">{c.user_name}</p>
                        <p>{c.body}</p>
                        <p className="text-muted-foreground">{formatDateTimeRo(c.created_at)}</p>
                      </div>
                    ))}
                    <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Adaugă comentariu…" />
                    <Button size="sm" onClick={() => void addComment()}>Trimite</Button>
                  </div>
                </>
              )}
            </div>
          </PagePanel>
        </PageSplit>
      </PageBody>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Tichet service nou</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label>Titlu</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Descriere</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label>Severitate</Label>
                <select className="h-9 rounded-md border px-3 text-sm" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as Severity }))}>
                  <option value="low">Scăzută</option>
                  <option value="medium">Medie</option>
                  <option value="high">Ridicată</option>
                  <option value="critical">Critică</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Responsabil</Label>
                <select className="h-9 rounded-md border px-3 text-sm" value={form.assigned_user_id} onChange={(e) => setForm((f) => ({ ...f, assigned_user_id: e.target.value }))}>
                  <option value="">—</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label>Stație</Label>
                <select className="h-9 rounded-md border px-3 text-sm" value={form.station_id} onChange={(e) => setForm((f) => ({ ...f, station_id: e.target.value }))}>
                  <option value="">—</option>
                  {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Client</Label>
                <select className="h-9 rounded-md border px-3 text-sm" value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}>
                  <option value="">—</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Anulează</Button>
            <Button onClick={() => void create()}>Creează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
