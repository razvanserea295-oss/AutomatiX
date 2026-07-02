import { useEffect, useMemo, useState } from 'react';
import { Plus } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { useProjectStore } from '@/store/projectStore';
import { useClientStore } from '@/store/clientStore';
import { formatDateRo } from '@/lib/format';
import type { Project } from '@/core/types';
import { Page, PageHeader, PageBody, PageToolbar, PageSearch, DataTableCard } from '@/v2/components/app/Page';
import { KPICard, AnalyticsKpiStrip, DataTable, type DataTableColumn } from '@/v2/analytics';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/v2/components/ui/tabs';
import { FolderKanban, CheckCircle, Clock, XCircle } from '@/icons';

type StatusFilter = 'all' | 'active' | 'finalizat' | 'anulat';

const ACTIVE_STATUSES = ['activ', 'in_progres', 'in progres', 'asteptare', 'planificat'];

const projectColumns: DataTableColumn<Project>[] = [
  {
    id: 'name',
    header: 'Proiect',
    accessor: (p) => <span className="font-medium">{p.name}</span>,
    sortValue: (p) => p.name ?? '',
  },
  {
    id: 'client',
    header: 'Client',
    accessor: (p) => p.client_name || '—',
    sortValue: (p) => p.client_name ?? '',
  },
  {
    id: 'status',
    header: 'Status',
    accessor: (p) => <StatusBadge status={p.status} />,
    sortValue: (p) => p.status ?? '',
  },
  {
    id: 'deadline',
    header: 'Termen',
    accessor: (p) => (p.deadline ? formatDateRo(p.deadline) : 'fără termen'),
    sortValue: (p) => p.deadline ?? '',
  },
];

export default function ProjectsPage() {
  const projects = useProjectStore((s) => s.projects);
  const loading = useProjectStore((s) => s.loadingProjects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const clients = useClientStore((s) => s.clients);
  const fetchClients = useClientStore((s) => s.fetchClients);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', client_id: '', deadline: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchProjects();
    void fetchClients();
  }, [fetchProjects, fetchClients]);

  const kpis = useMemo(() => ({
    total: projects.length,
    active: projects.filter((p) => ACTIVE_STATUSES.some((s) => p.status?.toLowerCase().includes(s.replace(' ', '_')))).length,
    done: projects.filter((p) => p.status === 'finalizat').length,
    cancelled: projects.filter((p) => p.status === 'anulat').length,
  }), [projects]);

  const filtered = useMemo(() => {
    let list = projects;
    if (statusFilter === 'active') list = list.filter((p) => ACTIVE_STATUSES.some((s) => p.status?.toLowerCase().includes(s.replace(' ', '_'))));
    else if (statusFilter === 'finalizat') list = list.filter((p) => p.status === 'finalizat');
    else if (statusFilter === 'anulat') list = list.filter((p) => p.status === 'anulat');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.client_name?.toLowerCase().includes(q));
    }
    return list;
  }, [projects, search, statusFilter]);

  const create = async () => {
    if (!form.name.trim()) { toast.error('Numele proiectului este obligatoriu'); return; }
    setSaving(true);
    try {
      await apiCommand('create_project', {
        name: form.name.trim(),
        client_id: form.client_id ? Number(form.client_id) : undefined,
        deadline: form.deadline || undefined,
      });
      toast.success('Proiect creat');
      setOpen(false);
      setForm({ name: '', client_id: '', deadline: '' });
      void fetchProjects();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page fill>
      <PageHeader
        title="Proiecte"
        description={`${filtered.length} din ${projects.length} proiecte`}
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Proiect nou</Button>}
      />

      <PageBody>
        <AnalyticsKpiStrip>
          <KPICard label="Total" value={kpis.total} icon={<FolderKanban className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Active" value={kpis.active} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Finalizate" value={kpis.done} icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Anulate" value={kpis.cancelled} icon={<XCircle className="h-4 w-4 text-muted-foreground" />} />
        </AnalyticsKpiStrip>

        <PageToolbar className="flex items-center gap-2">
          <PageSearch
            placeholder="Caută proiect sau client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Tabs>
            <TabsList>
              <TabsTrigger active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Toate</TabsTrigger>
              <TabsTrigger active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>Active</TabsTrigger>
              <TabsTrigger active={statusFilter === 'finalizat'} onClick={() => setStatusFilter('finalizat')}>Finalizate</TabsTrigger>
              <TabsTrigger active={statusFilter === 'anulat'} onClick={() => setStatusFilter('anulat')}>Anulate</TabsTrigger>
            </TabsList>
          </Tabs>
        </PageToolbar>

        <AsyncContent loading={loading && projects.length === 0} error={null} empty={filtered.length === 0}>
          <DataTableCard>
            <DataTable
              data={filtered}
              columns={projectColumns}
              selectable
              pageSize={15}
              onSelect={(p) => { window.location.hash = `/v2/projects/${p.id}`; }}
            />
          </DataTableCard>
        </AsyncContent>
      </PageBody>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Proiect nou</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nume proiect *</Label>
              <Input
                placeholder="ex. Instalație electrică Hală B"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Client</Label>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
              >
                <option value="">Fără client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Termen limită</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
            <Button onClick={() => void create()} disabled={saving}>
              {saving ? 'Se creează…' : 'Creează proiect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
