import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  DynamicPage, DynamicPageTitle, DynamicPageHeader,
  Title, Label, Text, ObjectStatus, Toolbar, ToolbarButton,
  FilterBar, FilterGroupItem, Input,
  AnalyticalTable, Button, Dialog, Bar, TextArea,
} from '@ui5/webcomponents-react';
import ButtonDesign from '@ui5/webcomponents/dist/types/ButtonDesign.js';
import ValueState from '@ui5/webcomponents-base/dist/types/ValueState.js';
import addIcon from '@ui5/webcomponents-icons/dist/add.js';
import editIcon from '@ui5/webcomponents-icons/dist/edit.js';
import deleteIcon from '@ui5/webcomponents-icons/dist/delete.js';

import type { User, Project, Client } from '@/core/types';
import { useClientStore } from '@/store/clientStore';
import { useProjectStore } from '@/store/projectStore';
import { useMoney } from '@/store/settingsStore';
import { apiCommand } from '@/api/commands';
import { useViewerMode } from '@/hooks/useViewerMode';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import { projectStatus } from '@/lib/statusTokens';
import type { AnafCompanyInfo } from '@/components/AnafLookupButton';
import ClientsEnhancements from '@/pages/clients/ClientsEnhancements';

// Extra DB-backed client fields not in the Client type (CUI, fiscal & banking data)
type ClientRow = Client & {
  cui?: string; reg_com?: string; city?: string; county?: string;
  bank_name?: string; iban?: string; notes?: string;
};

const STATUS_TONE_TO_STATE: Record<string, ValueState> = {
  success: ValueState.Positive,
  warning: ValueState.Critical,
  danger: ValueState.Negative,
  info: ValueState.Information,
  progress: ValueState.Information,
};
function projectState(status: string): { state: ValueState; label: string } {
  const t = projectStatus(status);
  return { state: STATUS_TONE_TO_STATE[t.tone] ?? ValueState.None, label: t.label };
}

type FormState = {
  name: string; cui: string; reg_com: string; contact_person: string;
  email: string; phone: string; address: string; city: string; county: string;
  bank_name: string; iban: string; notes: string;
};
const EMPTY_FORM: FormState = {
  name: '', cui: '', reg_com: '', contact_person: '', email: '', phone: '',
  address: '', city: '', county: '', bank_name: '', iban: '', notes: '',
};

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '5rem' }}>
      <Label>{label}</Label>
      <Title level="H4">{String(value)}</Title>
    </div>
  );
}

export default function ClientsPage({ user: _user }: { user: User | null }) {
  const isViewer = useViewerMode('clients');
  const clients = useClientStore(s => s.clients) as ClientRow[];
  const loading = useClientStore(s => s.loading);
  const fetchClients = useClientStore(s => s.fetchClients);
  const createClient = useClientStore(s => s.createClient);
  const updateClient = useClientStore(s => s.updateClient);
  const deleteClient = useClientStore(s => s.deleteClient);

  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const money = useMoney();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [anafLoading, setAnafLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);

  useEffect(() => {
    void fetchClients();
    void fetchProjects();
  }, [fetchClients, fetchProjects]);

  const activeProjects = useMemo(
    () => projects.filter(p => p.status !== 'finalizat' && p.status !== 'anulat'),
    [projects],
  );
  const projectsByClient = useMemo(() => {
    const map = new Map<number, Project[]>();
    projects.forEach(p => { const arr = map.get(p.client_id) || []; arr.push(p); map.set(p.client_id, arr); });
    return map;
  }, [projects]);

  const metrics = useMemo(() => ({
    total: clients.length,
    activeClients: new Set(activeProjects.map(p => p.client_id)).size,
    activeProjects: activeProjects.length,
    revenue: activeProjects.reduce((s, p) => s + (p.budget || 0), 0),
  }), [clients.length, activeProjects]);

  const data = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.contact_person || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q),
    );
  }, [clients, search]);

  const detailClient = useMemo(
    () => (detailId == null ? null : clients.find(c => c.id === detailId) ?? null),
    [clients, detailId],
  );
  const detailProjects = detailClient ? (projectsByClient.get(detailClient.id) || []) : [];

  const openCreate = useCallback(() => { setEditId(null); setForm(EMPTY_FORM); setDialogOpen(true); }, []);
  const openEdit = useCallback((c: ClientRow) => {
    setEditId(c.id);
    setForm({
      name: c.name ?? '', cui: c.cui ?? '', reg_com: c.reg_com ?? '',
      contact_person: c.contact_person ?? '', email: c.email ?? '', phone: c.phone ?? '',
      address: c.address ?? '', city: c.city ?? '', county: c.county ?? '',
      bank_name: c.bank_name ?? '', iban: c.iban ?? '', notes: c.notes ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (c: ClientRow) => {
    const linked = projects.filter(p => p.client_id === c.id).length;
    const msg = linked > 0
      ? `Sigur Doriți sa ștergeți acest client? Atenție: are ${linked} proiect(e) asociat(e) ce vor rămâne fără client.`
      : 'Sigur Doriți sa ștergeți acest client?';
    if (!(await confirmDialog({ title: 'Șterge clientul?', body: msg, danger: true }))) return;
    try {
      await deleteClient(c.id);
      if (detailId === c.id) setDetailId(null);
      toast.success('Client sters cu succes');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la ștergere'); }
  }, [deleteClient, projects, detailId]);

  const save = useCallback(async () => {
    if (!form.name.trim()) { toast.error('Nume obligatoriu'); return; }
    setSubmitting(true);
    try {
      if (editId != null) await updateClient(editId, { ...form });
      else await createClient({ ...form });
      toast.success('Client salvat');
      setDialogOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la salvare'); }
    finally { setSubmitting(false); }
  }, [form, editId, createClient, updateClient]);

  const anafLookup = useCallback(async () => {
    if (!form.cui.trim()) { toast.error('Introduceți CUI-ul'); return; }
    setAnafLoading(true);
    try {
      const info = await apiCommand<AnafCompanyInfo>('anaf_lookup_cui', { cui: form.cui });
      setForm(f => ({
        ...f,
        name: info.denumire || f.name,
        cui: info.cui || f.cui,
        reg_com: info.reg_com || f.reg_com,
        address: info.adresa || f.address,
        city: info.oras || f.city,
        county: info.judet || f.county,
        phone: info.telefon || f.phone,
      }));
      toast.success('Date ANAF preluate');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare ANAF'); }
    finally { setAnafLoading(false); }
  }, [form.cui]);

  const set = (k: keyof FormState) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const columns = useMemo<any[]>(() => [
    { Header: 'Nume', accessor: 'name', Cell: ({ row }: any) => <Text>{row.original.name}</Text> },
    { Header: 'Persoană contact', accessor: 'contact_person' },
    { Header: 'Email', accessor: 'email' },
    { Header: 'Telefon', accessor: 'phone', width: 150 },
    {
      Header: 'Acțiuni', id: 'actions', disableSortBy: true, hAlign: 'End', width: 110,
      Cell: ({ row }: any) => (
        isViewer ? null : (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <Button design={ButtonDesign.Transparent} icon={editIcon} tooltip="Editează" onClick={(e: any) => { e.stopPropagation?.(); openEdit(row.original); }} />
            <Button design={ButtonDesign.Transparent} icon={deleteIcon} tooltip="Șterge" onClick={(e: any) => { e.stopPropagation?.(); handleDelete(row.original); }} />
          </div>
        )
      ),
    },
  ], [isViewer, openEdit, handleDelete]);

  return (
    <>
      <DynamicPage
        style={{ height: '100%' }}
        titleArea={
          <DynamicPageTitle
            heading={<Title>Clienți</Title>}
            subheading={<Text>Portofoliu de clienți, proiecte asociate și instrumente CRM</Text>}
            actionsBar={
              <Toolbar design="Transparent">
                <ToolbarButton design={ButtonDesign.Emphasized} icon={addIcon} text="Adaugă client" onClick={openCreate} disabled={isViewer} />
              </Toolbar>
            }
          >
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <Kpi label="Total clienți" value={metrics.total} />
              <Kpi label="Clienți activi" value={metrics.activeClients} />
              <Kpi label="Proiecte active" value={metrics.activeProjects} />
              <Kpi label="Valoare proiecte" value={money(metrics.revenue, 'RON')} />
            </div>
          </DynamicPageTitle>
        }
        headerArea={
          <DynamicPageHeader>
            <FilterBar hideToolbar>
              <FilterGroupItem label="Caută" filterKey="q">
                <Input placeholder="Client, contact, email, telefon…" value={search} onInput={(e) => setSearch((e.target as any).value ?? '')} />
              </FilterGroupItem>
            </FilterBar>
          </DynamicPageHeader>
        }
      >
        <AnalyticalTable
          columns={columns}
          data={data}
          loading={loading}
          visibleRowCountMode="Auto"
          minRows={1}
          noDataText="Niciun client găsit"
          filterable
          sortable
          onRowClick={(e: any) => { const r = e?.detail?.row?.original; if (r) setDetailId(r.id); }}
        />

        {/* CRM tools (timeline, scoring, tags, import, communication — local data) */}
        <div style={{ padding: '1rem 0' }}>
          <Title level="H4" style={{ marginBottom: '0.5rem' }}>Tools CRM</Title>
          <ClientsEnhancements clients={clients} />
        </div>
      </DynamicPage>

      {/* Client detail */}
      <Dialog
        open={detailClient != null}
        headerText={detailClient?.name ?? 'Detalii client'}
        onClose={() => setDetailId(null)}
        footer={
          <Bar
            design="Footer"
            endContent={
              <>
                {!isViewer && detailClient && (
                  <Button design={ButtonDesign.Transparent} icon={editIcon} onClick={() => { openEdit(detailClient); setDetailId(null); }}>Editează</Button>
                )}
                {!isViewer && detailClient && (
                  <Button design={ButtonDesign.Transparent} icon={deleteIcon} onClick={() => handleDelete(detailClient)}>Șterge</Button>
                )}
                <Button design={ButtonDesign.Transparent} onClick={() => setDetailId(null)}>Închide</Button>
              </>
            }
          />
        }
      >
        {detailClient && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '26rem', maxWidth: '34rem', padding: '0.5rem 0' }}>
            <div><Label>Persoană contact</Label><Text>{detailClient.contact_person || '—'}</Text></div>
            <div><Label>Email</Label><Text>{detailClient.email || '—'}</Text></div>
            <div><Label>Telefon</Label><Text>{detailClient.phone || '—'}</Text></div>
            {detailClient.address ? <div><Label>Adresă</Label><Text>{detailClient.address}</Text></div> : null}
            <div>
              <Label>Proiecte ({detailProjects.length})</Label>
              {detailProjects.length === 0 ? (
                <Text>Niciun proiect asociat.</Text>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {detailProjects.map(p => {
                    const st = projectState(p.status);
                    const val = p.estimated_value ?? p.budget ?? 0;
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <Text>{p.name}</Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ObjectStatus state={st.state}>{st.label}</ObjectStatus>
                          {val > 0 ? <Label>{money(val, 'RON')}</Label> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Create / edit client */}
      <Dialog
        open={dialogOpen}
        headerText={editId != null ? 'Editează client' : 'Adaugă client'}
        onClose={() => setDialogOpen(false)}
        footer={
          <Bar
            design="Footer"
            endContent={
              <>
                <Button design={ButtonDesign.Emphasized} onClick={save} disabled={submitting}>{submitting ? 'Se salvează…' : 'Salvează'}</Button>
                <Button design={ButtonDesign.Transparent} onClick={() => setDialogOpen(false)}>Anulează</Button>
              </>
            }
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '30rem', padding: '0.5rem 0' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <Label>CUI</Label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Input style={{ flex: 1 }} value={form.cui} placeholder="ex: 12345678 sau RO12345678" onInput={(e) => set('cui')((e.target as any).value)} />
                <Button design={ButtonDesign.Transparent} onClick={anafLookup} disabled={anafLoading || !form.cui.trim()}>{anafLoading ? 'Caut…' : 'ANAF'}</Button>
              </div>
            </div>
            <div style={{ flex: 1 }}><Label>Reg. Com</Label><Input style={{ width: '100%' }} value={form.reg_com} placeholder="J40/1234/2020" onInput={(e) => set('reg_com')((e.target as any).value)} /></div>
          </div>
          <div><Label required>Nume firmă</Label><Input style={{ width: '100%' }} value={form.name} onInput={(e) => set('name')((e.target as any).value)} /></div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label>Persoană contact</Label><Input style={{ width: '100%' }} value={form.contact_person} onInput={(e) => set('contact_person')((e.target as any).value)} /></div>
            <div style={{ flex: 1 }}><Label>Email</Label><Input type="Email" style={{ width: '100%' }} value={form.email} onInput={(e) => set('email')((e.target as any).value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label>Telefon</Label><Input type="Tel" style={{ width: '100%' }} value={form.phone} onInput={(e) => set('phone')((e.target as any).value)} /></div>
            <div style={{ flex: 1 }}><Label>Oraș</Label><Input style={{ width: '100%' }} value={form.city} onInput={(e) => set('city')((e.target as any).value)} /></div>
            <div style={{ flex: 1 }}><Label>Județ</Label><Input style={{ width: '100%' }} value={form.county} onInput={(e) => set('county')((e.target as any).value)} /></div>
          </div>
          <div><Label>Adresă</Label><Input style={{ width: '100%' }} value={form.address} onInput={(e) => set('address')((e.target as any).value)} /></div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label>Bancă</Label><Input style={{ width: '100%' }} value={form.bank_name} onInput={(e) => set('bank_name')((e.target as any).value)} /></div>
            <div style={{ flex: 1 }}><Label>IBAN</Label><Input style={{ width: '100%' }} value={form.iban} onInput={(e) => set('iban')((e.target as any).value)} /></div>
          </div>
          <div><Label>Note</Label><TextArea style={{ width: '100%' }} rows={2} value={form.notes} onInput={(e) => set('notes')((e.target as any).value)} /></div>
        </div>
      </Dialog>
    </>
  );
}
