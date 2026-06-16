import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Save, History, Edit2, Loader2, ScrollText, Download, Upload, Paperclip, Trash2, CheckCircle2, DollarSign } from 'lucide-react';
import { downloadContractAttachments, downloadOneContractAttachment } from '@/lib/downloadPdf';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/cn';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { useProjectStore } from '@/store/projectStore';
import { useClientStore } from '@/store/clientStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import FormModal from '@/components/FormModal';
import StatusBadge, { statusBorderClass } from '@/components/ui/StatusBadge';
import { contractStatus } from '@/lib/statusTokens';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';
import { HeroHeader, GlassCard, MetricValue } from '@/components/ui';
import { useMoney } from '@/store/settingsStore';


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

interface ContractSection { id: number; title: string; content: string; order_index: number; required: boolean; }
interface Contract {
  id: number; project_id: number; project_name: string; contract_code: string; title: string;
  client_id: number; client_name: string; site_location: string | null; delivered_product: string | null;
  sale_price: number; execution_term: string | null; pif_term: string | null;
  status: string; revision: number; observations: string | null;
  created_at: string; updated_at: string; sections: ContractSection[];
}
interface ContractAttachment {
  id: number; filename: string | null; mime: string | null;
  size: number; created_by_name: string | null; created_at: string;
}



const CONTRACT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'active',  label: 'Activ' },
  { value: 'amended', label: 'Amendat' },
  { value: 'closed',  label: 'Închis' },
];

export default function ContractPage({ user: _user }: { user: User | null }) {
  const money = useMoney();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const clients = useClientStore(s => s.clients);
  const fetchClientsStore = useClientStore(s => s.fetchClients);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  
  
  const [revisingContractId, setRevisingContractId] = useState<number | null>(null);
  
  const [attachments, setAttachments] = useState<ContractAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchContracts = useCallback(() => {
    setLoading(true);
    apiCommand<Contract[]>('get_contracts').then(setContracts).catch(() => setContracts([])).finally(() => setLoading(false));
  }, []);

  const loadAttachments = useCallback(async (contractId: number) => {
    try {
      const list = await apiCommand<ContractAttachment[]>('list_contract_attachments', { contract_id: contractId });
      setAttachments(list || []);
    } catch { setAttachments([]); }
  }, []);

  useEffect(() => {
    fetchContracts();
    void fetchProjects();
    void fetchClientsStore();
  }, [fetchContracts, fetchProjects, fetchClientsStore]);

  
  const uploadFilesToContract = async (contractId: number, files: File[]): Promise<number> => {
    let count = 0;
    for (const f of files) {
      if (!f || f.size === 0) continue;
      if (f.size > MAX_FILE_BYTES) { toast.error(`„${f.name}" depășește 35 MB și nu a fost încărcat`); continue; }
      const data = await fileToBase64(f);
      await apiCommand('add_contract_attachment', {
        contract_id: contractId, filename: f.name, mime: f.type || 'application/octet-stream', data,
      });
      count++;
    }
    return count;
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const files = (fd.getAll('contract_files') as unknown as File[]).filter(f => f instanceof File && f.size > 0);
    setUploading(true);
    try {
      const c = await apiCommand<Contract>('create_contract', {
        project_id: Number(fd.get('project_id')),
        title: fd.get('title') as string,
        client_id: Number(fd.get('client_id')),
        delivered_product: fd.get('delivered_product') as string || null,
        sale_price: Number(fd.get('sale_price')) || 0,
        execution_term: fd.get('execution_term') as string || null,
      });
      if (files.length > 0) {
        const n = await uploadFilesToContract(c.id, files);
        if (n > 0) toast.success(`${n} fișier(e) încărcat(e)`);
      }
      setSelected(c);
      await loadAttachments(c.id);
      setShowCreate(false);
      toast.success('Contract creat');
      fetchContracts();
      void useDashboardStore.getState().invalidate();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la creare contract'); }
    finally { setUploading(false); }
  };

  
  const handleUploadMore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selected) return;
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    try {
      const n = await uploadFilesToContract(selected.id, files);
      if (n > 0) { toast.success(`${n} fișier(e) încărcat(e)`); await loadAttachments(selected.id); }
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la încărcare'); }
    finally { setUploading(false); }
  };

  const handleDeleteAttachment = async (id: number) => {
    if (!(await confirmDialog({ title: 'Șterge fișierul?', body: 'Fișierul încărcat va fi eliminat din contract.', danger: true }))) return;
    try {
      await apiCommand('delete_contract_attachment', { id });
      toast.success('Fișier șters');
      if (selected) await loadAttachments(selected.id);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la ștergere'); }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await apiCommand<Contract>('update_contract', {
        id: selected.id,
        title: selected.title,
        site_location: selected.site_location,
        delivered_product: selected.delivered_product,
        sale_price: selected.sale_price,
        execution_term: selected.execution_term,
        pif_term: selected.pif_term,
        status: selected.status,
        observations: selected.observations,
        sections: selected.sections.map(s => ({ id: s.id, content: s.content })),
      });
      setSelected(updated);
      setEditing(false);
      toast.success('Contract salvat');
      fetchContracts();
      void useDashboardStore.getState().invalidate();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la salvare'); }
    finally { setSaving(false); }
  };

  const handleRevision = () => {
    if (!selected) return;
    setRevisingContractId(selected.id);
  };

  const submitRevision = async (data: Record<string, unknown>) => {
    if (revisingContractId == null) return;
    
    const notes = (data.notes as string | undefined)?.trim() || 'Revizuire fără observatii';
    const updated = await apiCommand<Contract>('create_contract_revision', { contract_id: revisingContractId, notes });
    setSelected(updated);
    setRevisingContractId(null);
    toast.success('Revizuire creata');
    fetchContracts();
    void useDashboardStore.getState().invalidate();
  };

  const contractStats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    amended: contracts.filter(c => c.status === 'amended').length,
    value: contracts.reduce((s, c) => s + (c.sale_price || 0), 0),
  };

  return (
    <Page className="mod-shell">
      {}
      <div className="px-5 pt-4 pb-8 space-y-4 shrink-0">
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Proiecte & Contracte"
          icon={ScrollText}
          title="Contracte"
          subtitle="Contracte, termeni, revizii și documentele semnate"
          actions={
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-3 w-3" /> Contract nou
            </Button>
          }
        />
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={ScrollText}   label="Total contracte" value={contractStats.total} />
          <KpiMini icon={CheckCircle2} label="Active"          value={contractStats.active} />
          <KpiMini icon={FileText}     label="Amendate"        value={contractStats.amended} />
          <KpiMini icon={DollarSign}   label="Valoare totală"  value={contractStats.value} format={(n) => money(n, 'EUR')} />
        </div>
      </div>

      {

}
      <div className="flex flex-1 min-h-0 enter-up" style={{ animationDelay: '160ms' }}>
        {}
        <div className="w-80 bg-surface-secondary border-r border-line flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center pt-8">
                <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
              </div>
            ) : contracts.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title="Niciun contract încă"
                body="Creează primul contract pentru a urmări termeni, valori și revizii."
                size="sm"
              />
            ) : contracts.map(c => (
              <button key={c.id}
                onClick={() => { setSelected(c); setEditing(false); setAttachments([]); apiCommand<Contract>('get_contract', { contract_id: c.id }).then(setSelected); void loadAttachments(c.id); }}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-line hover:bg-surface-tertiary/30 transition-colors border-l-2',
                  selected?.id === c.id
                    ? 'border-l-accent bg-accent/5'
                    : statusBorderClass(contractStatus(c.status).tone),
                )}>
                <div className="flex items-center justify-between">
                  <span className="text-pm-xs font-mono text-accent">{c.contract_code}</span>
                  <StatusBadge {...contractStatus(c.status)} size="xs" />
                </div>
                <p className="text-pm-sm font-medium text-content-primary truncate mt-0.5">{c.title}</p>
                <p className="text-pm-xs text-content-muted truncate">{c.client_name} — {c.project_name}</p>
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {!selected && !showCreate ? (
            <div className="flex items-center justify-center h-full text-content-muted">
              <div className="text-center">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-pm-xs">Selectează un contract</p>
              </div>
            </div>
          ) : showCreate ? (
            
            <div>
              <section className="bg-surface-secondary border-b border-line">
                <header className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line/60">
                  <span className="inline-flex h-7 w-7 items-center justify-center bg-surface-tertiary text-content-muted">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-pm-sm font-semibold text-content-primary flex-1">Contract nou</h2>
                </header>
                <div className="p-4 max-w-2xl">
                  <form onSubmit={handleCreate} className="space-y-3">
                    <div>
                      <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Titlu *</label>
                      <input name="title" required
                        className="w-full border border-line bg-surface-primary px-3 py-2 text-pm-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent/60"
                        placeholder="Titlu contract" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Proiect *</label>
                        <select name="project_id" required
                          className="w-full border border-line bg-surface-primary px-3 py-2 text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60">
                          <option value="">Selectează...</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Client *</label>
                        <select name="client_id" required
                          className="w-full border border-line bg-surface-primary px-3 py-2 text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60">
                          <option value="">Selectează...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Produs livrat</label>
                      <input name="delivered_product"
                        className="w-full border border-line bg-surface-primary px-3 py-2 text-pm-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent/60"
                        placeholder="ex: Statie betoane automatiX M60" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Pret vanzare</label>
                        <input name="sale_price" type="number" step="0.01"
                          className="w-full border border-line bg-surface-primary px-3 py-2 text-pm-xs text-content-primary tabular-nums focus:outline-none focus:ring-1 focus:ring-accent/60" />
                      </div>
                      <div>
                        <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Termen executie</label>
                        <input name="execution_term"
                          className="w-full border border-line bg-surface-primary px-3 py-2 text-pm-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent/60"
                          placeholder="ex: 90 zile" />
                      </div>
                    </div>
                    {}
                    <div>
                      <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Contract (fișier) — orice format</label>
                      <input name="contract_files" type="file" multiple
                        className="w-full text-pm-xs text-content-secondary file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-accent file:text-[var(--color-on-accent)] file:font-semibold file:cursor-pointer hover:file:brightness-105 border border-line bg-surface-primary px-3 py-2" />
                      <p className="text-pm-2xs text-content-muted mt-1">Poți încărca unul sau mai multe fișiere (PDF, scan, DOCX etc.), max 35 MB/fișier. Le poți adăuga și după creare.</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => setShowCreate(false)} disabled={uploading}>Anulează</Button>
                      <Button size="sm" type="submit" disabled={uploading}>
                        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        {uploading ? 'Se creează...' : 'Creează contract'}
                      </Button>
                    </div>
                  </form>
                </div>
              </section>
            </div>
          ) : selected && (
            <div>
              {}
              <section className="bg-surface-secondary border-b border-line">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-pm-xs font-mono text-accent">{selected.contract_code}</span>
                      <StatusBadge {...contractStatus(selected.status)} size="xs" />
                      <span className="text-pm-2xs text-content-muted tabular-nums">Rev. {selected.revision}</span>
                    </div>
                    <h3 className="text-pm-md font-semibold text-content-primary mt-1">{selected.title}</h3>
                    <p className="text-pm-xs text-content-muted">{selected.client_name} — {selected.project_name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!editing ? (
                      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                        <Edit2 className="h-3 w-3" /> Editează
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        {saving ? 'Se salvează...' : 'Salvează'}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleRevision}>
                      <History className="h-3 w-3" /> Revizuire
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => selected && downloadContractAttachments(selected.id)}>
                      <Download className="h-3 w-3" /> Descarcă contract
                    </Button>
                  </div>
                </div>
              </section>

              {}
              <section className="bg-surface-secondary border-b border-line">
                <header className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line/60">
                  <span className="inline-flex h-7 w-7 items-center justify-center bg-surface-tertiary text-content-muted">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-pm-sm font-semibold text-content-primary flex-1">Detalii contract</h2>
                </header>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-px bg-line/40">
                    {[
                      { label: 'Produs livrat', value: selected.delivered_product, key: 'delivered_product' },
                      { label: 'Pret vanzare', value: selected.sale_price?.toString(), key: 'sale_price' },
                      { label: 'Termen executie', value: selected.execution_term, key: 'execution_term' },
                      { label: 'Termen PIF', value: selected.pif_term, key: 'pif_term' },
                      { label: 'Locație', value: selected.site_location, key: 'site_location' },
                    ].map(f => (
                      <div key={f.key} className="bg-surface-secondary p-3">
                        <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">{f.label}</label>
                        {editing ? (
                          <input value={f.value || ''} onChange={e => setSelected({...selected, [f.key]: f.key === 'sale_price' ? Number(e.target.value) : e.target.value} as Contract)}
                            className="w-full border border-line bg-surface-primary px-2 py-1 text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60" />
                        ) : (
                          <p className={`text-pm-xs text-content-primary ${f.key === 'sale_price' ? 'tabular-nums' : ''}`}>{f.value || '—'}</p>
                        )}
                      </div>
                    ))}
                    {editing && (
                      <div className="bg-surface-secondary p-3">
                        <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Status</label>
                        <select value={selected.status} onChange={e => setSelected({...selected, status: e.target.value})}
                          className="w-full border border-line bg-surface-primary px-2 py-1 text-pm-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60">
                          {CONTRACT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {

}
              <section className="bg-surface-secondary border-b border-line">
                <header className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line/60">
                  <span className="inline-flex h-7 w-7 items-center justify-center bg-surface-tertiary text-content-muted">
                    <Paperclip className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-pm-sm font-semibold text-content-primary flex-1">Contract încărcat</h2>
                  <label className={cn(
                    'inline-flex items-center gap-1 text-pm-2xs font-semibold cursor-pointer',
                    uploading ? 'text-content-muted cursor-not-allowed' : 'text-accent hover:underline',
                  )}>
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    {uploading ? 'Se încarcă...' : 'Încarcă fișier'}
                    <input type="file" multiple className="hidden" disabled={uploading} onChange={handleUploadMore} />
                  </label>
                </header>
                <div className="p-4 space-y-2">
                  {attachments.length === 0 ? (
                    <p className="text-pm-xs text-content-muted">Niciun fișier încărcat. Folosește „Încarcă fișier" pentru a adăuga contractul (orice format).</p>
                  ) : attachments.map(a => (
                    <div key={a.id} className="flex items-center gap-3 border border-line bg-surface-primary px-3 py-2">
                      <FileText className="h-4 w-4 text-content-muted shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-pm-xs text-content-primary truncate" title={a.filename || 'fișier'}>{a.filename || 'fișier'}</p>
                        <p className="text-pm-2xs text-content-muted">{formatFileSize(a.size)}{a.created_by_name ? ` · ${a.created_by_name}` : ''}</p>
                      </div>
                      <button type="button" onClick={() => downloadOneContractAttachment(a.id)} title="Descarcă fișierul"
                        className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors">
                        <Download className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDeleteAttachment(a.id)} title="Șterge fișierul"
                        className="p-1.5 text-content-muted hover:bg-status-red/10 hover:text-status-red transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>{}

      <FormModal
        isOpen={revisingContractId !== null}
        onClose={() => setRevisingContractId(null)}
        title="Revizuire contract"
        fields={[{
          name: 'notes',
          label: 'Note revizuire',
          type: 'textarea',
          placeholder: 'Descrie modificarile (optional)',
        }]}
        onSubmit={submitRevision}
        submitLabel="Creează revizuire"
      />
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
