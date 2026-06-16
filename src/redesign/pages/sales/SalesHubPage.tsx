import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  DynamicPage, DynamicPageTitle, DynamicPageHeader,
  Title, Label, Text, ObjectStatus, Toolbar, ToolbarButton,
  FilterBar, FilterGroupItem, Select, Option, Input, TextArea, DatePicker,
  AnalyticalTable, Button, Dialog, Bar,
} from '@ui5/webcomponents-react';
import ButtonDesign from '@ui5/webcomponents/dist/types/ButtonDesign.js';
import ValueState from '@ui5/webcomponents-base/dist/types/ValueState.js';
import addIcon from '@ui5/webcomponents-icons/dist/add.js';
import editIcon from '@ui5/webcomponents-icons/dist/edit.js';
import documentIcon from '@ui5/webcomponents-icons/dist/document.js';
import discussionIcon from '@ui5/webcomponents-icons/dist/discussion.js';

import type { User } from '@/core/types';
import { useMoney } from '@/store/settingsStore';
import { useProjectStore } from '@/store/projectStore';
import { useSalesStore, type SalesLead } from '@/store/salesStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { leadStatus, leadProjectStatus, type StatusTone } from '@/lib/statusTokens';
import { formatDateTimeRo } from '@/lib/format';
import { toast } from '@/store/toastStore';

// ── Lead status options (preserved verbatim from the prior implementation) ──
const LEAD_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'fara_contact',    label: 'Fără contact' },
  { value: 'decizie_client',  label: 'Decizie client' },
  { value: 'decizie_noastra', label: 'Decizie noastră' },
  { value: 'in_negocieri',    label: 'În negocieri' },
  { value: 'convertit',       label: 'Convertit' },
];

// Map domain status tones → UI5 ValueState for ObjectStatus rendering.
function toneToState(tone: StatusTone): ValueState {
  switch (tone) {
    case 'success': return ValueState.Positive;
    case 'warning': return ValueState.Critical;
    case 'danger':  return ValueState.Negative;
    case 'info':
    case 'accent':
    case 'progress':
    case 'special': return ValueState.Information;
    default:        return ValueState.None;
  }
}

function isStaleLead(lead: SalesLead): { stale: boolean; days: number | null } {
  const lastTouch = lead.last_contact_date || lead.updated_at;
  const days = lastTouch ? Math.floor((Date.now() - new Date(lastTouch).getTime()) / 86_400_000) : null;
  const stale = lead.status !== 'convertit' && days !== null && days >= 7;
  return { stale, days };
}

type Tab = 'pipeline' | 'executie';

type CreateForm = {
  client_name: string; contact_person: string; contact_email: string; contact_phone: string;
  product_interest: string; location: string; estimated_value: string; status: string;
  next_followup_date: string; notes: string;
};
const EMPTY_CREATE: CreateForm = {
  client_name: '', contact_person: '', contact_email: '', contact_phone: '',
  product_interest: '', location: '', estimated_value: '0', status: 'fara_contact',
  next_followup_date: '', notes: '',
};

function Kpi({ label, value, state }: { label: string; value: number | string; state?: ValueState }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '5rem' }}>
      <Label>{label}</Label>
      <Title level="H4" style={state && state !== ValueState.None ? { color: `var(--sapField_${state}Color, inherit)` } : undefined}>
        {String(value)}
      </Title>
    </div>
  );
}

export default function SalesHubPage({ user }: { user: User | null }) {
  const isManagerOrAdmin = ['admin', 'manager'].includes((user?.role_name || '').toLowerCase());
  const money = useMoney();
  const [, setLocation] = useLocation();

  // ── Data layer (reused verbatim) ──
  const leads = useSalesStore(s => s.leads);
  const loading = useSalesStore(s => s.loading);
  const fetchLeadsStore = useSalesStore(s => s.fetchLeads);
  const createLeadStore = useSalesStore(s => s.createLead);
  const addNoteStore = useSalesStore(s => s.addNote);
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const stats = useDashboardStore(s => s.salesStats);
  const fetchSalesStats = useDashboardStore(s => s.fetchSalesStats);

  const [tab, setTab] = useState<Tab>('pipeline');
  const [creatorFilter, setCreatorFilter] = useState('');
  const [sortBy, setSortBy] = useState('');

  // Create-lead dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);

  // Quick-update (add note) dialog
  const [updateLead, setUpdateLead] = useState<SalesLead | null>(null);
  const [updateText, setUpdateText] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);

  const fetch = useCallback(() => {
    void Promise.all([
      fetchLeadsStore(true),
      fetchProjects(true),
      fetchSalesStats(),
    ]);
  }, [fetchLeadsStore, fetchProjects, fetchSalesStats]);

  useEffect(() => { fetch(); }, [fetch]);

  const activeLeads = leads;
  const activeProjects = useMemo(() => projects.filter(p => p.status !== 'finalizat'), [projects]);

  const creators = useMemo(
    () => Array.from(new Set(activeLeads.map(l => l.created_by_name).filter((n): n is string => !!n)))
      .sort((a, b) => a.localeCompare(b, 'ro')),
    [activeLeads],
  );

  const displayedLeads = useMemo(() => {
    let list = activeLeads;
    if (isManagerOrAdmin && creatorFilter) {
      list = list.filter(l => (l.created_by_name || '') === creatorFilter);
    }
    if (isManagerOrAdmin && sortBy) {
      const copy = [...list];
      if (sortBy === 'user') {
        copy.sort((a, b) =>
          (a.created_by_name || '').localeCompare(b.created_by_name || '', 'ro')
          || b.created_at.localeCompare(a.created_at));
      } else if (sortBy === 'newest') {
        copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
      } else if (sortBy === 'oldest') {
        copy.sort((a, b) => a.created_at.localeCompare(b.created_at));
      }
      list = copy;
    }
    return list;
  }, [activeLeads, isManagerOrAdmin, creatorFilter, sortBy]);

  // ── KPI metrics (preserved from the prior dashboard stats) ──
  const metrics = useMemo(() => ({
    total: stats?.total_leads ?? 0,
    inNegocieri: stats?.in_negocieri ?? 0,
    pipelineValue: stats?.pipeline_value ?? 0,
    converted: stats?.converted ?? 0,
    stale: stats?.stale_leads ?? 0,
  }), [stats]);

  // ── Navigation actions (reused verbatim) ──
  const openLead = useCallback((leadId: number) => {
    setLocation(`/sales-hub/${leadId}`);
  }, [setLocation]);

  const openLeadEdit = useCallback((leadId: number) => {
    try { sessionStorage.setItem('promix_lead_edit', String(leadId)); } catch { /* ignore */ }
    setLocation(`/sales-hub/${leadId}`);
  }, [setLocation]);

  // ── Quick-update (add note) ──
  const openUpdate = useCallback((lead: SalesLead) => {
    setUpdateLead(lead); setUpdateText('');
  }, []);

  const saveQuickUpdate = useCallback(async () => {
    if (!updateLead || !updateText.trim() || savingUpdate) return;
    setSavingUpdate(true);
    try {
      await addNoteStore(updateLead.id, updateText.trim());
      setUpdateLead(null);
      setUpdateText('');
      toast.success('Update înregistrat');
      await Promise.all([fetchLeadsStore(true), fetchSalesStats()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare');
    } finally {
      setSavingUpdate(false);
    }
  }, [updateLead, updateText, savingUpdate, addNoteStore, fetchLeadsStore, fetchSalesStats]);

  // ── Create lead ──
  const openCreate = useCallback(() => { setCreateForm(EMPTY_CREATE); setCreateOpen(true); }, []);
  const setCreate = (k: keyof CreateForm) => (v: string) => setCreateForm(f => ({ ...f, [k]: v }));

  const handleCreate = useCallback(async () => {
    try {
      const newLead = await createLeadStore({
        client_name: createForm.client_name,
        contact_person: createForm.contact_person,
        contact_email: createForm.contact_email,
        contact_phone: createForm.contact_phone,
        product_interest: createForm.product_interest,
        location: createForm.location,
        estimated_value: createForm.estimated_value ? Number(createForm.estimated_value) : 0,
        status: createForm.status,
        next_followup_date: createForm.next_followup_date || null,
        notes: createForm.notes,
      });
      await fetchSalesStats();
      setCreateOpen(false);
      if (newLead && typeof (newLead as { id?: number }).id === 'number') {
        setLocation(`/sales-hub/${(newLead as { id: number }).id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la salvare');
    }
  }, [createForm, createLeadStore, fetchSalesStats, setLocation]);

  // ── Pipeline table columns (grouped by status) ──
  const leadColumns = useMemo<any[]>(() => [
    {
      Header: 'Status', accessor: 'status', width: 170, disableGroupBy: false,
      Cell: ({ row }: any) => {
        const tok = leadStatus(row.original.status);
        return <ObjectStatus state={toneToState(tok.tone)}>{tok.label}</ObjectStatus>;
      },
    },
    {
      Header: 'Client', accessor: 'client_name',
      Cell: ({ row }: any) => {
        const { stale, days } = isStaleLead(row.original);
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text>{row.original.client_name}</Text>
            {stale ? <ObjectStatus state={ValueState.Negative}>{`Fără update ${days}z`}</ObjectStatus> : null}
          </div>
        );
      },
    },
    { Header: 'Produs / Interes', accessor: 'product_interest', Cell: ({ row }: any) => <Text>{row.original.product_interest || '—'}</Text> },
    { Header: 'Locație', accessor: 'location', Cell: ({ row }: any) => row.original.location || '—' },
    { Header: 'Contact', accessor: 'contact_person', Cell: ({ row }: any) => row.original.contact_person || row.original.contact_phone || '—' },
    {
      Header: 'Valoare', accessor: 'estimated_value', hAlign: 'End', width: 130,
      Cell: ({ row }: any) => (row.original.estimated_value > 0 ? money(row.original.estimated_value, 'EUR', 0) : '—'),
    },
    ...(isManagerOrAdmin ? [{
      Header: 'Creat de', accessor: 'created_by_name',
      Cell: ({ row }: any) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text>{row.original.created_by_name || '—'}</Text>
          <Label>{formatDateTimeRo(row.original.created_at)}</Label>
        </div>
      ),
    }] : []),
    {
      Header: 'Acțiuni', id: 'actions', disableSortBy: true, disableGroupBy: true, hAlign: 'End', width: 130,
      Cell: ({ row }: any) => (
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <Button design={ButtonDesign.Transparent} icon={discussionIcon} tooltip="Înregistrează update" onClick={(e: any) => { e?.stopPropagation?.(); openUpdate(row.original); }} />
          <Button design={ButtonDesign.Transparent} icon={editIcon} tooltip="Editează" onClick={(e: any) => { e?.stopPropagation?.(); openLeadEdit(row.original.id); }} />
        </div>
      ),
    },
  ], [isManagerOrAdmin, money, openUpdate, openLeadEdit]);

  // ── Execution projects table columns ──
  const projectColumns = useMemo<any[]>(() => [
    { Header: 'Proiect', accessor: 'name', Cell: ({ row }: any) => <Text>{row.original.name}</Text> },
    { Header: 'Client', accessor: 'client_name', Cell: ({ row }: any) => row.original.client_name || '—' },
    { Header: 'Deadline', accessor: 'deadline', width: 140, Cell: ({ row }: any) => row.original.deadline || '—' },
    {
      Header: 'Status', accessor: 'status', width: 200,
      Cell: ({ row }: any) => {
        const tok = leadProjectStatus(row.original.status);
        return <ObjectStatus state={toneToState(tok.tone)}>{tok.label}</ObjectStatus>;
      },
    },
  ], []);

  return (
    <>
      <DynamicPage
        style={{ height: '100%' }}
        titleArea={
          <DynamicPageTitle
            heading={<Title>Sales Hub</Title>}
            subheading={<Text>Pipeline-ul de discuții cu clienții și proiectele trecute în execuție</Text>}
            actionsBar={
              <Toolbar design="Transparent">
                <ToolbarButton icon={documentIcon} text="Oferte" onClick={() => setLocation('/quotations')} />
                <ToolbarButton design={ButtonDesign.Emphasized} icon={addIcon} text="Discuție nouă" onClick={openCreate} />
              </Toolbar>
            }
          >
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Kpi label="În discuție" value={metrics.total.toLocaleString('ro-RO')} />
              <Kpi label="În negocieri" value={metrics.inNegocieri.toLocaleString('ro-RO')} />
              <Kpi label="Valoare pipeline" value={money(metrics.pipelineValue, 'EUR', 0)} />
              <Kpi label="Convertite" value={metrics.converted.toLocaleString('ro-RO')} />
              {metrics.stale > 0 && (
                <ObjectStatus state={ValueState.Negative}>
                  {`${metrics.stale} lead-uri fără update de 7+ zile`}
                </ObjectStatus>
              )}
            </div>
          </DynamicPageTitle>
        }
        headerArea={
          <DynamicPageHeader>
            <FilterBar hideToolbar>
              <FilterGroupItem label="Secțiune" filterKey="tab">
                <Select onChange={(e) => setTab(String(e.detail.selectedOption.dataset.value ?? 'pipeline') as Tab)}>
                  <Option data-value="pipeline" selected={tab === 'pipeline'}>Discuții cu clienți</Option>
                  <Option data-value="executie" selected={tab === 'executie'}>Proiecte în execuție</Option>
                </Select>
              </FilterGroupItem>
              {isManagerOrAdmin && (
                <FilterGroupItem label="Utilizator" filterKey="creator">
                  <Select onChange={(e) => setCreatorFilter(String(e.detail.selectedOption.dataset.value ?? ''))}>
                    <Option data-value="">Toți utilizatorii</Option>
                    {creators.map(c => <Option key={c} data-value={c} selected={c === creatorFilter}>{c}</Option>)}
                  </Select>
                </FilterGroupItem>
              )}
              {isManagerOrAdmin && (
                <FilterGroupItem label="Sortare" filterKey="sort">
                  <Select onChange={(e) => setSortBy(String(e.detail.selectedOption.dataset.value ?? ''))}>
                    <Option data-value="" selected={sortBy === ''}>Implicită</Option>
                    <Option data-value="user" selected={sortBy === 'user'}>După utilizator</Option>
                    <Option data-value="newest" selected={sortBy === 'newest'}>Cele mai noi</Option>
                    <Option data-value="oldest" selected={sortBy === 'oldest'}>Cele mai vechi</Option>
                  </Select>
                </FilterGroupItem>
              )}
            </FilterBar>
          </DynamicPageHeader>
        }
      >
        {tab === 'pipeline' ? (
          <AnalyticalTable
            columns={leadColumns}
            data={displayedLeads}
            loading={loading}
            visibleRowCountMode="Auto"
            minRows={1}
            noDataText="Niciun lead în pipeline"
            filterable
            sortable
            groupable
            onRowClick={(e: any) => {
              const lead = e?.detail?.row?.original as SalesLead | undefined;
              if (lead?.id) openLead(lead.id);
            }}
          />
        ) : (
          <AnalyticalTable
            columns={projectColumns}
            data={activeProjects}
            loading={loading}
            visibleRowCountMode="Auto"
            minRows={1}
            noDataText="Niciun proiect în execuție"
            filterable
            sortable
          />
        )}
      </DynamicPage>

      {/* Create lead */}
      <Dialog
        open={createOpen}
        headerText="Discuție nouă"
        onClose={() => setCreateOpen(false)}
        footer={
          <Bar
            design="Footer"
            endContent={
              <>
                <Button design={ButtonDesign.Emphasized} onClick={handleCreate}>Adaugă</Button>
                <Button design={ButtonDesign.Transparent} onClick={() => setCreateOpen(false)}>Anulează</Button>
              </>
            }
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '26rem', padding: '0.5rem 0' }}>
          <div><Label required>Client / Firma</Label><Input style={{ width: '100%' }} value={createForm.client_name} placeholder="SC Solidhouse SRL" onInput={(e) => setCreate('client_name')((e.target as any).value)} /></div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label>Persoana de contact</Label><Input style={{ width: '100%' }} value={createForm.contact_person} placeholder="Nume prenume" onInput={(e) => setCreate('contact_person')((e.target as any).value)} /></div>
            <div style={{ flex: 1 }}><Label>Telefon</Label><Input style={{ width: '100%' }} value={createForm.contact_phone} placeholder="07xx xxx xxx" onInput={(e) => setCreate('contact_phone')((e.target as any).value)} /></div>
          </div>
          <div><Label>Email</Label><Input type="Email" style={{ width: '100%' }} value={createForm.contact_email} placeholder="email@firma.ro" onInput={(e) => setCreate('contact_email')((e.target as any).value)} /></div>
          <div><Label required>Produs / Interes</Label><Input style={{ width: '100%' }} value={createForm.product_interest} placeholder="Statie betoane M60, Statie pavele..." onInput={(e) => setCreate('product_interest')((e.target as any).value)} /></div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label>Locație</Label><Input style={{ width: '100%' }} value={createForm.location} placeholder="Oras, judet" onInput={(e) => setCreate('location')((e.target as any).value)} /></div>
            <div style={{ flex: 1 }}><Label>Valoare estimată (EUR)</Label><Input type="Number" style={{ width: '100%' }} value={createForm.estimated_value} onInput={(e) => setCreate('estimated_value')((e.target as any).value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label>Status</Label>
              <Select style={{ width: '100%' }} onChange={(e) => setCreate('status')(String(e.detail.selectedOption.dataset.value ?? 'fara_contact'))}>
                {LEAD_STATUS_OPTIONS.map(s => <Option key={s.value} data-value={s.value} selected={s.value === createForm.status}>{s.label}</Option>)}
              </Select>
            </div>
            <div style={{ flex: 1 }}><Label>Data următorul followup</Label><DatePicker formatPattern="yyyy-MM-dd" style={{ width: '100%' }} value={createForm.next_followup_date} onChange={(e) => setCreate('next_followup_date')(e.detail.value ?? '')} /></div>
          </div>
          <div><Label>Note inițiale</Label><TextArea style={{ width: '100%' }} rows={3} value={createForm.notes} onInput={(e) => setCreate('notes')((e.target as any).value)} /></div>
        </div>
      </Dialog>

      {/* Quick update (add note) */}
      <Dialog
        open={!!updateLead}
        headerText={updateLead ? `Update — ${updateLead.client_name}` : 'Update'}
        onClose={() => { if (!savingUpdate) { setUpdateLead(null); setUpdateText(''); } }}
        footer={
          <Bar
            design="Footer"
            endContent={
              <>
                <Button design={ButtonDesign.Emphasized} onClick={saveQuickUpdate} disabled={!updateText.trim() || savingUpdate}>Salvează update</Button>
                <Button design={ButtonDesign.Transparent} onClick={() => { setUpdateLead(null); setUpdateText(''); }} disabled={savingUpdate}>Anulează</Button>
              </>
            }
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '24rem', padding: '0.5rem 0' }}>
          <Text>Înregistrează o noutate pe lead. Resetează avertismentul „fără update".</Text>
          <TextArea
            style={{ width: '100%' }}
            rows={4}
            value={updateText}
            placeholder="Ce e nou? Stadiul discuției, oferta, următorii pași…"
            onInput={(e) => setUpdateText((e.target as any).value)}
          />
        </div>
      </Dialog>
    </>
  );
}
