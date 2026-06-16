













import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Inbox, Send, Globe, Plus, Loader2, X, MessageCircle, CheckCircle2, AlertTriangle, FileText, User as UserIcon, Calendar as CalendarIcon, Reply, RotateCcw, Paperclip, Upload, Download, Trash2, Pencil, Clock, FileSpreadsheet, FileImage, FileArchive, FileCode, File as FileIcon, Box } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import { formatFileSize } from '@/lib/fileUpload';
import { uploadBriefingFile, BRIEFING_MAX_BYTES } from '@/lib/briefingUpload';
import { downloadOneBriefingAttachment } from '@/lib/downloadPdf';
import Page from '@/components/ui/Page';
import { HeroHeader, GlassCard, MetricValue } from '@/components/ui';
import StatusBadge from '@/components/ui/StatusBadge';
import type { StatusTone } from '@/lib/statusTokens';
import Button from '@/components/ui/Button';
import { filterSelectCls, filterToggleCls } from '@/components/ui/filterControls';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/core/types';
import { getErrorMessage } from '@/utils/errors';

type Mode = 'inbox' | 'sent' | 'all';
type Status =
  | 'draft' | 'sent' | 'acknowledged' | 'clarification_requested'
  | 'accepted' | 'rejected' | 'completed' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'critical';

interface Briefing {
  id: number;
  title: string;
  project_id: number | null;
  project_name: string | null;
  created_by_user_id: number;
  created_by_name: string;
  assigned_to_user_id: number;
  assigned_to_name: string;
  scope: string | null;
  technical_requirements: string | null;
  client_expectations: string | null;
  deadline: string | null;
  priority: Priority;
  status: Status;
  rejection_reason: string | null;
  completed_at: string | null;
  created_at: string;
  open_clarifications: number;
}

interface Clarification {
  id: number;
  briefing_id: number;
  asked_by_user_id: number;
  asked_by_name: string;
  question: string;
  asked_at: string;
  answered_by_user_id: number | null;
  answered_by_name: string | null;
  answer: string | null;
  answered_at: string | null;
  status: 'pending' | 'answered';
}

interface UserRow { id: number; username: string; full_name: string; job_title?: string | null; }

const STATUS_LABEL: Record<Status, string> = {
  draft: 'Ciornă',
  sent: 'Trimis',
  acknowledged: 'Văzut',
  clarification_requested: 'Clarificare',
  accepted: 'Acceptat',
  rejected: 'Refuzat',
  completed: 'Finalizat',
  cancelled: 'Anulat',
};
const STATUS_TONE: Record<Status, StatusTone> = {
  draft: 'neutral',
  sent: 'info',
  acknowledged: 'warning',
  clarification_requested: 'danger',
  accepted: 'success',
  rejected: 'danger',
  completed: 'success',
  cancelled: 'neutral',
};
const PRIORITY_COLOR: Record<Priority, string> = {
  low: 'text-content-muted',
  medium: 'text-content-secondary',
  high: 'text-status-amber',
  critical: 'text-status-red',
};
const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Scăzută', medium: 'Medie', high: 'Înaltă', critical: 'Critică',
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
}
function timeAgo(d: string | null): string {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'acum';
  if (min < 60) return `acum ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `acum ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `acum ${days}z`;
  return new Date(d).toLocaleDateString('ro-RO');
}

export default function ProjectBriefingsPage() {
  const [mode, setMode] = useState<Mode>('inbox');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [list, setList] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const me = useAuthStore(s => s.user);
  const isAdmin = me?.role_name === 'admin';

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await apiCommand<Briefing[]>('get_project_briefings', {
        mode,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setList(items);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Nu pot încărca briefing-urile'));
    } finally {
      setLoading(false);
    }
  }, [mode, statusFilter]);

  useEffect(() => { fetchProjects().catch(() => {}); }, [fetchProjects]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    apiCommand<UserRow[]>('get_users').then(setUsers).catch(() => setUsers([]));
  }, []);

  const selected = useMemo(
    () => list.find(b => b.id === selectedId) ?? null,
    [list, selectedId],
  );

  
  const briefStats = useMemo(() => ({
    total: list.length,
    active: list.filter(b => !['accepted', 'completed', 'rejected', 'cancelled'].includes(b.status)).length,
    clarifs: list.reduce((s, b) => s + (b.open_clarifications || 0), 0),
    done: list.filter(b => b.status === 'completed' || b.status === 'accepted').length,
  }), [list]);

  
  
  
  useEffect(() => {
    if (!selected || !me) return;
    if (selected.assigned_to_user_id !== me.id) return;
    if (selected.status !== 'sent') return;
    apiCommand('update_project_briefing_status', { id: selected.id, status: 'acknowledged' })
      .then(() => refresh())
      .catch(() => {  });
  }, [selected?.id, selected?.status, selected?.assigned_to_user_id, me?.id]);

  return (
    <Page className="mod-shell">
      {}
      <div className="px-5 pt-4 pb-8 space-y-4 shrink-0">
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Proiectare"
          icon={MessageCircle}
          title="Briefing proiectare"
          subtitle="Intake formal pentru cerințele clientului → proiectant"
          actions={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Briefing nou
            </Button>
          }
        />
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={MessageCircle} label="Total briefing-uri" value={briefStats.total} />
          <KpiMini icon={Clock}         label="În lucru"          value={briefStats.active} />
          <KpiMini icon={AlertTriangle} label="Clarificări"       value={briefStats.clarifs} warn={briefStats.clarifs > 0} />
          <KpiMini icon={CheckCircle2}  label="Finalizate"        value={briefStats.done} />
        </div>
      </div>

      {}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-line shrink-0 bg-surface-secondary flex-wrap">
        <div className="flex items-center gap-1.5">
          <ModeTab active={mode === 'inbox'} onClick={() => { setMode('inbox'); setSelectedId(null); }}>
            <Inbox className="h-3.5 w-3.5" /> Primite
          </ModeTab>
          <ModeTab active={mode === 'sent'} onClick={() => { setMode('sent'); setSelectedId(null); }}>
            <Send className="h-3.5 w-3.5" /> Trimise
          </ModeTab>
          {isAdmin && (
            <ModeTab active={mode === 'all'} onClick={() => { setMode('all'); setSelectedId(null); }}>
              <Globe className="h-3.5 w-3.5" /> Toate
            </ModeTab>
          )}
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | 'all')}
          className={filterSelectCls(statusFilter !== 'all')}>
          <option value="all">Toate statusurile</option>
          {(Object.keys(STATUS_LABEL) as Status[]).map(s =>
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <span className="ml-auto text-pm-xs text-content-muted">
          {list.length} {list.length === 1 ? 'briefing' : 'briefing-uri'}
        </span>
      </div>

      {}
      <div className="flex-1 flex min-h-0 overflow-hidden enter-up" style={{ animationDelay: '160ms' }}>
        {}
        <div className="w-[380px] shrink-0 border-r border-line overflow-y-auto bg-surface-secondary">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
            </div>
          ) : list.length === 0 ? (
            <div className="p-6 text-center text-content-muted text-pm-sm">
              {mode === 'inbox' ? 'Niciun briefing pentru tine.' : 'Niciun briefing aici.'}
            </div>
          ) : list.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              className={`w-full text-left px-4 py-3 border-b border-line hover:bg-surface-tertiary/30 transition-colors ${
                selectedId === b.id ? 'bg-accent/8 border-l-2 border-l-accent' : ''
              }`}
            >
              <div className="flex items-start gap-2 mb-1">
                <p className="flex-1 text-pm-sm font-semibold text-content-primary truncate">{b.title}</p>
                <StatusBadge tone={STATUS_TONE[b.status]} label={STATUS_LABEL[b.status]} size="xs" className="shrink-0" />
              </div>
              <p className="text-pm-xs text-content-muted truncate">
                {mode === 'inbox' ? `de la ${b.created_by_name}` : `→ ${b.assigned_to_name}`}
                {b.project_name && <> · {b.project_name}</>}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-pm-2xs">
                <span className={PRIORITY_COLOR[b.priority]}>● {PRIORITY_LABEL[b.priority]}</span>
                {b.deadline && (
                  <span className="text-content-muted">
                    <CalendarIcon className="h-2.5 w-2.5 inline" /> {formatDate(b.deadline)}
                  </span>
                )}
                {b.open_clarifications > 0 && (
                  <span className="text-status-red font-semibold">
                    <MessageCircle className="h-2.5 w-2.5 inline" /> {b.open_clarifications}
                  </span>
                )}
                <span className="ml-auto text-content-muted">{timeAgo(b.created_at)}</span>
              </div>
            </button>
          ))}
        </div>

        {}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <BriefingDetail
              briefing={selected}
              onChanged={refresh}
              me={me}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-content-muted">
              <p className="text-pm-sm">Selectează un briefing din listă</p>
            </div>
          )}
        </div>
      </div>

      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); refresh(); }}
          users={users}
          projects={projects}
        />
      )}
    </Page>
  );
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={filterToggleCls(active)}>
      {children}
    </button>
  );
}





interface BriefingAttachment {
  id: number; briefing_id: number; filename: string | null; mime: string | null;
  size: number; annotation: string | null; created_by_user_id: number | null;
  created_by_name: string | null; created_at: string;
}


function fileKind(name: string | null, mime: string | null): { Icon: typeof FileText; tint: string } {
  const ext = (name || '').split('.').pop()?.toLowerCase() || '';
  const m = (mime || '').toLowerCase();
  const has = (...x: string[]) => x.includes(ext);
  if (m.startsWith('image/') || has('png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff', 'heic'))
    return { Icon: FileImage, tint: 'text-status-blue' };
  if (m.includes('pdf') || has('pdf')) return { Icon: FileText, tint: 'text-status-red' };
  if (m.includes('sheet') || m.includes('excel') || m.includes('csv') || has('xls', 'xlsx', 'csv', 'ods'))
    return { Icon: FileSpreadsheet, tint: 'text-status-green' };
  if (m.includes('word') || has('doc', 'docx', 'odt', 'rtf')) return { Icon: FileText, tint: 'text-status-blue' };
  if (has('dwg', 'dxf', 'step', 'stp', 'iges', 'igs', 'stl', 'ipt', 'sldprt', 'sldasm', 'catpart', '3ds', 'obj'))
    return { Icon: Box, tint: 'text-status-amber' };
  if (m.includes('zip') || m.includes('compressed') || has('zip', 'rar', '7z', 'tar', 'gz', 'bz2'))
    return { Icon: FileArchive, tint: 'text-status-purple' };
  if (has('js', 'ts', 'tsx', 'jsx', 'json', 'xml', 'html', 'css', 'py', 'c', 'cpp', 'java', 'sql', 'sh'))
    return { Icon: FileCode, tint: 'text-status-teal' };
  return { Icon: FileIcon, tint: 'text-content-muted' };
}






function BriefingAttachments({ briefingId, me }: { briefingId: number; me: User | null }) {
  const [items, setItems] = useState<BriefingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNote, setEditNote] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = me?.role_name === 'admin';

  const load = useCallback(async () => {
    try {
      const list = await apiCommand<BriefingAttachment[]>('list_briefing_attachments', { briefing_id: briefingId });
      setItems(list || []);
    } catch { setItems([]); }
  }, [briefingId]);
  useEffect(() => { void load(); }, [load]);

  const onUpload = async (files: FileList | null) => {
    const list = Array.from(files || []).filter(f => f.size > 0);
    if (list.length === 0) return;
    setUploading(true);
    let ok = 0;
    try {
      for (const f of list) {
        
        if (f.size > BRIEFING_MAX_BYTES) { toast.error(`Fișierul „${f.name}" depășește 500 MB`); continue; }
        setUploadPct(0);
        
        await uploadBriefingFile(briefingId, f, note.trim() || null, (p) => setUploadPct(p.pct));
        ok++;
      }
      if (ok > 0) { toast.success(ok > 1 ? `${ok} fișiere încărcate` : 'Fișier încărcat'); setNote(''); await load(); }
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Eroare la încărcare'));
    } finally { setUploading(false); setUploadPct(null); }
  };

  const onDelete = async (id: number) => {
    const ok = await confirmDialog({ title: 'Ștergi fișierul?', confirmLabel: 'Șterge', danger: true });
    if (!ok) return;
    try { await apiCommand('delete_briefing_attachment', { id }); await load(); }
    catch (e: unknown) { toast.error(getErrorMessage(e, 'Eroare')); }
  };

  const saveNote = async (id: number) => {
    try {
      await apiCommand('update_briefing_attachment_note', { id, annotation: editNote.trim() || null });
      setEditingId(null); setEditNote('');
      await load();
    } catch (e: unknown) { toast.error(getErrorMessage(e, 'Eroare')); }
  };

  const triggerPicker = () => { if (!uploading) fileInputRef.current?.click(); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (!uploading) void onUpload(e.dataTransfer.files);
  };

  return (
    <GlassCard size="regular" className="space-y-4">
      {}
      <input ref={fileInputRef} type="file" multiple className="hidden" disabled={uploading}
        onChange={(e) => { const f = e.target.files; e.currentTarget.value = ''; void onUpload(f); }} />

      {}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-pm-sm font-semibold text-content-primary flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-accent" /> Fișiere atașate
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-accent/10 text-accent text-pm-2xs font-bold tabular-nums">{items.length}</span>
        </h3>
        <Button size="sm" onClick={triggerPicker} disabled={uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {uploading ? `Se încarcă…${uploadPct != null ? ` ${uploadPct}%` : ''}` : 'Adaugă fișier'}
        </Button>
      </div>

      {}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        placeholder="Notă aplicată fișierelor pe care le adaugi acum (opțional)"
        className="w-full px-2.5 py-1.5 border border-line bg-surface-primary rounded text-pm-xs text-content-primary placeholder:text-content-muted/70 focus:outline-none focus:border-accent"
      />

      {}
      <div
        onClick={triggerPicker}
        onDragOver={(e) => { e.preventDefault(); if (!dragActive) setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${dragActive ? 'border-accent bg-accent/5' : 'border-line hover:border-accent/50 hover:bg-surface-tertiary/30'}`}
      >
        <Upload className={`h-5 w-5 ${dragActive ? 'text-accent' : 'text-content-muted'}`} />
        <p className="text-pm-xs text-content-secondary">Trage fișiere aici sau <span className="text-accent font-medium">click pentru a selecta</span></p>
        <p className="text-pm-2xs text-content-muted">Orice tip (PDF, Excel, Word, imagini, CAD, ZIP…) · max 500 MB / fișier</p>
      </div>

      {}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <Paperclip className="h-7 w-7 text-content-muted/40" />
          <p className="text-pm-xs text-content-muted">Niciun fișier atașat încă. Adaugă referințe (planuri, scanuri, devize…) cu o notă pentru fiecare.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(a => {
            const canDelete = isAdmin || me?.id === a.created_by_user_id;
            const { Icon, tint } = fileKind(a.filename, a.mime);
            const editing = editingId === a.id;
            return (
              <GlassCard key={a.id} size="compact" className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <Icon className={`h-7 w-7 shrink-0 ${tint}`} strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <p className="text-pm-xs font-medium text-content-primary truncate" title={a.filename || 'fișier'}>{a.filename || 'fișier'}</p>
                    <p className="text-pm-2xs text-content-muted truncate">{formatFileSize(a.size)}{a.created_by_name ? ` · ${a.created_by_name}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button type="button" onClick={() => downloadOneBriefingAttachment(a.id)} title="Descarcă"
                      className="p-1 rounded text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"><Download className="h-3.5 w-3.5" /></button>
                    {canDelete && (
                      <button type="button" onClick={() => onDelete(a.id)} title="Șterge"
                        className="p-1 rounded text-content-muted hover:bg-status-red/10 hover:text-status-red transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                </div>

                {}
                {editing ? (
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    onBlur={() => void saveNote(a.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); }
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus rows={2} maxLength={500}
                    placeholder="Notă fișier (max 500)…"
                    className="w-full px-2 py-1 border border-accent/60 bg-surface-primary rounded text-pm-2xs text-content-primary focus:outline-none resize-none"
                  />
                ) : (
                  <button type="button" onClick={() => { setEditingId(a.id); setEditNote(a.annotation || ''); }}
                    title="Click pentru a edita nota"
                    className="w-full text-left text-pm-2xs rounded px-2 py-1 hover:bg-surface-tertiary/40 transition-colors">
                    {a.annotation
                      ? <span className="text-content-secondary whitespace-pre-wrap break-words">{a.annotation}</span>
                      : <span className="text-content-muted/70 inline-flex items-center gap-1"><Pencil className="h-3 w-3" /> Adaugă notă</span>}
                  </button>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

function BriefingDetail({
  briefing, onChanged, me,
}: {
  briefing: Briefing;
  onChanged: () => void;
  me: User | null;
}) {
  const [tab, setTab] = useState<'briefing' | 'clarifications'>('briefing');
  const [clarifs, setClarifs] = useState<Clarification[]>([]);
  const [loadingClar, setLoadingClar] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [askingBusy, setAskingBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const isAssignee = me?.id === briefing.assigned_to_user_id;
  const isAuthor   = me?.id === briefing.created_by_user_id;
  const isAdmin    = me?.role_name === 'admin';
  const canManage  = isAssignee || isAdmin;
  const canCancel  = isAuthor || isAdmin;
  const isClosed   = ['completed', 'cancelled', 'rejected'].includes(briefing.status);

  const loadClarifs = useCallback(async () => {
    setLoadingClar(true);
    try {
      const list = await apiCommand<Clarification[]>('list_briefing_clarifications', { briefing_id: briefing.id });
      setClarifs(list);
    } catch {  }
    finally { setLoadingClar(false); }
  }, [briefing.id]);
  useEffect(() => { if (tab === 'clarifications') loadClarifs(); }, [tab, loadClarifs]);

  const askQuestion = async () => {
    if (!newQuestion.trim()) return;
    setAskingBusy(true);
    try {
      await apiCommand('ask_briefing_clarification', { briefing_id: briefing.id, question: newQuestion.trim() });
      setNewQuestion('');
      toast.success('Întrebare trimisă');
      await loadClarifs();
      onChanged();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Eroare'));
    } finally { setAskingBusy(false); }
  };

  const advance = async (next: Status, extra?: Record<string, any>) => {
    setBusy(true);
    try {
      await apiCommand('update_project_briefing_status', { id: briefing.id, status: next, ...extra });
      toast.success(`Status: ${STATUS_LABEL[next]}`);
      onChanged();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Eroare'));
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {}
      <div className="px-6 py-4 border-b border-line bg-surface-secondary shrink-0">
        <div className="flex items-start gap-3 mb-2">
          <h2 className="flex-1 text-pm-lg font-semibold text-content-primary">{briefing.title}</h2>
          <StatusBadge tone={STATUS_TONE[briefing.status]} label={STATUS_LABEL[briefing.status]} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-pm-xs text-content-muted">
          <span><UserIcon className="h-3 w-3 inline mr-1" />de la <strong>{briefing.created_by_name}</strong></span>
          <span>→ <strong>{briefing.assigned_to_name}</strong></span>
          {briefing.project_name && (
            <span><FileText className="h-3 w-3 inline mr-1" /> {briefing.project_name}</span>
          )}
          <span className={PRIORITY_COLOR[briefing.priority]}>● {PRIORITY_LABEL[briefing.priority]}</span>
          {briefing.deadline && (
            <span><CalendarIcon className="h-3 w-3 inline mr-1" /> deadline {formatDate(briefing.deadline)}</span>
          )}
          <span className="ml-auto">{timeAgo(briefing.created_at)}</span>
        </div>
      </div>

      {}
      <div className="flex items-center gap-0 border-b border-line shrink-0">
        <DetailTab active={tab === 'briefing'} onClick={() => setTab('briefing')}>
          <FileText className="h-3.5 w-3.5" /> Briefing
        </DetailTab>
        <DetailTab active={tab === 'clarifications'} onClick={() => setTab('clarifications')}>
          <MessageCircle className="h-3.5 w-3.5" /> Clarificări
          {briefing.open_clarifications > 0 && (
            <span className="ml-1 bg-status-red text-white rounded-full px-1.5 py-0 text-pm-2xs font-bold">
              {briefing.open_clarifications}
            </span>
          )}
        </DetailTab>
      </div>

      {}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'briefing' ? (
          <div className="space-y-5 max-w-3xl">
            <Section title="Scop"                  content={briefing.scope} />
            <Section title="Cerințe tehnice"       content={briefing.technical_requirements} />
            <Section title="Așteptări client"      content={briefing.client_expectations} />
            {briefing.rejection_reason && (
              <div className="border border-status-red/40 bg-status-red/5 rounded p-3">
                <p className="text-pm-xs font-semibold uppercase tracking-wider text-status-red mb-1">
                  <AlertTriangle className="h-3 w-3 inline mr-1" /> Motiv refuz
                </p>
                <p className="text-pm-sm text-content-primary whitespace-pre-wrap">{briefing.rejection_reason}</p>
              </div>
            )}
            <div className="border-t border-line pt-5">
              <BriefingAttachments briefingId={briefing.id} me={me} />
            </div>
          </div>
        ) : (
          <div className="max-w-3xl space-y-3">
            {loadingClar ? (
              <Loader2 className="h-5 w-5 animate-spin text-content-muted mx-auto" />
            ) : clarifs.length === 0 ? (
              <p className="text-pm-sm text-content-muted text-center py-8">
                Nicio clarificare. Apasă "Pune întrebare" dacă ceva nu e clar.
              </p>
            ) : (
              clarifs.map(c => (
                <ClarificationItem key={c.id} clar={c} onChanged={() => { loadClarifs(); onChanged(); }} />
              ))
            )}

            {!isClosed && (
              <div className="border border-line rounded p-3 bg-surface-tertiary/30 mt-4">
                <p className="text-pm-xs font-semibold uppercase tracking-wider text-content-muted mb-2">
                  Pune o întrebare nouă
                </p>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  rows={3}
                  placeholder="Ce nu este clar din briefing?"
                  className="w-full px-3 py-2 border border-line bg-surface-primary rounded text-pm-sm focus:outline-none focus:border-accent resize-none"
                />
                <div className="flex items-center justify-end mt-2">
                  <button onClick={askQuestion} disabled={askingBusy || !newQuestion.trim()}
                    className="h-8 px-4 rounded bg-accent text-pm-xs font-semibold text-surface-primary hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1.5">
                    {askingBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Trimite
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {}
      <div className="px-6 py-3 border-t border-line bg-surface-secondary shrink-0 flex items-center gap-2 flex-wrap">
        {canManage && briefing.status === 'sent' && (
          <Button size="sm" onClick={() => advance('accepted')} disabled={busy}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Acceptă
          </Button>
        )}
        {canManage && (briefing.status === 'sent' || briefing.status === 'acknowledged') && (
          <Button size="sm" variant="outline" onClick={() => {
            const r = prompt('Motiv refuz:');
            if (r) advance('rejected', { rejection_reason: r });
          }} disabled={busy}>
            <X className="h-3.5 w-3.5" /> Refuză
          </Button>
        )}
        {canManage && briefing.status === 'clarification_requested' && (
          <Button size="sm" onClick={() => advance('accepted')} disabled={busy}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Acceptă oricum
          </Button>
        )}
        {canManage && briefing.status === 'accepted' && (
          <Button size="sm" onClick={() => advance('completed')} disabled={busy}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Marchează finalizat
          </Button>
        )}
        {briefing.status === 'accepted' && (
          <Button size="sm" variant="outline" disabled title="Creare fișa proiectant pre-populată (în pasul 5)">
            <FileText className="h-3.5 w-3.5" /> Creează fișa (soon)
          </Button>
        )}
        {canCancel && !isClosed && (
          <Button size="sm" variant="outline" onClick={() => {
            if (confirm('Sigur anulezi briefing-ul?')) advance('cancelled');
          }} disabled={busy}>
            Anulează briefing
          </Button>
        )}
        {isClosed && (
          <span className="text-pm-xs text-content-muted">
            {STATUS_LABEL[briefing.status]} {briefing.completed_at && `· ${formatDate(briefing.completed_at)}`}
          </span>
        )}
      </div>
    </div>
  );
}

function Section({ title, content }: { title: string; content: string | null }) {
  return (
    <div>
      <p className="text-pm-xs font-bold uppercase tracking-wider text-content-muted mb-1.5">{title}</p>
      {content
        ? <p className="text-pm-sm text-content-primary whitespace-pre-wrap leading-relaxed">{content}</p>
        : <p className="text-pm-sm text-content-muted/60 italic">— necompletat —</p>}
    </div>
  );
}

function DetailTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-pm-sm font-medium flex items-center gap-1.5 border-b-2 ${
        active ? 'border-accent text-content-primary' : 'border-transparent text-content-muted hover:text-content-primary'
      }`}>
      {children}
    </button>
  );
}

function ClarificationItem({
  clar, onChanged,
}: {
  clar: Clarification;
  onChanged: () => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const answer = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await apiCommand('answer_briefing_clarification', { id: clar.id, answer: reply.trim() });
      setReply(''); setReplyOpen(false);
      toast.success('Răspuns trimis');
      onChanged();
    } catch (e: unknown) { toast.error(getErrorMessage(e, 'Eroare')); }
    finally { setBusy(false); }
  };
  const reopen = async () => {
    setBusy(true);
    try {
      await apiCommand('reopen_briefing_clarification', { id: clar.id });
      toast.info('Întrebare redeschisă');
      onChanged();
    } catch (e: unknown) { toast.error(getErrorMessage(e, 'Eroare')); }
    finally { setBusy(false); }
  };

  return (
    <div className={`border rounded p-3 ${clar.status === 'pending' ? 'border-status-amber/40 bg-status-amber/5' : 'border-line bg-surface-primary'}`}>
      <div className="flex items-start gap-2">
        <MessageCircle className={`h-4 w-4 mt-0.5 shrink-0 ${clar.status === 'pending' ? 'text-status-amber' : 'text-content-muted'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-pm-xs text-content-muted">
            <strong className="text-content-secondary">{clar.asked_by_name}</strong> · {timeAgo(clar.asked_at)}
          </p>
          <p className="text-pm-sm text-content-primary mt-1 whitespace-pre-wrap">{clar.question}</p>
        </div>
      </div>

      {clar.status === 'answered' && clar.answer && (
        <div className="ml-6 mt-3 pl-3 border-l-2 border-status-green/40">
          <p className="text-pm-xs text-content-muted">
            <Reply className="h-3 w-3 inline" /> <strong className="text-content-secondary">{clar.answered_by_name}</strong> · {timeAgo(clar.answered_at)}
          </p>
          <p className="text-pm-sm text-content-primary mt-1 whitespace-pre-wrap">{clar.answer}</p>
          <button onClick={reopen} disabled={busy}
            className="text-pm-2xs text-content-muted hover:text-status-red mt-1.5 flex items-center gap-1">
            <RotateCcw className="h-3 w-3" /> Redeschide
          </button>
        </div>
      )}

      {clar.status === 'pending' && (
        <div className="ml-6 mt-2">
          {!replyOpen ? (
            <button onClick={() => setReplyOpen(true)}
              className="text-pm-xs text-accent hover:underline flex items-center gap-1">
              <Reply className="h-3 w-3" /> Răspunde
            </button>
          ) : (
            <div className="space-y-2">
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} autoFocus
                placeholder="Răspunsul tău..."
                className="w-full px-3 py-2 border border-line bg-surface-primary rounded text-pm-sm focus:outline-none focus:border-accent resize-none" />
              <div className="flex items-center gap-2">
                <button onClick={() => { setReplyOpen(false); setReply(''); }} disabled={busy}
                  className="h-7 px-3 rounded border border-line text-pm-xs text-content-secondary hover:bg-surface-tertiary">
                  Anulează
                </button>
                <button onClick={answer} disabled={busy || !reply.trim()}
                  className="h-7 px-3 rounded bg-accent text-pm-xs font-semibold text-surface-primary hover:bg-accent/90 disabled:opacity-50">
                  {busy ? '...' : 'Trimite răspuns'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}





function CreateModal({
  onClose, onCreated, users, projects,
}: {
  onClose: () => void;
  onCreated: () => void;
  users: UserRow[];
  projects: Array<{ id: number; name: string }>;
}) {
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState<number | ''>('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [scope, setScope] = useState('');
  const [tech, setTech] = useState('');
  const [client, setClient] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [saving, setSaving] = useState(false);

  const save = async (status: 'draft' | 'sent') => {
    if (!title.trim()) { toast.error('Titlu obligatoriu'); return; }
    if (!assignedTo) { toast.error('Selectează un proiectant'); return; }
    setSaving(true);
    try {
      await apiCommand('create_project_briefing', {
        title: title.trim(),
        project_id: projectId || null,
        assigned_to_user_id: Number(assignedTo),
        scope: scope.trim() || null,
        technical_requirements: tech.trim() || null,
        client_expectations: client.trim() || null,
        deadline: deadline || null,
        priority,
        status,
      });
      toast.success(status === 'draft' ? 'Salvat ca ciornă' : 'Briefing trimis');
      onCreated();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Eroare la salvare'));
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-surface-primary border border-line rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-pm-lg font-semibold text-content-primary">Briefing nou</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-tertiary text-content-muted">
            <X className="h-4 w-4 m-auto" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Field label="Titlu" required>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Stație betoane M60 — proiectare turn"
              className="w-full h-10 px-3 border border-line bg-surface-primary rounded text-pm-sm focus:outline-none focus:border-accent" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Proiectant" required>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : '')}
                className="w-full h-10 px-3 border border-line bg-surface-primary rounded text-pm-sm focus:outline-none focus:border-accent">
                <option value="">— Selectează —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.username}{u.job_title ? ` (${u.job_title})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Proiect (opțional)">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
                className="w-full h-10 px-3 border border-line bg-surface-primary rounded text-pm-sm focus:outline-none focus:border-accent">
                <option value="">— Standalone —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Deadline">
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-10 px-3 border border-line bg-surface-primary rounded text-pm-sm focus:outline-none focus:border-accent" />
            </Field>
            <Field label="Prioritate">
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full h-10 px-3 border border-line bg-surface-primary rounded text-pm-sm focus:outline-none focus:border-accent">
                {(Object.keys(PRIORITY_LABEL) as Priority[]).map(p =>
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Scop"><textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={3}
            placeholder="Ce trebuie făcut, în mare?"
            className="w-full px-3 py-2 border border-line bg-surface-primary rounded text-pm-sm focus:outline-none focus:border-accent resize-none" /></Field>
          <Field label="Cerințe tehnice"><textarea value={tech} onChange={(e) => setTech(e.target.value)} rows={3}
            placeholder="Specs, materiale, dimensiuni, standarde..."
            className="w-full px-3 py-2 border border-line bg-surface-primary rounded text-pm-sm focus:outline-none focus:border-accent resize-none" /></Field>
          <Field label="Așteptări client"><textarea value={client} onChange={(e) => setClient(e.target.value)} rows={3}
            placeholder="Ce așteaptă clientul ca rezultat final?"
            className="w-full px-3 py-2 border border-line bg-surface-primary rounded text-pm-sm focus:outline-none focus:border-accent resize-none" /></Field>
        </div>

        <div className="px-5 py-3 border-t border-line bg-surface-secondary flex items-center gap-2">
          <button onClick={() => save('draft')} disabled={saving}
            className="h-9 px-4 rounded border border-line text-pm-sm text-content-secondary hover:bg-surface-tertiary disabled:opacity-50">
            Salvează ca ciornă
          </button>
          <button onClick={() => save('sent')} disabled={saving}
            className="ml-auto h-9 px-5 rounded bg-accent text-pm-sm font-semibold text-surface-primary hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Trimite briefing
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-pm-xs font-semibold text-content-secondary mb-1">
        {label} {required && <span className="text-status-red">*</span>}
      </label>
      {children}
    </div>
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
