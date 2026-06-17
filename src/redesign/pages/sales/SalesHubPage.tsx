import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  Target, Plus, FileText, MapPin, Phone, MessageSquare, Pencil, AlertTriangle,
  ArrowRight, TrendingUp, Users, DollarSign, CalendarClock, Clock, Loader2,
  X as XIcon, CircleCheckBig,
} from 'lucide-react';

import type { User } from '@/core/types';
import { cn } from '@/lib/cn';
import { formatDateRo } from '@/lib/format';
import { useMoney } from '@/store/settingsStore';
import { useProjectStore } from '@/store/projectStore';
import { useSalesStore, type SalesLead } from '@/store/salesStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { leadStatus, leadProjectStatus, type StatusTone } from '@/lib/statusTokens';
import { toast } from '@/store/toastStore';
import { useViewerMode } from '@/hooks/useViewerMode';
import { ViewerBanner } from '@/components/ViewerBanner';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';

import Page from '@/redesign/ui/Page';
import Card from '@/redesign/ui/Card';
import KpiCard from '@/redesign/ui/KpiCard';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import StatusBadge from '@/redesign/ui/StatusBadge';
import HeroHeader from '@/redesign/ui/HeroHeader';
import EmptyState from '@/redesign/ui/EmptyState';
import { filterSelectCls } from '@/redesign/ui/filterControls';
import { vtName } from '@/redesign/lib/viewTransition';

// The pipeline reads as a flow only if the stages are columns. These are the
// ACTIVE stages, in deal order; "convertit" is terminal and lives in a side
// panel (same pattern as the production board's "Finalizate" aside).
const PIPELINE_STAGES: Array<{ value: string; label: string }> = [
  { value: 'fara_contact',    label: 'Fără contact' },
  { value: 'decizie_client',  label: 'Decizie client' },
  { value: 'decizie_noastra', label: 'Decizie noastră' },
  { value: 'in_negocieri',    label: 'În negocieri' },
];
const CONVERTED = 'convertit';

const LEAD_STATUS_OPTIONS = [...PIPELINE_STAGES, { value: CONVERTED, label: 'Convertit' }];

// Column accent rail color, derived from the status tone so the board's colors
// match the badges used everywhere else.
const TONE_COLOR: Record<StatusTone, string> = {
  neutral:  'var(--color-border)',
  info:     'var(--status-blue)',
  warning:  'var(--status-amber)',
  success:  'var(--status-green)',
  danger:   'var(--status-red)',
  progress: 'var(--status-teal)',
  special:  'var(--accent)',
  accent:   'var(--accent)',
};

function staleInfo(lead: SalesLead): { stale: boolean; days: number | null } {
  const lastTouch = lead.last_contact_date || lead.updated_at;
  const days = lastTouch ? Math.floor((Date.now() - new Date(lastTouch).getTime()) / 86_400_000) : null;
  return { stale: lead.status !== CONVERTED && days !== null && days >= 7, days };
}

type Tab = 'pipeline' | 'executie';

export default function SalesHubPage({ user }: { user: User | null }) {
  const isManagerOrAdmin = ['admin', 'manager'].includes((user?.role_name || '').toLowerCase());
  const isViewer = useViewerMode('sales-hub');
  const money = useMoney();
  const [, setLocation] = useLocation();

  // ── Data layer (reused verbatim) ──
  const leads = useSalesStore(s => s.leads);
  const loading = useSalesStore(s => s.loading);
  const fetchLeadsStore = useSalesStore(s => s.fetchLeads);
  const createLeadStore = useSalesStore(s => s.createLead);
  const updateLeadStore = useSalesStore(s => s.updateLead);
  const addNoteStore = useSalesStore(s => s.addNote);
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const stats = useDashboardStore(s => s.salesStats);
  const fetchSalesStats = useDashboardStore(s => s.fetchSalesStats);

  const [tab, setTab] = useState<Tab>('pipeline');
  const [creatorFilter, setCreatorFilter] = useState('');
  const [sortBy, setSortBy] = useState('');

  const { isOpen, openModal, closeModal } = useFormModal();

  // Drag-to-move-stage
  const dragLead = useRef<{ id: number; from: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Quick-update (add note) modal
  const [updateLead, setUpdateLead] = useState<SalesLead | null>(null);
  const [updateText, setUpdateText] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);

  const fetchAll = useCallback(() => {
    void Promise.all([fetchLeadsStore(true), fetchProjects(true), fetchSalesStats()]);
  }, [fetchLeadsStore, fetchProjects, fetchSalesStats]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const activeProjects = useMemo(() => projects.filter(p => p.status !== 'finalizat'), [projects]);

  const creators = useMemo(
    () => Array.from(new Set(leads.map(l => l.created_by_name).filter((n): n is string => !!n)))
      .sort((a, b) => a.localeCompare(b, 'ro')),
    [leads],
  );

  const displayedLeads = useMemo(() => {
    let list = leads;
    if (isManagerOrAdmin && creatorFilter) list = list.filter(l => (l.created_by_name || '') === creatorFilter);
    if (isManagerOrAdmin && sortBy) {
      const copy = [...list];
      if (sortBy === 'user') copy.sort((a, b) => (a.created_by_name || '').localeCompare(b.created_by_name || '', 'ro') || b.created_at.localeCompare(a.created_at));
      else if (sortBy === 'newest') copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
      else if (sortBy === 'oldest') copy.sort((a, b) => a.created_at.localeCompare(b.created_at));
      list = copy;
    }
    return list;
  }, [leads, isManagerOrAdmin, creatorFilter, sortBy]);

  // Bucket leads by status for the board.
  const byStatus = useMemo(() => {
    const map = new Map<string, SalesLead[]>();
    for (const l of displayedLeads) {
      const arr = map.get(l.status) ?? [];
      arr.push(l);
      map.set(l.status, arr);
    }
    return map;
  }, [displayedLeads]);
  const convertedLeads = byStatus.get(CONVERTED) ?? [];

  const metrics = {
    total: stats?.total_leads ?? 0,
    inNegocieri: stats?.in_negocieri ?? 0,
    pipelineValue: stats?.pipeline_value ?? 0,
    converted: stats?.converted ?? 0,
    stale: stats?.stale_leads ?? 0,
  };

  // ── Navigation / mutations ──
  const openLead = useCallback((id: number) => setLocation(`/sales-hub/${id}`), [setLocation]);
  const openLeadEdit = useCallback((id: number) => {
    try { sessionStorage.setItem('promix_lead_edit', String(id)); } catch { /* ignore */ }
    setLocation(`/sales-hub/${id}`);
  }, [setLocation]);

  const onDrop = useCallback(async (toStatus: string) => {
    setDragOver(null);
    const drag = dragLead.current;
    dragLead.current = null;
    if (!drag || drag.from === toStatus) return;
    try {
      await updateLeadStore(drag.id, { status: toStatus });
      await fetchSalesStats();
      toast.success(`Mutat în „${LEAD_STATUS_OPTIONS.find(s => s.value === toStatus)?.label ?? toStatus}”`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nu am putut muta lead-ul');
    }
  }, [updateLeadStore, fetchSalesStats]);

  const saveQuickUpdate = useCallback(async () => {
    if (!updateLead || !updateText.trim() || savingUpdate) return;
    setSavingUpdate(true);
    try {
      await addNoteStore(updateLead.id, updateText.trim());
      setUpdateLead(null); setUpdateText('');
      toast.success('Update înregistrat');
      await Promise.all([fetchLeadsStore(true), fetchSalesStats()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare');
    } finally { setSavingUpdate(false); }
  }, [updateLead, updateText, savingUpdate, addNoteStore, fetchLeadsStore, fetchSalesStats]);

  // ── Create lead (FormModal) ──
  const createFields: FormField[] = useMemo(() => [
    { name: 'client_name', label: 'Client / Firmă', type: 'text', required: true, placeholder: 'SC Solidhouse SRL' },
    { name: 'contact_person', label: 'Persoană de contact', type: 'text', placeholder: 'Nume prenume' },
    { name: 'contact_email', label: 'Email', type: 'email', placeholder: 'email@firma.ro' },
    { name: 'contact_phone', label: 'Telefon', type: 'tel', placeholder: '07xx xxx xxx' },
    { name: 'product_interest', label: 'Produs / Interes', type: 'text', required: true, placeholder: 'Stație betoane M60…' },
    { name: 'location', label: 'Locație', type: 'text', placeholder: 'Oraș, județ' },
    { name: 'estimated_value', label: 'Valoare estimată (EUR)', type: 'number', placeholder: '0' },
    { name: 'status', label: 'Status', type: 'select', options: LEAD_STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label })) },
    { name: 'next_followup_date', label: 'Data următorul followup', type: 'date' },
    { name: 'notes', label: 'Note inițiale', type: 'textarea' },
  ], []);

  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    const newLead = await createLeadStore({
      ...data,
      estimated_value: data.estimated_value ? Number(data.estimated_value) : 0,
      next_followup_date: data.next_followup_date || null,
    });
    await fetchSalesStats();
    if (newLead && typeof (newLead as { id?: number }).id === 'number') {
      setLocation(`/sales-hub/${(newLead as { id: number }).id}`);
    }
  }, [createLeadStore, fetchSalesStats, setLocation]);

  const cardProps = { money, isViewer, onOpen: openLead, onEdit: openLeadEdit, onUpdate: (l: SalesLead) => { setUpdateLead(l); setUpdateText(''); } };

  return (
    <Page fit>
      <Page.Body fit maxWidth="full" padding="flush" className="!gap-0 overflow-hidden">
        <ViewerBanner page="sales-hub" />

        <div className="px-6 pt-5 pb-4 shrink-0">
          <HeroHeader
            className="enter-up"
            style={{ animationDelay: '0ms' }}
            icon={Target}
            title="Sales Hub"
            subtitle="Pipeline-ul de discuții cu clienții și proiectele trecute în execuție"
            actions={
              <>
                <Button size="md" variant="secondary" onClick={() => setLocation('/quotations')}>
                  <FileText className="h-4 w-4" /> Oferte
                </Button>
                {!isViewer && (
                  <Button size="md" onClick={() => openModal()}>
                    <Plus className="h-4 w-4" /> Discuție nouă
                  </Button>
                )}
              </>
            }
          >
            {/* In-page view toggle + manager filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-0.5 rounded-xl border border-line bg-surface-secondary p-1" role="group" aria-label="Secțiune">
                {([['pipeline', 'Pipeline'], ['executie', 'În execuție']] as Array<[Tab, string]>).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    aria-pressed={tab === id}
                    className={cn(
                      'h-8 px-3.5 rounded-lg text-pm-xs font-semibold transition-smooth',
                      tab === id ? 'bg-accent text-[var(--color-on-accent)] shadow-[var(--elevation-1)]' : 'text-content-muted hover:text-content-primary hover:bg-surface-tertiary',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'pipeline' && isManagerOrAdmin && leads.length > 0 && (
                <>
                  <select value={creatorFilter} onChange={e => setCreatorFilter(e.target.value)} className={filterSelectCls(creatorFilter !== '')}>
                    <option value="">Toți utilizatorii</option>
                    {creators.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={filterSelectCls(sortBy !== '')}>
                    <option value="">Sortare: implicită</option>
                    <option value="user">După utilizator</option>
                    <option value="newest">Cele mai noi</option>
                    <option value="oldest">Cele mai vechi</option>
                  </select>
                </>
              )}
            </div>
          </HeroHeader>
        </div>

        {/* KPI strip — Valoare pipeline is the hero (the one figure not visible on the board) */}
        <div className="px-6 pb-4 shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 enter-up" style={{ animationDelay: '80ms' }}>
            <KpiCard compact label="În discuție"  value={metrics.total}       icon={Users}      iconColor="text-status-blue" />
            <KpiCard compact label="În negocieri" value={metrics.inNegocieri} icon={TrendingUp} iconColor="text-status-amber" />
            <KpiCard compact label="Convertite"   value={metrics.converted}   icon={Target}     iconColor="text-status-green" />
            <KpiCard
              hero
              className="col-span-2 lg:col-span-2"
              label="Valoare pipeline" icon={DollarSign}
              value={money(metrics.pipelineValue, 'EUR', 0)}
            />
          </div>
          {metrics.stale > 0 && tab === 'pipeline' && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-status-red/30 bg-status-red/5 px-3.5 py-2 text-pm-xs text-status-red">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span><strong className="font-semibold">{metrics.stale}</strong> lead-uri fără update de 7+ zile — sunt marcate cu roșu pe carduri.</span>
            </div>
          )}
        </div>

        {/* Board / list */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-content-muted" /></div>
        ) : tab === 'pipeline' ? (
          <div className="flex flex-1 min-h-0 gap-4 px-6 pb-4 overflow-hidden enter-fade">
            {/* Active pipeline stages */}
            <div className="flex flex-1 min-w-0 gap-3 overflow-x-auto overflow-y-hidden scroll-fade-x pb-1">
              {PIPELINE_STAGES.map((stage, i) => {
                const colLeads = byStatus.get(stage.value) ?? [];
                const total = colLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
                const tok = leadStatus(stage.value);
                return (
                  <motion.div
                    key={stage.value}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    className="flex min-w-[280px] flex-1 flex-col min-h-0"
                  >
                    <SalesColumn
                      label={stage.label}
                      color={TONE_COLOR[tok.tone]}
                      count={colLeads.length}
                      value={total}
                      money={money}
                      isOver={dragOver === stage.value}
                      onDragOver={(e) => { if (!isViewer) { e.preventDefault(); setDragOver(stage.value); } }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => { e.preventDefault(); void onDrop(stage.value); }}
                    >
                      {colLeads.length === 0
                        ? <p className="py-6 text-center text-pm-xs text-content-muted">Niciun lead</p>
                        : colLeads.map(l => (
                          <LeadCard key={l.id} lead={l} {...cardProps}
                            onDragStart={() => { dragLead.current = { id: l.id, from: l.status }; }} />
                        ))}
                    </SalesColumn>
                  </motion.div>
                );
              })}
            </div>

            {/* Converted (terminal) — side panel */}
            <aside className="flex w-[280px] shrink-0 flex-col min-h-0 gap-3 overflow-y-auto border-l border-line/60 pl-4 ml-1 pb-1">
              <div className="flex items-center gap-2 px-1 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">
                <CircleCheckBig className="h-3.5 w-3.5 text-status-green" /> Convertite
              </div>
              <Card tone="subtle" className="flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2 stagger-in">
                  {convertedLeads.length === 0
                    ? <p className="py-6 text-center text-pm-xs text-content-muted">Niciun lead convertit</p>
                    : convertedLeads.map(l => (
                      <LeadCard key={l.id} lead={l} {...cardProps}
                        onDragStart={() => { dragLead.current = { id: l.id, from: l.status }; }} />
                    ))}
                </div>
              </Card>
            </aside>
          </div>
        ) : (
          // ── Proiecte în execuție ──
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-5 enter-fade">
            {activeProjects.length === 0 ? (
              <Card padding="lg" className="flex items-center justify-center min-h-[40vh]">
                <EmptyState icon={ArrowRight} title="Niciun proiect în execuție"
                  description="Convertește o discuție din pipeline în producție pentru a o vedea aici." />
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {activeProjects.map(p => (
                  <Card key={p.id} padding="md" interactive vtName={vtName('project', p.id)} className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-pm-sm font-semibold text-content-primary truncate">{p.name}</p>
                        <p className="mt-0.5 text-pm-xs text-content-muted truncate">{p.client_name || '—'}</p>
                      </div>
                      <StatusBadge {...leadProjectStatus(p.status)} size="xs" className="shrink-0" />
                    </div>
                    {p.deadline && (
                      <p className="mt-2 inline-flex items-center gap-1 text-pm-2xs text-content-muted tabular-nums">
                        <CalendarClock className="h-3 w-3" /> {formatDateRo(p.deadline)}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Page.Body>

      {/* Create lead */}
      <FormModal
        isOpen={isOpen}
        onClose={closeModal}
        title="Discuție nouă"
        fields={createFields}
        onSubmit={handleCreate}
        initialData={{ status: 'fara_contact', estimated_value: 0 }}
        submitLabel="Adaugă"
      />

      {/* Quick update (add note) */}
      {updateLead && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => { if (!savingUpdate) { setUpdateLead(null); setUpdateText(''); } }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-surface-primary shadow-[var(--elevation-4)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line/70 px-4 py-3">
              <h3 className="text-pm-sm font-semibold text-content-primary truncate">Update — {updateLead.client_name}</h3>
              <button onClick={() => { setUpdateLead(null); setUpdateText(''); }} className="p-1 rounded-lg text-content-muted hover:bg-surface-tertiary hover:text-content-primary" aria-label="Închide">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-pm-xs text-content-muted">Înregistrează o noutate pe lead. Resetează avertismentul „fără update”.</p>
              <textarea
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                rows={4}
                autoFocus
                placeholder="Ce e nou? Stadiul discuției, oferta, următorii pași…"
                className="w-full rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm text-content-primary placeholder:text-content-muted/70 focus:outline-none focus:border-accent/50 resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-line/70 px-4 py-3">
              <Button variant="secondary" size="sm" onClick={() => { setUpdateLead(null); setUpdateText(''); }} disabled={savingUpdate}>Anulează</Button>
              <Button size="sm" onClick={() => void saveQuickUpdate()} disabled={!updateText.trim() || savingUpdate}>
                {savingUpdate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                Salvează update
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}


// ── Pipeline stage column ──────────────────────────────────────────────────
function SalesColumn({
  label, color, count, value, money, isOver, onDragOver, onDragLeave, onDrop, children,
}: {
  label: string; color: string; count: number; value: number;
  money: (n: number, c?: string, d?: number) => string;
  isOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <Card
      tone="subtle"
      className={cn('flex flex-col min-h-0 overflow-hidden transition-colors', isOver && 'ring-2 ring-accent/40 bg-accent/5')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between gap-2 px-3.5 py-3 border-b border-line/70" style={{ borderTop: `3px solid ${color}` }}>
        <div className="min-w-0">
          <h3 className="text-pm-sm font-semibold text-content-primary truncate">{label}</h3>
          {value > 0 && <p className="mt-0.5 text-pm-2xs text-content-muted tabular-nums">{money(value, 'EUR', 0)}</p>}
        </div>
        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-lg bg-surface-tertiary text-pm-2xs font-semibold text-content-muted tabular-nums shrink-0">
          {count}
        </span>
      </div>
      <div key={count} className="flex-1 overflow-y-auto p-2.5 space-y-2 stagger-in">{children}</div>
    </Card>
  );
}

// ── Lead card ──────────────────────────────────────────────────────────────
function LeadCard({
  lead, money, isViewer, onOpen, onEdit, onUpdate, onDragStart,
}: {
  lead: SalesLead;
  money: (n: number, c?: string, d?: number) => string;
  isViewer: boolean;
  onOpen: (id: number) => void;
  onEdit: (id: number) => void;
  onUpdate: (lead: SalesLead) => void;
  onDragStart: () => void;
}) {
  const { stale, days } = staleInfo(lead);
  return (
    <div
      role="article"
      aria-label={`Lead ${lead.client_name}`}
      draggable={!isViewer}
      onDragStart={onDragStart}
      onClick={() => onOpen(lead.id)}
      className={cn(
        'vt-morph group cursor-pointer rounded-xl border bg-surface-primary p-3 transition-all hover:shadow-md hover:border-accent/40 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none active:translate-y-0',
        stale ? 'border-status-red/40' : 'border-line',
      )}
      style={{ viewTransitionName: vtName('lead', lead.id) }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-pm-sm font-semibold text-content-primary truncate">{lead.client_name}</p>
          <p className="mt-0.5 text-pm-xs text-content-muted truncate">{lead.product_interest || '—'}</p>
        </div>
        {!isViewer && (
          <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
            <IconButton intent="primary" size="sm" title="Înregistrează update"
              onClick={(e) => { e.stopPropagation(); onUpdate(lead); }}>
              <MessageSquare aria-hidden />
            </IconButton>
            <IconButton intent="primary" size="sm" title="Editează lead"
              onClick={(e) => { e.stopPropagation(); onEdit(lead.id); }}>
              <Pencil aria-hidden />
            </IconButton>
          </div>
        )}
      </div>

      {lead.estimated_value > 0 && (
        <div className="mt-2 text-pm-xs font-semibold text-content-primary tabular-nums">{money(lead.estimated_value, 'EUR', 0)}</div>
      )}

      <div className="mt-2 flex items-center gap-x-3 gap-y-1 flex-wrap text-pm-2xs text-content-muted">
        {lead.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.location}</span>}
        {lead.contact_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{lead.contact_phone}</span>}
        {lead.recent_notes.length > 0 && <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{lead.recent_notes.length}</span>}
        {stale && (
          <span className="ml-auto inline-flex items-center gap-1 font-medium text-status-red" title={`Fără update de ${days} zile`}>
            <Clock className="h-3 w-3" />{days}z
          </span>
        )}
      </div>
    </div>
  );
}
