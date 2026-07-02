

import { useState, useEffect, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Plus, Send, Download, Trash2, Check, X, Loader2, FileText, Eye, ArrowRight, Mail, Upload, Paperclip, Search as SearchIcon, XCircle, Repeat } from '@/icons';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { toast } from '@/store/toastStore';
import { useClientStore } from '@/store/clientStore';
import { useProjectStore } from '@/store/projectStore';
import { useSalesStore } from '@/store/salesStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import { useMoney } from '@/store/settingsStore';

import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import Page from '@/redesign/ui/Page';
import { PageChrome, DashboardLayout, Panel, ListPanel, CardSlot, PAGE_GRID_12, PANEL_HEAD } from '@/app-ui';
import KpiCard from '@/redesign/ui/KpiCard';
import StatusBadge from '@/redesign/ui/StatusBadge';
import FilterBar from '@/redesign/ui/FilterBar';
import { EmptyState, Skeleton } from '@/redesign/ui';
import { THEAD_STICKY } from '@/redesign/ui/SortableTh';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';

interface QuotationLine {
  id?: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  total: number;
  order_index: number;
}
interface QuotationEvent {
  id: number; event_type: string; actor_name: string | null; created_at: string; metadata: string | null;
}
interface Quotation {
  id: number; quotation_number: string; lead_id: number | null; project_id: number | null;
  client_id: number | null; client_name: string; contact_email: string | null;
  title: string; description: string | null;
  currency: string; tva_rate: number; discount_percent: number;
  subtotal: number; tva_amount: number; total: number;
  status: string; valid_until: string | null;
  sent_at: string | null; viewed_at: string | null; decided_at: string | null; rejection_reason: string | null;
  tracking_token: string; converted_contract_id: number | null;
  notes: string | null; created_by_name: string | null; created_at: string; updated_at: string;
  lines: QuotationLine[]; events: QuotationEvent[];
}
interface Stats {
  draft: number; sent: number; viewed: number; accepted: number; rejected: number;
  converted: number; expired: number; pipeline_value: number;
}

type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'special';
const STATUS_TONE: Record<string, { label: string; tone: StatusTone }> = {
  draft:     { label: 'Ciornă',     tone: 'neutral' },
  sent:      { label: 'Trimisă',    tone: 'info' },
  viewed:    { label: 'Vizualizată', tone: 'warning' },
  accepted:  { label: 'Acceptată',  tone: 'success' },
  rejected:  { label: 'Refuzată',   tone: 'danger' },
  expired:   { label: 'Expirată',   tone: 'neutral' },
  converted: { label: 'Convertită', tone: 'special' },
};

interface QuotationAttachment {
  id: number; filename: string | null; mime: string | null;
  size: number; created_by_name: string | null; created_at: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Eroare la citirea fișierului'));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(base64Len: number): string {
  if (!base64Len) return '—';
  const bytes = Math.round(base64Len * 0.75);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const MAX_FILE_BYTES = 35 * 1024 * 1024;

export default function QuotationsPage({ user: _user }: { user: User | null }) {
  const money = useMoney();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [attachments, setAttachments] = useState<QuotationAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const clients = useClientStore(s => s.clients);
  const fetchClients = useClientStore(s => s.fetchClients);
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const leads = useSalesStore(s => s.leads);
  const fetchLeads = useSalesStore(s => s.fetchLeads);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiCommand<Quotation[]>('list_quotations'),
      apiCommand<Stats>('get_quotation_stats'),
    ]).then(([qs, st]) => {
      setQuotations(qs || []);
      setStats(st);
    }).catch(() => { setQuotations([]); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
    void fetchClients();
    void fetchProjects();
    void fetchLeads();
  }, [fetchAll, fetchClients, fetchProjects, fetchLeads]);

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({ title: 'Ștergi oferta?', body: 'Acțiune ireversibilă.', confirmLabel: 'Șterge', danger: true });
    if (!ok) return;
    try {
      await apiCommand('delete_quotation', { quotation_id: id });
      toast.success('Oferta ștearsă');
      if (selected?.id === id) setSelected(null);
      fetchAll();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const handleDownload = async (id: number) => {
    try {
      const { downloadOfferPdfFromQuotation } = await import('@/lib/downloadPdf');
      await downloadOfferPdfFromQuotation(id);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare PDF'); }
  };

  const handleDecide = async (id: number, decision: 'accepted' | 'rejected') => {
    let reason = '';
    if (decision === 'rejected') {
      const r = window.prompt('Motiv refuz (opțional):', '');
      if (r === null) return;
      reason = r;
    }
    try {
      const updated = await apiCommand<Quotation>('decide_quotation', { quotation_id: id, decision, reason });
      setSelected(updated);
      toast.success(decision === 'accepted' ? 'Oferta acceptată' : 'Oferta refuzată');
      fetchAll();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const loadAttachments = useCallback(async (quotationId: number) => {
    try {
      const list = await apiCommand<QuotationAttachment[]>('list_quotation_attachments', { quotation_id: quotationId });
      setAttachments(list || []);
    } catch { setAttachments([]); }
  }, []);

  useEffect(() => {
    if (selected?.id) void loadAttachments(selected.id);
    else setAttachments([]);
  }, [selected?.id, loadAttachments]);

  const handleUploadFiles = async (files: File[]) => {
    if (!selected) return;
    setUploading(true);
    try {
      let n = 0;
      for (const f of files) {
        if (!f || f.size === 0) continue;
        if (f.size > MAX_FILE_BYTES) { toast.error(`„${f.name}" depășește 35 MB și nu a fost încărcat`); continue; }
        const data = await fileToBase64(f);
        await apiCommand('add_quotation_attachment', { quotation_id: selected.id, filename: f.name, mime: f.type || 'application/octet-stream', data });
        n++;
      }
      if (n > 0) { toast.success(`${n} fișier(e) încărcat(e)`); await loadAttachments(selected.id); }
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la încărcare'); }
    finally { setUploading(false); }
  };

  const handleDeleteAttachment = async (id: number) => {
    if (!(await confirmDialog({ title: 'Șterge fișierul?', body: 'Documentul încărcat va fi eliminat din ofertă.', danger: true }))) return;
    try {
      await apiCommand('delete_quotation_attachment', { id });
      toast.success('Fișier șters');
      if (selected) await loadAttachments(selected.id);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la ștergere'); }
  };

  const handleDownloadAttachment = async (id: number) => {
    const { downloadOneQuotationAttachment } = await import('@/lib/downloadPdf');
    await downloadOneQuotationAttachment(id);
  };

  const selectQuotation = (q: Quotation) => {
    const next = selected?.id === q.id ? null : q;
    startMorphTransition(
      () => flushSync(() => setSelected(next)),
      { dir: next === null ? 'back' : 'forward' },
    );
  };

  const visibleQuotations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotations.filter(item => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.quotation_number.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.client_name.toLowerCase().includes(q)
      );
    });
  }, [quotations, search, statusFilter]);

  const statusFilterDef = useMemo(() => ([{
    key: 'status',
    label: 'Toate statusurile',
    value: statusFilter,
    onChange: setStatusFilter,
    options: Object.entries(STATUS_TONE).map(([value, meta]) => ({ value, label: meta.label })),
  }]), [statusFilter]);

  const funnelTotal = useMemo(() => {
    if (!stats) return 0;
    return stats.draft + stats.sent + stats.viewed + stats.accepted + stats.rejected + stats.converted + stats.expired;
  }, [stats]);

  return (
    <>
    <DashboardLayout
        
        chrome={(
          <PageChrome
            actions={
              <Button size="md" onClick={() => setShowBuilder(true)}>
                <Plus className="h-4 w-4" /> Ofertă nouă
              </Button>
            }
            toolbar={
              <FilterBar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Caută număr, titlu, client..."
                filters={statusFilterDef}
                clearable
                onClearAll={() => { setSearch(''); setStatusFilter(''); }}
              />
            }
          />
        )}
      kpis={
        <Page.Kpis cols={4}>
          <KpiCard icon={Send}       iconColor="text-status-blue"   label="Trimise"          value={loading ? '—' : (stats?.sent ?? 0)} />
          <KpiCard icon={Eye}        iconColor="text-status-amber"  label="Vizualizate"      value={loading ? '—' : (stats?.viewed ?? 0)} />
          <KpiCard icon={Check}      iconColor="text-status-green"  label="Acceptate"        value={loading ? '—' : (stats?.accepted ?? 0)} />
          <KpiCard icon={ArrowRight} iconColor="text-accent"        label="Valoare pipeline" value={loading ? '—' : money(stats?.pipeline_value ?? 0, 'RON')} />
        </Page.Kpis>
      }
    >
        <div className={PAGE_GRID_12}>
          <CardSlot size="lg">
            {!selected ? (
              <Panel fill className="flex-1" title="Nicio ofertă selectată" subtitle="Alege o ofertă din listă sau creează una nouă">
                <EmptyState
                  icon={FileText}
                  title="Nicio ofertă selectată"
                  description="Alege o ofertă din lista alăturată pentru a-i vedea detaliile, pozițiile, documentele și tracking-ul — sau creează una nouă."
                  action={
                    <Button size="sm" onClick={() => setShowBuilder(true)}>
                      <Plus className="h-3.5 w-3.5" /> Ofertă nouă
                    </Button>
                  }
                />
              </Panel>
            ) : (
              <Panel fill scroll className="min-h-0 flex-1" bodyClassName="p-0">
                <div className="min-h-0 flex-1 overflow-y-auto" style={{ viewTransitionName: vtName('quotation', selected.id) }}>
                  <QuotationDetail
                    q={selected}
                    attachments={attachments}
                    uploading={uploading}
                    onUploadFiles={handleUploadFiles}
                    onDeleteAttachment={handleDeleteAttachment}
                    onDownloadAttachment={handleDownloadAttachment}
                    onSend={() => setShowSend(true)}
                    onConvert={() => setShowConvert(true)}
                    onDelete={() => handleDelete(selected.id)}
                    onDownload={() => handleDownload(selected.id)}
                    onDecide={(d) => handleDecide(selected.id, d)}
                    onClose={() => selectQuotation(selected)}
                  />
                </div>
              </Panel>
            )}
          </CardSlot>
          <ListPanel
            size="md"
            title="Oferte"
            subtitle={`${visibleQuotations.length}${(search || statusFilter) ? ` / ${quotations.length}` : ''} ${quotations.length === 1 ? 'ofertă' : 'oferte'}`}
            bodyClassName="density-compact"
          >
                {loading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={56} />)}
                  </div>
                ) : visibleQuotations.length === 0 ? (
                  quotations.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="Nicio ofertă"
                      description="Creează prima ofertă comercială pentru un client."
                      action={
                        <Button size="sm" onClick={() => setShowBuilder(true)}>
                          <Plus className="h-3.5 w-3.5" /> Ofertă nouă
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      icon={SearchIcon}
                      title="Niciun rezultat"
                      description="Nicio ofertă nu se potrivește cu filtrele curente."
                    />
                  )
                ) : (
                  <div className="stagger-in" key={`${statusFilter}|${search}`}>
                    {visibleQuotations.map((q, idx) => {
                      const tone = STATUS_TONE[q.status] || { label: q.status, tone: 'neutral' as const };
                      const isSel = selected?.id === q.id;
                      return (
                        <button key={q.id} onClick={() => selectQuotation(q)} type="button"
                          style={{ viewTransitionName: isSel ? vtName('quotation', q.id) : undefined }}
                          className={`relative w-full text-left px-4 py-3 transition-smooth duration-150 outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-[0.99] ${
                            idx < visibleQuotations.length - 1 ? 'border-b border-line' : ''
                          } ${
                            isSel ? 'bg-accent/5 border-l-2 border-l-accent vt-morph' : 'hover:bg-surface-tertiary/30'
                          }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-pm-2xs font-mono text-accent">{q.quotation_number}</span>
                                <StatusBadge label={tone.label} tone={tone.tone} size="xs" />
                              </div>
                              <p className="text-pm-sm font-semibold text-content-primary truncate">{q.title}</p>
                              <p className="text-pm-xs text-content-muted truncate">{q.client_name}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-pm-sm font-semibold tabular-nums text-content-primary">{money(q.total, q.currency)}</p>
                              <p className="text-pm-2xs text-content-muted">{q.lines.length} {q.lines.length === 1 ? 'poziție' : 'poziții'}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
          </ListPanel>
        </div>
        <Panel className="shrink-0" title="Distribuția ofertelor pe status" subtitle="Toate ofertele din pipeline, grupate după stadiu">
          <div className="grid grid-cols-2 gap-3 stagger-in sm:grid-cols-4 xl:grid-cols-7" key={loading ? 'loading' : 'ready'}>
            <FunnelStat icon={FileText}    label="Ciorne"      value={stats?.draft ?? 0}     total={funnelTotal} tone="neutral" loading={loading} />
            <FunnelStat icon={Send}        label="Trimise"     value={stats?.sent ?? 0}      total={funnelTotal} tone="info"    loading={loading} />
            <FunnelStat icon={Eye}         label="Vizualizate" value={stats?.viewed ?? 0}    total={funnelTotal} tone="warning" loading={loading} />
            <FunnelStat icon={Check}       label="Acceptate"   value={stats?.accepted ?? 0}  total={funnelTotal} tone="success" loading={loading} />
            <FunnelStat icon={XCircle}     label="Refuzate"    value={stats?.rejected ?? 0}  total={funnelTotal} tone="danger"  loading={loading} />
            <FunnelStat icon={Repeat}      label="Convertite"  value={stats?.converted ?? 0} total={funnelTotal} tone="special" loading={loading} />
            <FunnelStat icon={ArrowRight}  label="Expirate"    value={stats?.expired ?? 0}   total={funnelTotal} tone="neutral" loading={loading} />
          </div>
        </Panel>

    </DashboardLayout>

      {showBuilder && (
        <QuotationBuilder
          clients={clients}
          leads={leads as any[]}
          onClose={() => setShowBuilder(false)}
          onCreated={(q) => { setShowBuilder(false); setSelected(q); fetchAll(); }}
        />
      )}

      {showSend && selected && (
        <SendQuotationModal
          quotation={selected}
          onClose={() => setShowSend(false)}
          onSent={(q) => { setShowSend(false); setSelected(q); fetchAll(); }}
        />
      )}

      {showConvert && selected && (
        <ConvertModal
          quotation={selected}
          projects={projects}
          onClose={() => setShowConvert(false)}
          onConverted={(q) => { setShowConvert(false); setSelected(q); fetchAll(); }}
        />
      )}
    </>
  );
}

function FunnelStat({ icon: Icon, label, value, total, tone, loading }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; total?: number; tone: StatusTone; loading?: boolean;
}) {
  const toneText: Record<StatusTone, string> = {
    neutral: 'text-content-muted', info: 'text-status-blue', warning: 'text-status-amber',
    success: 'text-status-green', danger: 'text-status-red', special: 'text-status-purple',
  };
  const toneBar: Record<StatusTone, string> = {
    neutral: 'bg-content-muted/40', info: 'bg-status-blue', warning: 'bg-status-amber',
    success: 'bg-status-green', danger: 'bg-status-red', special: 'bg-status-purple',
  };
  const pct = total && total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="rounded-xl border border-line bg-surface-primary px-4 py-3 transition-smooth duration-150 hover:border-line hover:shadow-[var(--elevation-2)]">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg bg-surface-tertiary ${toneText[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted truncate">{label}</p>
      </div>
      {loading
        ? <Skeleton width={36} height={22} />
        : <p className="text-pm-2xl font-semibold tabular-nums text-content-primary leading-none">{value}</p>}
      {!loading && (
        <div className="mt-2 h-1 rounded-full bg-surface-tertiary overflow-hidden" aria-hidden>
          <div className={`anim-bar-grow h-full rounded-full ${toneBar[tone]}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function QuotationDetail({ q, attachments, uploading, onUploadFiles, onDeleteAttachment, onDownloadAttachment, onSend, onConvert, onDelete, onDownload, onDecide, onClose }: {
  q: Quotation;
  attachments: QuotationAttachment[];
  uploading: boolean;
  onUploadFiles: (files: File[]) => void;
  onDeleteAttachment: (id: number) => void;
  onDownloadAttachment: (id: number) => void;
  onSend: () => void;
  onConvert: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onDecide: (d: 'accepted' | 'rejected') => void;
  onClose: () => void;
}) {
  const tone = STATUS_TONE[q.status] || { label: q.status, tone: 'neutral' as const };
  return (
    <div>
      <div className={`${PANEL_HEAD} flex items-start justify-between gap-3`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-pm-2xs font-mono text-accent">{q.quotation_number}</span>
            <StatusBadge label={tone.label} tone={tone.tone} size="xs" />
          </div>
          <h3 className="text-pm-lg font-semibold text-content-primary leading-tight truncate">{q.title}</h3>
          <p className="text-pm-xs text-content-muted truncate">{q.client_name}</p>
        </div>
        <IconButton
          size="sm"
          onClick={onClose}
          title="Închide"
          aria-label="Închide"
          className="hover:rotate-90 shrink-0"
        >
          <X />
        </IconButton>
      </div>
      <div className="px-5 py-3 border-b border-line flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onDownload}>
          <Download className="h-3 w-3" /> PDF
        </Button>
        {q.status !== 'converted' && q.status !== 'rejected' && (
          <Button size="sm" onClick={onSend}>
            <Send className="h-3 w-3" /> Trimite email
          </Button>
        )}
        {(q.status === 'sent' || q.status === 'viewed') && (
          <>
            <Button size="sm" variant="outline" onClick={() => onDecide('accepted')}>
              <Check className="h-3 w-3" /> Acceptată
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDecide('rejected')}>
              <X className="h-3 w-3" /> Refuzată
            </Button>
          </>
        )}
        {q.status === 'accepted' && !q.converted_contract_id && (
          <Button size="sm" onClick={onConvert}>
            <ArrowRight className="h-3 w-3" /> Convertește în contract
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-0">
        <div className="xl:col-span-2 border-b xl:border-b-0 xl:border-r border-line">
          <header className="flex items-center gap-2.5 px-5 py-2.5 border-b border-line/60">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-surface-tertiary text-content-muted">
              <FileText className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-pm-sm font-semibold text-content-primary">Poziții ({q.lines.length})</h2>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-pm-xs">
              <thead className={THEAD_STICKY}>
                <tr>
                  <th className="px-5 py-2 font-bold uppercase tracking-wide text-pm-2xs">Descriere</th>
                  <th className="px-2 py-2 font-bold uppercase tracking-wide text-pm-2xs text-right whitespace-nowrap">Cant.</th>
                  <th className="px-2 py-2 font-bold uppercase tracking-wide text-pm-2xs text-right whitespace-nowrap">Preț unit.</th>
                  <th className="px-5 py-2 font-bold uppercase tracking-wide text-pm-2xs text-right whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody>
                {q.lines.map((l, idx) => (
                  <tr key={l.id ?? idx} className={`transition-colors hover:bg-surface-tertiary/40 ${idx < q.lines.length - 1 ? 'border-b border-line/40' : ''}`}>
                    <td className="px-5 py-2 align-top">
                      <p className="font-medium text-content-primary">{l.description}</p>
                      {l.discount_percent ? <p className="text-content-muted text-pm-2xs">discount {l.discount_percent}%</p> : null}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-content-secondary whitespace-nowrap align-top">{l.quantity} {l.unit}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-content-secondary whitespace-nowrap align-top">{l.unit_price.toFixed(2)} {q.currency}</td>
                    <td className="px-5 py-2 text-right tabular-nums font-semibold text-content-primary whitespace-nowrap align-top">{l.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="xl:col-span-1">
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-line/60 space-y-1.5">
            <Row label="Subtotal" value={`${q.subtotal.toFixed(2)} ${q.currency}`} />
            <Row label={`TVA ${(q.tva_rate * 100).toFixed(0)}%`} value={`${q.tva_amount.toFixed(2)} ${q.currency}`} />
            <div className="border-t border-line pt-1.5 mt-1.5 flex justify-between font-semibold text-content-primary">
              <span>TOTAL</span>
              <span className="tabular-nums">{q.total.toFixed(2)} {q.currency}</span>
            </div>
          </div>
          <div className="px-4 py-3 sm:px-6 sm:py-4 text-pm-xs space-y-1.5">
            <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-2">Tracking</p>
            <div className="text-pm-xs space-y-1">
              {q.sent_at && <Row label="Trimisă" value={new Date(q.sent_at).toLocaleString('ro-RO')} icon={<Mail className="h-3 w-3 text-status-blue" />} />}
              {q.viewed_at && <Row label="Vizualizată" value={new Date(q.viewed_at).toLocaleString('ro-RO')} icon={<Eye className="h-3 w-3 text-status-amber" />} />}
              {q.decided_at && <Row label={q.status === 'accepted' ? 'Acceptată' : 'Refuzată'} value={new Date(q.decided_at).toLocaleString('ro-RO')} />}
              {q.rejection_reason && <Row label="Motiv refuz" value={q.rejection_reason} />}
              {q.valid_until && <Row label="Valabilă până" value={q.valid_until} />}
              {q.events.length === 0 && !q.sent_at && <p className="text-content-muted italic">Niciun eveniment încă</p>}
            </div>
          </div>
        </div>
      </div>

      {
}
      <div className="border-t border-line">
        <header className="flex items-center gap-2.5 px-5 py-2.5 border-b border-line/60">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-surface-tertiary text-content-muted">
            <Paperclip className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-pm-sm font-semibold text-content-primary flex-1">Documente ({attachments.length})</h2>
          <label className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-pm-2xs font-semibold transition-smooth duration-150 outline-none focus-within:shadow-[var(--ring-soft)] ${uploading ? 'text-content-muted cursor-not-allowed' : 'text-accent hover:underline cursor-pointer'}`}>
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {uploading ? 'Se încarcă...' : 'Încarcă'}
            <input type="file" multiple className="hidden" disabled={uploading}
              onChange={(e) => { const fs = Array.from(e.target.files || []); e.currentTarget.value = ''; if (fs.length) onUploadFiles(fs); }} />
          </label>
        </header>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {attachments.length === 0 ? (
            <div className="sm:col-span-2">
              <EmptyState
                icon={Paperclip}
                title="Niciun document"
                description="Folosește „Încarcă” pentru a atașa documente (orice format)."
              />
            </div>
          ) : attachments.map((a) => (
            <div key={a.id} className="group flex items-center gap-2 rounded-lg border border-line bg-surface-primary px-2.5 py-1.5 hover:bg-surface-tertiary/40 transition-colors">
              <FileText className="h-4 w-4 text-content-muted shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-pm-xs text-content-primary truncate" title={a.filename || 'fișier'}>{a.filename || 'fișier'}</p>
                <p className="text-pm-2xs text-content-muted truncate">
                  {formatFileSize(a.size)} · încărcat de {a.created_by_name || 'necunoscut'}{a.created_at ? ` · ${a.created_at.split(' ')[0]}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                <IconButton intent="primary" size="sm" onClick={() => onDownloadAttachment(a.id)} title="Descarcă fișierul" aria-label="Descarcă fișierul"><Download /></IconButton>
                <IconButton intent="danger" size="sm" onClick={() => onDeleteAttachment(a.id)} title="Șterge fișierul" aria-label="Șterge fișierul"><Trash2 /></IconButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-content-muted flex items-center gap-1">{icon}{label}</span>
      <span className="text-content-primary text-right">{value}</span>
    </div>
  );
}

function QuotationBuilder({ clients, leads, onClose, onCreated }: {
  clients: any[]; leads: any[]; onClose: () => void; onCreated: (q: Quotation) => void;
}) {
  const [clientId, setClientId] = useState<number | ''>('');
  const [clientName, setClientName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [leadId, setLeadId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [tvaRate, setTvaRate] = useState(0.21);
  const [currency, setCurrency] = useState('RON');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ description: string; quantity: number; unit: string; unit_price: number; discount_percent: number }>>([
    { description: '', quantity: 1, unit: 'buc', unit_price: 0, discount_percent: 0 },
  ]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const totals = useMemo(() => {
    const lineSum = lines.reduce((acc, l) => acc + (l.quantity * l.unit_price * (1 - (l.discount_percent || 0) / 100)), 0);
    const subtotal = lineSum * (1 - (discountPercent || 0) / 100);
    const tva = subtotal * tvaRate;
    return { subtotal, tva, total: subtotal + tva };
  }, [lines, discountPercent, tvaRate]);

  const handleClientChange = (id: number | '') => {
    setClientId(id);
    if (id) {
      const c = clients.find(x => x.id === id);
      if (c) {
        setClientName(c.name);
        setContactEmail(c.email || '');
      }
    }
  };

  const handleLeadChange = (id: number | '') => {
    setLeadId(id);
    if (id) {
      const l = leads.find(x => x.id === id);
      if (l) {
        setClientName(l.client_name);
        setContactEmail(l.contact_email || '');
        setTitle(l.product_interest || '');
      }
    }
  };

  const updateLine = (idx: number, field: string, value: any) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addLine = () => setLines(prev => [...prev, { description: '', quantity: 1, unit: 'buc', unit_price: 0, discount_percent: 0 }]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!clientName.trim() || !title.trim() || lines.length === 0 || lines.some(l => !l.description.trim() || l.unit_price <= 0)) {
      toast.error('Client, titlu și cel puțin o poziție validă (cu preț > 0) sunt obligatorii');
      return;
    }
    setSubmitting(true);
    try {
      const created = await apiCommand<Quotation>('create_quotation', {
        request: {
          lead_id: leadId || null,
          client_id: clientId || null,
          client_name: clientName.trim(),
          contact_email: contactEmail || null,
          title: title.trim(),
          description: description || null,
          valid_until: validUntil || null,
          discount_percent: discountPercent,
          tva_rate: tvaRate,
          currency,
          notes: notes || null,
          lines: lines.map(l => ({ ...l, quantity: Number(l.quantity), unit_price: Number(l.unit_price), discount_percent: Number(l.discount_percent || 0) })),
        },
      });
      
      let uploaded = 0;
      for (const f of files) {
        if (!f || f.size === 0) continue;
        if (f.size > MAX_FILE_BYTES) { toast.error(`„${f.name}" depășește 35 MB și nu a fost încărcat`); continue; }
        const data = await fileToBase64(f);
        await apiCommand('add_quotation_attachment', { quotation_id: created.id, filename: f.name, mime: f.type || 'application/octet-stream', data });
        uploaded++;
      }
      toast.success(uploaded > 0 ? `Ofertă creată · ${uploaded} fișier(e) încărcat(e)` : 'Ofertă creată');
      onCreated(created);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare creare ofertă');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 anim-fade-in">
      <div className="bg-surface-elevated border border-line rounded-2xl shadow-[var(--elevation-4)] w-full max-w-4xl max-h-[90vh] overflow-y-auto anim-scale-in">
        <div className="sticky top-0 bg-surface-elevated border-b border-line/70 px-5 h-14 flex items-center justify-between">
          <h3 className="text-pm-md font-semibold text-content-primary">Ofertă nouă</h3>
          <button type="button" onClick={onClose} aria-label="Închide" className="p-2 rounded-xl text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-smooth duration-150 hover:rotate-90 outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-95"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lead asociat (opțional)">
              <select value={leadId} onChange={e => handleLeadChange(e.target.value ? Number(e.target.value) : '')} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors">
                <option value="">— niciunul —</option>
                {leads.filter(l => l.status !== 'convertit').map(l => (
                  <option key={l.id} value={l.id}>{l.client_name} — {l.product_interest}</option>
                ))}
              </select>
            </Field>
            <Field label="Client din DB">
              <select value={clientId} onChange={e => handleClientChange(e.target.value ? Number(e.target.value) : '')} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors">
                <option value="">— manual —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Nume client *">
              <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors" />
            </Field>
            <Field label="Email contact">
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors" placeholder="email@firma.ro" />
            </Field>
            <Field label="Titlu ofertă *">
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors" placeholder="ex: Stație betoane M60" />
            </Field>
            <Field label="Valabilă până la">
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors" />
            </Field>
            <Field label="Discount global (%)">
              <input type="number" min={0} max={100} value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors" />
            </Field>
            <Field label="Cota TVA">
              <select value={tvaRate} onChange={e => setTvaRate(Number(e.target.value))} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors">
                <option value={0.21}>21%</option>
                <option value={0.19}>19%</option>
                <option value={0.09}>9%</option>
                <option value={0.05}>5%</option>
                <option value={0}>0% (scutit)</option>
              </select>
            </Field>
          </div>

          <Field label="Descriere">
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors" rows={2} />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Poziții ofertă</h4>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3" /> Adaugă</Button>
            </div>
            <div>
              {lines.map((l, idx) => (
                <div key={idx} className={`grid grid-cols-12 gap-1 items-start bg-surface-secondary p-2 ${idx < lines.length - 1 ? 'border-b border-line' : ''}`}>
                  <input className="input col-span-5" placeholder="Descriere" value={l.description} onChange={e => updateLine(idx, 'description', e.target.value)} />
                  <input className="input col-span-1" type="number" min={0} step="0.01" placeholder="Cant." value={l.quantity} onChange={e => updateLine(idx, 'quantity', Number(e.target.value))} />
                  <input className="input col-span-1" placeholder="UM" value={l.unit} onChange={e => updateLine(idx, 'unit', e.target.value)} />
                  <input className="input col-span-2" type="number" min={0} step="0.01" placeholder="Preț unit." value={l.unit_price} onChange={e => updateLine(idx, 'unit_price', Number(e.target.value))} />
                  <input className="input col-span-1" type="number" min={0} max={100} placeholder="Disc%" value={l.discount_percent} onChange={e => updateLine(idx, 'discount_percent', Number(e.target.value))} />
                  <div className="col-span-1 text-pm-xs tabular-nums text-right pt-1.5 font-semibold">
                    {(l.quantity * l.unit_price * (1 - (l.discount_percent || 0) / 100)).toFixed(2)}
                  </div>
                  <IconButton
                    intent="danger"
                    size="sm"
                    onClick={() => removeLine(idx)}
                    title="Șterge poziția"
                    aria-label="Șterge poziția"
                    className="col-span-1 self-center justify-self-center"
                  >
                    <Trash2 />
                  </IconButton>
                </div>
              ))}
            </div>
          </div>

          <Field label="Observații">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors" rows={2} />
          </Field>

          <Field label="Monedă">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors">
              <option value="RON">RON</option>
            </select>
          </Field>

          <Field label="Documente ofertă (opțional, orice format)">
            <input type="file" multiple className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors"
              onChange={e => setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && (
              <p className="text-pm-2xs text-content-muted mt-1">
                {files.length} fișier(e) selectat(e) · max 35 MB/fișier · se atașează la creare
              </p>
            )}
          </Field>

          <div className="flex justify-end gap-4 text-pm-xs">
            <div className="bg-surface-secondary border border-line rounded-xl p-3 min-w-[220px]">
              <div className="flex justify-between"><span className="text-content-muted">Subtotal:</span><span className="tabular-nums">{totals.subtotal.toFixed(2)} {currency}</span></div>
              <div className="flex justify-between"><span className="text-content-muted">TVA:</span><span className="tabular-nums">{totals.tva.toFixed(2)} {currency}</span></div>
              <div className="flex justify-between font-semibold border-t border-line mt-1 pt-1"><span>TOTAL:</span><span className="tabular-nums">{totals.total.toFixed(2)} {currency}</span></div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-surface-elevated border-t border-line/70 p-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Anulează</Button>
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Creează ofertă
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">{label}</span>
      {children}
    </label>
  );
}

function SendQuotationModal({ quotation, onClose, onSent }: {
  quotation: Quotation; onClose: () => void; onSent: (q: Quotation) => void;
}) {
  const [toEmail, setToEmail] = useState(quotation.contact_email || '');
  const [ccEmails, setCcEmails] = useState('');
  const [subject, setSubject] = useState(`Ofertă ${quotation.quotation_number} — ${quotation.title}`);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!toEmail.trim()) { toast.error('Email destinatar obligatoriu'); return; }
    setSubmitting(true);
    try {
      const updated = await apiCommand<Quotation>('send_quotation', {
        request: {
          quotation_id: quotation.id,
          to_email: toEmail.trim(),
          cc_emails: ccEmails.split(',').map(s => s.trim()).filter(Boolean),
          subject: subject.trim(),
          body_html: body.trim() || undefined,
        },
      });
      toast.success('Ofertă trimisă');
      onSent(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare trimitere email');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 anim-fade-in">
      <div className="bg-surface-elevated border border-line rounded-2xl shadow-[var(--elevation-4)] w-full max-w-xl anim-scale-in">
        <div className="border-b border-line/70 px-5 h-14 flex items-center justify-between">
          <h3 className="text-pm-md font-semibold text-content-primary">Trimite oferta {quotation.quotation_number}</h3>
          <button type="button" onClick={onClose} aria-label="Închide" className="p-2 rounded-xl text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-smooth duration-150 hover:rotate-90 outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-95"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Către *">
            <input type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors" />
          </Field>
          <Field label="CC (separat prin virgulă)">
            <input value={ccEmails} onChange={e => setCcEmails(e.target.value)} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors" placeholder="email1@x.ro, email2@y.ro" />
          </Field>
          <Field label="Subiect">
            <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors" />
          </Field>
          <Field label="Mesaj (HTML, opțional - se generează automat dacă e gol)">
            <textarea value={body} onChange={e => setBody(e.target.value)} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors" rows={5} />
          </Field>
          <p className="text-pm-2xs text-content-muted">PDF-ul ofertei se atașează automat.</p>
        </div>
        <div className="border-t border-line/70 p-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Anulează</Button>
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Trimite
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConvertModal({ quotation, projects, onClose, onConverted }: {
  quotation: Quotation; projects: any[]; onClose: () => void; onConverted: (q: Quotation) => void;
}) {
  const [projectId, setProjectId] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!projectId) { toast.error('Alege un proiect'); return; }
    setSubmitting(true);
    try {
      const updated = await apiCommand<Quotation>('convert_quotation_to_contract', {
        quotation_id: quotation.id,
        project_id: projectId,
      });
      toast.success('Convertit în contract');
      onConverted(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare conversie');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 anim-fade-in">
      <div className="bg-surface-elevated border border-line rounded-2xl shadow-[var(--elevation-4)] w-full max-w-md anim-scale-in">
        <div className="border-b border-line/70 px-5 h-14 flex items-center justify-between">
          <h3 className="text-pm-md font-semibold text-content-primary">Convertește în contract</h3>
          <button type="button" onClick={onClose} aria-label="Închide" className="p-2 rounded-xl text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-smooth duration-150 hover:rotate-90 outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-95"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-pm-xs text-content-muted">
            Va crea un contract pentru clientul <strong>{quotation.client_name}</strong> bazat pe oferta acceptată
            (preț vânzare {quotation.total.toFixed(2)} {quotation.currency}).
          </p>
          <Field label="Proiect destinație *">
            <select value={projectId} onChange={e => setProjectId(e.target.value ? Number(e.target.value) : '')} className="w-full border border-line px-2.5 py-1.5 rounded text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors">
              <option value="">— alege —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="border-t border-line/70 p-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Anulează</Button>
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />} Convertește
          </Button>
        </div>
      </div>
    </div>
  );
}
