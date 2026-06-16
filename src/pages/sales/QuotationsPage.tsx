import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Send, Download, Trash2, Check, X, Loader2, FileText, Eye, ArrowRight, Mail, Upload, Paperclip } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { toast } from '@/store/toastStore';
import { useClientStore } from '@/store/clientStore';
import { useProjectStore } from '@/store/projectStore';
import { useSalesStore } from '@/store/salesStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';
import { HeroHeader, GlassCard, MetricValue } from '@/components/ui';

import EmptyState from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import { useMoney } from '@/store/settingsStore';

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

  return (
    <Page className="mod-shell">
      <div className="mod-canvas">

        {}
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Vânzări"
          icon={FileText}
          title="Oferte comerciale"
          subtitle="Construiește, trimite, urmărește și convertește oferte"
          actions={
            <Button size="sm" onClick={() => setShowBuilder(true)}>
              <Plus className="h-3.5 w-3.5" /> Ofertă nouă
            </Button>
          }
        />

        {}
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={Send}      label="Trimise"          value={stats?.sent ?? 0} />
          <KpiMini icon={Eye}       label="Vizualizate"      value={stats?.viewed ?? 0} />
          <KpiMini icon={Check}     label="Acceptate"        value={stats?.accepted ?? 0} />
          <KpiMini icon={ArrowRight} label="Valoare pipeline" value={stats?.pipeline_value ?? 0} format={(n) => money(n, 'RON')} />
        </div>

        {}
        <div className="mod-bento">

          {}
          <GlassCard size="regular" className="enter-up !p-0 overflow-hidden" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-3">
              <span className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">Toate ofertele</span>
              <span className="text-pm-2xs text-content-muted">{quotations.length} {quotations.length === 1 ? 'ofertă' : 'oferte'}</span>
            </div>
            <div className="density-compact min-h-[55vh] max-h-[72vh] overflow-y-auto border-t border-line/40">
              {loading ? (
                <div className="p-4"><SkeletonList rows={5} /></div>
              ) : quotations.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Nicio ofertă"
                  body="Creează prima ofertă comercială pentru un client."
                  actionLabel="Ofertă nouă"
                  onAction={() => setShowBuilder(true)}
                />
              ) : (
                <div>
                  {quotations.map((q, idx) => {
                    const tone = STATUS_TONE[q.status] || { label: q.status, tone: 'neutral' as const };
                    return (
                      <button key={q.id} onClick={() => setSelected(q)} type="button"
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          idx < quotations.length - 1 ? 'border-b border-line' : ''
                        } ${
                          selected?.id === q.id ? 'bg-accent/5 border-l-2 border-l-accent' : 'hover:bg-surface-tertiary/30'
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
            </div>
          </GlassCard>

          {}
          <div className="mod-aside enter-up" style={{ animationDelay: '240ms' }}>
            <GlassCard size="regular" className="!p-0 overflow-hidden">
              {!selected ? (
                <div className="flex flex-col items-center justify-center text-content-muted py-20">
                  <FileText className="h-8 w-8 opacity-20 mb-2" />
                  <p className="text-pm-xs">Selectează o ofertă pentru detalii</p>
                </div>
              ) : (
                <div className="max-h-[78vh] overflow-y-auto">
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
                  />
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>

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

function QuotationDetail({ q, attachments, uploading, onUploadFiles, onDeleteAttachment, onDownloadAttachment, onSend, onConvert, onDelete, onDownload, onDecide }: {
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
}) {
  const tone = STATUS_TONE[q.status] || { label: q.status, tone: 'neutral' as const };
  return (
    <div>
      {}
      <div className="px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-pm-2xs font-mono text-accent">{q.quotation_number}</span>
          <StatusBadge label={tone.label} tone={tone.tone} size="xs" />
        </div>
        <h3 className="text-pm-sm font-semibold text-content-primary">{q.title}</h3>
        <p className="text-pm-xs text-content-muted">{q.client_name}</p>
      </div>

      {}
      <div className="px-4 py-3 border-b border-line flex flex-wrap gap-2">
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

      {}
      <div className="px-4 py-3 border-b border-line text-pm-xs space-y-1.5">
        <Row label="Subtotal" value={`${q.subtotal.toFixed(2)} ${q.currency}`} />
        <Row label={`TVA ${(q.tva_rate * 100).toFixed(0)}%`} value={`${q.tva_amount.toFixed(2)} ${q.currency}`} />
        <div className="border-t border-line pt-1.5 mt-1.5 flex justify-between font-semibold text-content-primary">
          <span>TOTAL</span>
          <span className="tabular-nums">{q.total.toFixed(2)} {q.currency}</span>
        </div>
      </div>

      {}
      <div className="border-b border-line">
        <header className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line/60">
          <span className="inline-flex h-7 w-7 items-center justify-center bg-surface-tertiary text-content-muted">
            <FileText className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-pm-sm font-semibold text-content-primary">Poziții ({q.lines.length})</h2>
        </header>
        <div>
          {q.lines.map((l, idx) => (
            <div key={l.id ?? idx} className={`px-4 py-2 text-pm-xs ${idx < q.lines.length - 1 ? 'border-b border-line/40' : ''}`}>
              <p className="font-medium text-content-primary">{l.description}</p>
              <p className="text-content-muted tabular-nums">
                {l.quantity} {l.unit} x {l.unit_price.toFixed(2)} {q.currency}
                {l.discount_percent ? ` (-${l.discount_percent}%)` : ''} = {l.total.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {
}
      <div className="border-b border-line">
        <header className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line/60">
          <span className="inline-flex h-7 w-7 items-center justify-center bg-surface-tertiary text-content-muted">
            <Paperclip className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-pm-sm font-semibold text-content-primary flex-1">Documente ({attachments.length})</h2>
          <label className={`inline-flex items-center gap-1 text-pm-2xs font-semibold ${uploading ? 'text-content-muted cursor-not-allowed' : 'text-accent hover:underline cursor-pointer'}`}>
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {uploading ? 'Se încarcă...' : 'Încarcă'}
            <input type="file" multiple className="hidden" disabled={uploading}
              onChange={(e) => { const fs = Array.from(e.target.files || []); e.currentTarget.value = ''; if (fs.length) onUploadFiles(fs); }} />
          </label>
        </header>
        <div className="p-3 space-y-2">
          {attachments.length === 0 ? (
            <p className="text-pm-xs text-content-muted">Niciun document încărcat. Folosește „Încarcă" (orice format).</p>
          ) : attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 border border-line bg-surface-primary px-2.5 py-1.5">
              <FileText className="h-4 w-4 text-content-muted shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-pm-xs text-content-primary truncate" title={a.filename || 'fișier'}>{a.filename || 'fișier'}</p>
                <p className="text-pm-2xs text-content-muted truncate">
                  {formatFileSize(a.size)} · încărcat de {a.created_by_name || 'necunoscut'}{a.created_at ? ` · ${a.created_at.split(' ')[0]}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => onDownloadAttachment(a.id)} title="Descarcă fișierul"
                className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"><Download className="h-4 w-4" /></button>
              <button type="button" onClick={() => onDeleteAttachment(a.id)} title="Șterge fișierul"
                className="p-1.5 text-content-muted hover:bg-status-red/10 hover:text-status-red transition-colors"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {}
      <div className="px-4 py-3">
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-primary border border-line w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface-primary border-b border-line p-4 flex items-center justify-between">
          <h3 className="text-pm-sm font-semibold text-content-primary">Ofertă nouă</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-tertiary"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lead asociat (opțional)">
              <select value={leadId} onChange={e => handleLeadChange(e.target.value ? Number(e.target.value) : '')} className="input">
                <option value="">— niciunul —</option>
                {leads.filter(l => l.status !== 'convertit').map(l => (
                  <option key={l.id} value={l.id}>{l.client_name} — {l.product_interest}</option>
                ))}
              </select>
            </Field>
            <Field label="Client din DB">
              <select value={clientId} onChange={e => handleClientChange(e.target.value ? Number(e.target.value) : '')} className="input">
                <option value="">— manual —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Nume client *">
              <input value={clientName} onChange={e => setClientName(e.target.value)} className="input" />
            </Field>
            <Field label="Email contact">
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="input" placeholder="email@firma.ro" />
            </Field>
            <Field label="Titlu ofertă *">
              <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="ex: Stație betoane M60" />
            </Field>
            <Field label="Valabilă până la">
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="input" />
            </Field>
            <Field label="Discount global (%)">
              <input type="number" min={0} max={100} value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))} className="input" />
            </Field>
            <Field label="Cota TVA">
              <select value={tvaRate} onChange={e => setTvaRate(Number(e.target.value))} className="input">
                <option value={0.21}>21%</option>
                <option value={0.19}>19%</option>
                <option value={0.09}>9%</option>
                <option value={0.05}>5%</option>
                <option value={0}>0% (scutit)</option>
              </select>
            </Field>
          </div>

          <Field label="Descriere">
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="input" rows={2} />
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
                  <button onClick={() => removeLine(idx)} className="col-span-1 p-1 text-content-muted hover:text-status-red hover:bg-surface-tertiary self-center">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Field label="Observații">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input" rows={2} />
          </Field>

          <Field label="Monedă">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="input">
              <option value="RON">RON</option>
              <option value="EUR">EUR</option>
            </select>
          </Field>

          <Field label="Documente ofertă (opțional, orice format)">
            <input type="file" multiple className="input"
              onChange={e => setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && (
              <p className="text-pm-2xs text-content-muted mt-1">
                {files.length} fișier(e) selectat(e) · max 35 MB/fișier · se atașează la creare
              </p>
            )}
          </Field>

          <div className="flex justify-end gap-4 text-pm-xs">
            <div className="bg-surface-secondary border border-line p-3 min-w-[220px]">
              <div className="flex justify-between"><span className="text-content-muted">Subtotal:</span><span className="tabular-nums">{totals.subtotal.toFixed(2)} {currency}</span></div>
              <div className="flex justify-between"><span className="text-content-muted">TVA:</span><span className="tabular-nums">{totals.tva.toFixed(2)} {currency}</span></div>
              <div className="flex justify-between font-semibold border-t border-line mt-1 pt-1"><span>TOTAL:</span><span className="tabular-nums">{totals.total.toFixed(2)} {currency}</span></div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-surface-primary border-t border-line p-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Anulează</Button>
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Creează ofertă
          </Button>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          border: 1px solid var(--color-border);
          background-color: var(--color-bg-primary);
          padding: 0.375rem 0.625rem;
          font-size: 0.75rem;
          color: var(--color-text-primary);
        }
        .input:focus { outline: none; box-shadow: 0 0 0 1px var(--color-accent); }
      `}</style>
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-primary border border-line w-full max-w-xl">
        <div className="border-b border-line p-4 flex items-center justify-between">
          <h3 className="text-pm-sm font-semibold text-content-primary">Trimite oferta {quotation.quotation_number}</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-tertiary"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <Field label="Către *">
            <input type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} className="input" />
          </Field>
          <Field label="CC (separat prin virgulă)">
            <input value={ccEmails} onChange={e => setCcEmails(e.target.value)} className="input" placeholder="email1@x.ro, email2@y.ro" />
          </Field>
          <Field label="Subiect">
            <input value={subject} onChange={e => setSubject(e.target.value)} className="input" />
          </Field>
          <Field label="Mesaj (HTML, opțional - se generează automat dacă e gol)">
            <textarea value={body} onChange={e => setBody(e.target.value)} className="input" rows={5} />
          </Field>
          <p className="text-pm-2xs text-content-muted">PDF-ul ofertei se atașează automat.</p>
        </div>
        <div className="border-t border-line p-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Anulează</Button>
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Trimite
          </Button>
        </div>
      </div>
      <style>{`
        .input { width: 100%; border: 1px solid var(--color-border);
                 background-color: var(--color-bg-primary); padding: 0.375rem 0.625rem;
                 font-size: 0.75rem; color: var(--color-text-primary); }
        .input:focus { outline: none; box-shadow: 0 0 0 1px var(--color-accent); }
      `}</style>
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-primary border border-line w-full max-w-md">
        <div className="border-b border-line p-4 flex items-center justify-between">
          <h3 className="text-pm-sm font-semibold text-content-primary">Convertește în contract</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-tertiary"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-pm-xs text-content-muted">
            Va crea un contract pentru clientul <strong>{quotation.client_name}</strong> bazat pe oferta acceptată
            (preț vânzare {quotation.total.toFixed(2)} {quotation.currency}).
          </p>
          <Field label="Proiect destinație *">
            <select value={projectId} onChange={e => setProjectId(e.target.value ? Number(e.target.value) : '')} className="input">
              <option value="">— alege —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="border-t border-line p-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Anulează</Button>
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />} Convertește
          </Button>
        </div>
      </div>
      <style>{`
        .input { width: 100%; border: 1px solid var(--color-border);
                 background-color: var(--color-bg-primary); padding: 0.375rem 0.625rem;
                 font-size: 0.75rem; color: var(--color-text-primary); }
      `}</style>
    </div>
  );
}
