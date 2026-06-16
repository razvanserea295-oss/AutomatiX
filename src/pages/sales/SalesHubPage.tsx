import { useState, useEffect, useCallback, useMemo } from 'react';
import { Target, Plus, ArrowRight, MapPin, AlertTriangle, TrendingUp, Users, DollarSign, FileText, Phone, Clock, Pencil, User as UserIcon, X as XIcon } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import EmptyState from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import type { User } from '@/core/types';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
import { formatDateTimeRo } from '@/lib/format';

import { useMoney } from '@/store/settingsStore';
import { useProjectStore } from '@/store/projectStore';
import { useSalesStore } from '@/store/salesStore';
import { useDashboardStore } from '@/store/dashboardStore';
import StatusBadge, { statusBorderClass } from '@/components/ui/StatusBadge';
import { leadStatus, leadProjectStatus } from '@/lib/statusTokens';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';
import { AnimatedTabs, HeroHeader, GlassCard, MetricValue } from '@/components/ui';
import { filterSelectCls, filterResetBtnCls } from '@/components/ui/filterControls';

interface LeadNote { id: number; content: string; created_by_name: string | null; created_at: string; }
interface Lead {
  id: number; client_name: string; contact_person: string | null; contact_email: string | null;
  contact_phone: string | null; product_interest: string | null; estimated_value: number;
  location: string | null; status: string; notes: string | null;
  last_contact_date: string | null; next_followup_date: string | null;
  assigned_to_name: string | null; converted_project_id: number | null; converted_project_name: string | null;
  created_by_name: string | null;
  created_at: string; updated_at: string; recent_notes: LeadNote[];
}
interface Stats { total_leads: number; fara_contact: number; decizie_client: number; decizie_noastra: number; in_negocieri: number; converted: number; pipeline_value: number; stale_leads: number; }

const LEAD_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'fara_contact',    label: 'Fără contact' },
  { value: 'decizie_client',  label: 'Decizie client' },
  { value: 'decizie_noastra', label: 'Decizie noastră' },
  { value: 'in_negocieri',    label: 'În negocieri' },
  { value: 'convertit',       label: 'Convertit' },
];

type Tab = 'pipeline' | 'executie';

export default function SalesHubPage({ user }: { user: User | null }) {
  const isManagerOrAdmin = ['admin', 'manager'].includes((user?.role_name || '').toLowerCase());
  const money = useMoney();
  const [tab, setTab] = useState<Tab>('pipeline');
  
  const [creatorFilter, setCreatorFilter] = useState('');
  const [sortBy, setSortBy] = useState('');
  const leads = useSalesStore(s => s.leads) as unknown as Lead[];
  const fetchLeadsStore = useSalesStore(s => s.fetchLeads);
  const createLeadStore = useSalesStore(s => s.createLead);
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const stats = useDashboardStore(s => s.salesStats) as unknown as Stats | null;
  const fetchSalesStats = useDashboardStore(s => s.fetchSalesStats);
  const [loading, setLoading] = useState(true);
  const { isOpen, openModal, closeModal } = useFormModal();
  const [, setLocation] = useLocation();

  const fetch = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchLeadsStore(true),
      fetchProjects(true),
      fetchSalesStats(),
    ]).finally(() => setLoading(false));
  }, [fetchLeadsStore, fetchProjects, fetchSalesStats]);

  useEffect(() => { fetch(); }, [fetch]);

  





  const openLead = useCallback((leadId: number) => {
    setLocation(`/sales-hub/${leadId}`);
  }, [setLocation]);

  
  
  const openLeadEdit = useCallback((leadId: number) => {
    try { sessionStorage.setItem('promix_lead_edit', String(leadId)); } catch {  }
    setLocation(`/sales-hub/${leadId}`);
  }, [setLocation]);

  
  
  
  
  const activeLeads = leads;
  const activeProjects = projects.filter(p => p.status !== 'finalizat');

  
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

  const fields: FormField[] = useMemo(() => [
    { name: 'client_name', label: 'Client / Firma', type: 'text' as const, required: true, placeholder: 'SC Solidhouse SRL' },
    { name: 'contact_person', label: 'Persoana de contact', type: 'text' as const, placeholder: 'Nume prenume' },
    { name: 'contact_email', label: 'Email', type: 'email' as const, placeholder: 'email@firma.ro' },
    { name: 'contact_phone', label: 'Telefon', type: 'tel' as const, placeholder: '07xx xxx xxx' },
    { name: 'product_interest', label: 'Produs / Interes', type: 'text' as const, required: true, placeholder: 'Statie betoane M60, Statie pavele...' },
    { name: 'location', label: 'Locație', type: 'text' as const, placeholder: 'Oras, judet' },
    { name: 'estimated_value', label: 'Valoare estimata (EUR)', type: 'number' as const, placeholder: '0' },
    { name: 'status', label: 'Status', type: 'select' as const, options: LEAD_STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label })) },
    { name: 'next_followup_date', label: 'Data urmatorul followup', type: 'date' as const },
    { name: 'notes', label: 'Note initiale', type: 'textarea' as const },
  ], []);

  const handleCreate = async (data: Record<string, unknown>) => {
    const newLead = await createLeadStore({
      ...data,
      estimated_value: data.estimated_value ? Number(data.estimated_value) : 0,
    });
    await fetchSalesStats();
    
    
    if (newLead && typeof (newLead as { id?: number }).id === 'number') {
      setLocation(`/sales-hub/${(newLead as { id: number }).id}`);
    }
  };

  
  const statusBreakdown = [
    { value: 'fara_contact',    count: stats?.fara_contact ?? 0 },
    { value: 'decizie_client',  count: stats?.decizie_client ?? 0 },
    { value: 'decizie_noastra', count: stats?.decizie_noastra ?? 0 },
    { value: 'in_negocieri',    count: stats?.in_negocieri ?? 0 },
    { value: 'convertit',       count: stats?.converted ?? 0 },
  ];

  return (
    <Page className="mod-shell">
      <div className="mod-canvas">

        {}
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Vânzări"
          icon={Target}
          title="Sales Hub"
          subtitle="Pipeline-ul de discuții cu clienții și proiectele trecute în execuție"
          actions={<>
            <Link href="/quotations">
              <Button size="sm" variant="outline">
                <FileText className="h-3.5 w-3.5" /> Oferte
              </Button>
            </Link>
            <Button size="sm" onClick={() => openModal()}>
              <Plus className="h-3.5 w-3.5" /> Discuție nouă
            </Button>
          </>}
        />

        {}
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={Users}      label="În discuție"      value={stats?.total_leads ?? 0} />
          <KpiMini icon={TrendingUp} label="În negocieri"     value={stats?.in_negocieri ?? 0} />
          <KpiMini icon={DollarSign} label="Valoare pipeline" value={stats?.pipeline_value ?? 0} format={(n) => money(n, 'EUR', 0)} />
          <KpiMini icon={Target}     label="Convertite"       value={stats?.converted ?? 0} />
        </div>

        {}
        <div className="mod-bento">

          {}
          <GlassCard size="regular" className="enter-up !p-0 overflow-hidden" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center justify-between gap-3 flex-wrap px-5 pt-5 pb-3">
              <AnimatedTabs
                active={tab}
                onChange={(id) => setTab(id as Tab)}
                tabs={[
                  { id: 'pipeline', label: 'Discuții cu clienți' },
                  { id: 'executie', label: 'Proiecte în execuție' },
                ]}
              />
            </div>

            {}
            {tab === 'pipeline' && isManagerOrAdmin && activeLeads.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap px-5 pb-3">
                <span className="text-pm-2xs uppercase font-bold tracking-wide text-content-muted">Lead-uri pe utilizator</span>
                <select
                  value={creatorFilter}
                  onChange={e => setCreatorFilter(e.target.value)}
                  className={filterSelectCls(creatorFilter !== '')}
                >
                  <option value="">Toți utilizatorii</option>
                  {creators.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className={filterSelectCls(sortBy !== '')}
                >
                  <option value="">Sortare: implicită</option>
                  <option value="user">Sortare: după utilizator</option>
                  <option value="newest">Sortare: cele mai noi</option>
                  <option value="oldest">Sortare: cele mai vechi</option>
                </select>
                {(creatorFilter || sortBy) && (
                  <button type="button" onClick={() => { setCreatorFilter(''); setSortBy(''); }}
                    className={filterResetBtnCls}>
                    <XIcon className="h-3 w-3" /> Resetează
                  </button>
                )}
                <span className="text-pm-2xs text-content-muted ml-auto">{displayedLeads.length} / {activeLeads.length}</span>
              </div>
            )}

            {}
            <div className="density-compact min-h-[55vh] max-h-[72vh] overflow-y-auto border-t border-line/40">
        {loading ? (
          <div className="p-4"><SkeletonList rows={5} /></div>
        ) : tab === 'pipeline' ? (
          activeLeads.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Niciun lead în pipeline"
              body="Adaugă prima discuție cu un client pentru a începe să-ți construiești portofoliul."
              actionLabel="Adaugă discuție"
              onAction={() => openModal()}
            />
          ) : (
            <div>
              {displayedLeads.map((lead, idx) => {
                const tok = leadStatus(lead.status);
                
                
                
                
                
                
                const lastTouch = lead.last_contact_date || lead.updated_at;
                const daysSince = lastTouch
                  ? Math.floor((Date.now() - new Date(lastTouch).getTime()) / 86_400_000)
                  : null;
                const isStale = lead.status !== 'convertit' && daysSince !== null && daysSince >= 7;
                return (
                  <div
                    key={lead.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openLead(lead.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLead(lead.id); } }}
                    className={`group w-full text-left px-4 py-3 cursor-pointer transition-colors hover:bg-surface-tertiary/30 focus:outline-none focus-visible:bg-surface-tertiary/40 ${
                      isStale
                        ? 'border-l-4 border-l-status-red bg-status-red/5'
                        : `border-l-2 ${statusBorderClass(tok.tone)}`
                    } ${idx < displayedLeads.length - 1 ? 'border-b border-line' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-pm-sm font-semibold text-content-primary">{lead.client_name}</p>
                          {isStale && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-pm-2xs font-semibold bg-status-red/15 text-status-red border border-status-red/30"
                              title={`Fără update de ${daysSince} zile — sună clientul sau adaugă o notă în pagina lead-ului.`}
                            >
                              <Clock className="h-2.5 w-2.5" />
                              Fără update {daysSince}z
                            </span>
                          )}
                        </div>
                        <p className="text-pm-xs text-content-muted">{lead.product_interest || '—'}</p>
                        {isManagerOrAdmin && (
                          <p className="text-pm-2xs text-content-muted mt-0.5 flex items-center gap-1">
                            <UserIcon className="h-3 w-3 shrink-0" />
                            <span className="font-medium text-content-secondary">{lead.created_by_name || '—'}</span>
                            <span className="text-content-muted/70">· {formatDateTimeRo(lead.created_at)}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-pm-xs text-content-muted flex-wrap">
                          {lead.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{lead.location}</span>}
                          {lead.contact_person && <span>{lead.contact_person}</span>}
                          {lead.contact_phone && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{lead.contact_phone}</span>}
                          {lead.recent_notes.length > 0 && (
                            <span className="text-content-muted">{lead.recent_notes.length} comentarii</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <StatusBadge {...tok} size="xs" />
                        {lead.estimated_value > 0 && (
                          <p className="text-pm-xs font-medium tabular-nums text-content-primary">{money(lead.estimated_value, 'EUR', 0)}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openLeadEdit(lead.id); }}
                            title="Editează lead"
                            aria-label={`Editează ${lead.client_name}`}
                            className="opacity-70 group-hover:opacity-100 inline-flex items-center justify-center h-6 w-6 rounded text-content-muted hover:text-accent hover:bg-accent/10 transition-all"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <ArrowRight className="h-3 w-3 text-content-muted self-center" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {displayedLeads.length === 0 && (
                <p className="px-4 py-8 text-center text-pm-xs text-content-muted">Niciun lead pentru acest filtru.</p>
              )}
            </div>
          )
        ) : (
          activeProjects.length === 0 ? (
            <EmptyState
              icon={ArrowRight}
              title="Niciun proiect în execuție"
              body="Convertește o discuție din pipeline în producție pentru a o vedea aici."
              actionLabel="Vezi pipeline-ul"
              onAction={() => setTab('pipeline')}
            />
          ) : (
            <div>
              {activeProjects.map((p, idx) => (
                <div key={p.id} className={`px-4 py-3 border-l-2 border-l-accent ${idx < activeProjects.length - 1 ? 'border-b border-line' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-pm-sm font-semibold text-content-primary">{p.name}</p>
                      <p className="text-pm-xs text-content-muted">{p.client_name}</p>
                      {p.deadline && <p className="text-pm-2xs text-content-muted mt-0.5">Deadline: {p.deadline}</p>}
                    </div>
                    <StatusBadge {...leadProjectStatus(p.status)} size="xs" className="shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
            </div>
          </GlassCard>

          {}
          <div className="mod-aside enter-up" style={{ animationDelay: '240ms' }}>
            {stats && stats.stale_leads > 0 && (
              <GlassCard size="regular" className="!p-4 border-l-2 !border-l-status-red/60">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-status-red shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-status-red">{stats.stale_leads} lead-uri fără update de 7+ zile</p>
                    <p className="text-xs text-content-secondary mt-0.5">Sună clientul sau adaugă o notă — sunt marcate cu roșu în listă.</p>
                  </div>
                </div>
              </GlassCard>
            )}

            <GlassCard size="regular" className="!p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <Target className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">Pe status</span>
              </div>
              <div className="density-compact px-5 pb-5 space-y-2">
                {statusBreakdown.map(s => (
                  <div key={s.value} className="flex items-center justify-between gap-2 glass-surface rounded-lg p-2.5">
                    <StatusBadge {...leadStatus(s.value)} size="xs" />
                    <span className="text-sm font-semibold tabular-nums text-content-primary">{s.count}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2 pt-1 mt-1 border-t border-line/40 px-1">
                  <span className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">Total în discuție</span>
                  <span className="text-sm font-semibold tabular-nums text-content-primary">{stats?.total_leads ?? 0}</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      <FormModal isOpen={isOpen} onClose={closeModal} title="Discuție noua" fields={fields} onSubmit={handleCreate} submitLabel="Adaugă" />
    </Page>
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
