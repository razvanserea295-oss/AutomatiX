

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Truck, Package, CheckCircle2, Clock, Loader2, X,
  ChevronRight, AlertTriangle, FileText, StickyNote, Pencil, Save,
  Tag, RefreshCw,
} from '@/icons';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import type { SupplierCode } from '@/pages/parts-tree/SupplierCodesModal';
import { getErrorMessage } from '@/utils/errors';
import { confirmDialog } from '@/components/ConfirmDialog';

import { PageChrome, DashboardLayout, PANEL_HEAD } from '@/app-ui';
import Card from '@/redesign/ui/Card';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import StatusBadge from '@/redesign/ui/StatusBadge';
import EmptyState from '@/redesign/ui/EmptyState';
import { filterSelectCls } from '@/redesign/ui/filterControls';

function fileKind(fileName: string | null | undefined): 'assembly' | 'part' | null {
  if (!fileName) return null;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'sldasm') return 'assembly';
  if (ext === 'sldprt') return 'part';
  return null;
}

type Status = 'requested' | 'ordered' | 'arrived' | 'installed' | 'cancelled';

interface OrderRow {
  id: number;
  piece_id: number;
  status: Status;
  supplier_code: string | null;
  quantity: number;
  notes: string | null;
  requested_by_user_id: number | null;
  requested_by_name: string | null;
  requested_at: string;
  ordered_by_user_id: number | null;
  ordered_by_name: string | null;
  ordered_at: string | null;
  purchase_order_id: number | null;
  arrived_by_user_id: number | null;
  arrived_by_name: string | null;
  arrived_at: string | null;
  installed_by_user_id: number | null;
  installed_by_name: string | null;
  installed_at: string | null;
  piece_name: string;
  piece_category: string;
  source_file_name: string | null;
  project_id: number;
  project_name: string;
}

const COLUMNS: { status: Status; label: string; icon: typeof Truck; iconClass: string; accent: string }[] = [
  { status: 'requested', label: 'Cerute',    icon: Clock,        iconClass: 'text-status-amber',  accent: '#f59e0b' },
  { status: 'ordered',   label: 'Comandate', icon: Truck,        iconClass: 'text-status-blue',   accent: '#3b82f6' },
  { status: 'arrived',   label: 'Sosite',    icon: Package,      iconClass: 'text-status-purple', accent: '#a855f7' },
  { status: 'installed', label: 'Montate',   icon: CheckCircle2, iconClass: 'text-status-green',  accent: '#22c55e' },
];

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return 'azi';
  if (days === 1) return 'ieri';
  if (days < 7)   return `acum ${days} zile`;
  if (days < 30)  return `acum ${Math.floor(days / 7)} săpt.`;
  return d.toLocaleDateString('ro-RO');
}

export default function PiecesOrderingPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [codes, setCodes] = useState<SupplierCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<number | 'all'>('all');
  const [codeFilter, setCodeFilter] = useState<string | 'all'>('all');
  const [busy, setBusy] = useState<number | null>(null); 
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const me = useAuthStore(s => s.user);
  const isAdmin = (me?.role_name || '').toLowerCase() === 'admin';

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, codeList] = await Promise.all([
        apiCommand<OrderRow[]>('get_piece_orders', {
          project_id: projectFilter === 'all' ? undefined : projectFilter,
          supplier_code: codeFilter === 'all' ? undefined : codeFilter,
        }),
        apiCommand<SupplierCode[]>('get_supplier_codes', { include_inactive: false }),
      ]);
      setRows(list);
      setCodes(codeList);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Nu pot încărca cererile'));
    } finally {
      setLoading(false);
    }
  }, [projectFilter, codeFilter]);

  useEffect(() => { fetchProjects().catch(() => {}); }, [fetchProjects]);
  useEffect(() => { refresh(); }, [refresh]);

  const byStatus = useMemo(() => {
    const map: Record<Status, OrderRow[]> = {
      requested: [], ordered: [], arrived: [], installed: [], cancelled: [],
    };
    for (const r of rows) map[r.status].push(r);
    return map;
  }, [rows]);

  const advance = async (row: OrderRow, next: Status) => {
    setBusy(row.id);
    try {
      await apiCommand('update_piece_order_status', { id: row.id, status: next });
      toast.success(`Marcat ca "${next}"`);
      await refresh();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Tranziție eșuată'));
    } finally {
      setBusy(null);
    }
  };

  const saveNotes = async (row: OrderRow, notes: string) => {
    setBusy(row.id);
    try {
      await apiCommand('update_piece_order_notes', { id: row.id, notes });
      toast.success(notes.trim() ? 'Notă actualizată' : 'Notă ștearsă');
      await refresh();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Salvare eșuată'));
      throw e; 
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (row: OrderRow) => {
    if (!(await confirmDialog(row.status === 'requested'
      ? { title: 'Sigur ștergi această cerere?', danger: true, confirmLabel: 'Șterge' }
      : { title: 'Sigur anulezi această comandă?', body: 'Va rămâne în istoric ca "anulat".', danger: true, confirmLabel: 'Anulează comanda' }))) return;
    setBusy(row.id);
    try {
      await apiCommand('cancel_piece_order', { id: row.id });
      toast.success('Cerere anulată');
      await refresh();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Anulare eșuată'));
    } finally {
      setBusy(null);
    }
  };

  const codeColor = (code: string | null): string => {
    if (!code) return '#6b7280';
    return codes.find(c => c.code === code)?.color || '#f97316';
  };

  const ACTIVE_COLUMNS = COLUMNS.filter(c => c.status !== 'installed');
  const installedCol = COLUMNS.find(c => c.status === 'installed')!;

  const renderCard = (row: OrderRow) => (
    <PieceCard
      key={row.id}
      row={row}
      codeColor={codeColor(row.supplier_code)}
      busy={busy === row.id}
      canEditNotes={isAdmin || row.requested_by_user_id === me?.id}
      onAdvance={(next) => advance(row, next)}
      onCancel={() => cancel(row)}
      onSaveNotes={(notes) => saveNotes(row, notes)}
    />
  );

  return (
    <DashboardLayout
        
        chrome={(
          <PageChrome
            actions={
              <Button size="md" variant="outline" onClick={() => void refresh()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Reîmprospătează
              </Button>
            }
            toolbar={(
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={projectFilter === 'all' ? '' : String(projectFilter)}
                  onChange={e => setProjectFilter(e.target.value ? Number(e.target.value) : 'all')}
                  className={filterSelectCls(projectFilter !== 'all')}
                >
                  <option value="">Toate proiectele</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select
                  value={codeFilter === 'all' ? '' : codeFilter}
                  onChange={e => setCodeFilter(e.target.value || 'all')}
                  className={filterSelectCls(codeFilter !== 'all')}
                >
                  <option value="">Toate codurile</option>
                  {codes.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                </select>
              </div>
            )}
          />
        )}
      >
        {loading ? (
          <Card padding="lg" className="flex-1 min-h-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
          </Card>
        ) : rows.length === 0 ? (
          <Card padding="lg" className="flex-1 min-h-0 flex flex-col">
            <EmptyState
              icon={Package}
              title="Nicio cerere de aprovizionare în acest moment."
              description="Adaugă prefix de cod (ex: CMO_) la numele unei piese din Arbore — apare automat aici."
            />
          </Card>
        ) : (
          
          <div className=" flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4">
            <Card padding="none" className="xl:col-span-8 min-w-0 min-h-0 flex flex-col overflow-hidden">
              <div className={`shrink-0 ${PANEL_HEAD} flex items-center gap-2`}>
                <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                  <Truck className="h-4 w-4" />
                </span>
                <h2 className="text-pm-lg font-semibold text-content-primary leading-tight">Pipeline activ</h2>
                <span
                  key={`inflight-${byStatus.requested.length + byStatus.ordered.length + byStatus.arrived.length}`}
                  className="anim-pop ml-auto text-pm-2xs font-semibold text-content-muted tabular-nums px-2 py-0.5 rounded-md bg-surface-tertiary"
                >
                  {byStatus.requested.length + byStatus.ordered.length + byStatus.arrived.length} în lucru
                </span>
              </div>
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-px bg-line/60">
                {ACTIVE_COLUMNS.map((col) => {
                  const Icon = col.icon;
                  const cards = byStatus[col.status];

                  const activeTotal = byStatus.requested.length + byStatus.ordered.length + byStatus.arrived.length;
                  const share = activeTotal > 0 ? Math.round((cards.length / activeTotal) * 100) : 0;
                  return (
                    <div key={col.status} className="flex flex-col bg-surface-primary min-w-0 min-h-0">
                      <div
                        className="flex items-center gap-2 px-3 py-2 border-b border-line/70 shrink-0"
                        style={{ borderTop: `3px solid ${col.accent}` }}
                      >
                        <Icon className={`h-4 w-4 ${col.iconClass}`} />
                        <h3 className={`text-pm-sm font-semibold ${col.iconClass}`}>{col.label}</h3>
                        <span className="ml-auto bg-surface-tertiary px-2 text-pm-2xs font-semibold text-content-muted tabular-nums rounded">
                          {cards.length}
                        </span>
                      </div>
                      <div className="shrink-0 h-1 bg-surface-tertiary/60">
                        <div
                          className="anim-bar-grow h-full motion-reduce:transition-none"
                          style={{ width: `${share}%`, background: col.accent, animationDelay: '200ms' }}
                          aria-hidden
                        />
                      </div>
                      <div
                        key={`${col.status}-${cards.length}`}
                        className="stagger-in flex-1 overflow-y-auto p-2 space-y-2 min-h-0"
                      >
                        {cards.length === 0 ? (
                          <p className="text-pm-xs text-content-muted/60 text-center py-6">Niciuna</p>
                        ) : cards.map(renderCard)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            <div className="xl:col-span-4 min-w-0 min-h-0 flex flex-col gap-4">
              <Card padding="none" className="min-w-0 min-h-0 flex-1 flex flex-col overflow-hidden">
                <div
                  className="shrink-0 px-4 py-3 border-b border-line/70 flex items-center gap-2"
                  style={{ borderTop: `3px solid ${installedCol.accent}` }}
                >
                  <CheckCircle2 className={`h-4 w-4 ${installedCol.iconClass}`} />
                  <h3 className={`text-pm-sm font-semibold ${installedCol.iconClass}`}>{installedCol.label}</h3>
                  <span className="ml-auto bg-surface-tertiary px-2 text-pm-2xs font-semibold text-content-muted tabular-nums rounded">
                    {byStatus.installed.length}
                  </span>
                </div>
                <div
                  key={`installed-${byStatus.installed.length}`}
                  className="stagger-in flex-1 overflow-y-auto p-2 space-y-2 min-h-0"
                >
                  {byStatus.installed.length === 0 ? (
                    <p className="text-pm-xs text-content-muted/60 text-center py-6">Nicio piesă montată încă</p>
                  ) : byStatus.installed.map(renderCard)}
                </div>
              </Card>
              <Card padding="lg" className="min-w-0 shrink-0 max-h-[40%] overflow-y-auto">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                    <Tag className="h-4 w-4" />
                  </span>
                  <h3 className="text-pm-md font-semibold text-content-primary leading-tight">Coduri furnizor</h3>
                  <span className="ml-auto text-pm-2xs font-semibold text-content-muted tabular-nums px-2 py-0.5 rounded-md bg-surface-tertiary">
                    {codes.length}
                  </span>
                </div>
                {codes.length === 0 ? (
                  <p className="text-pm-xs text-content-muted">Niciun cod definit. Se gestionează din Arbore → „Coduri".</p>
                ) : (
                  <div key={`codes-${codes.length}`} className="stagger-in space-y-2">
                    {codes.map(c => (
                      <div key={c.id} className="flex items-center gap-2 min-w-0">
                        <span
                          className="px-1.5 py-0.5 rounded font-mono font-bold text-white text-pm-2xs shrink-0"
                          style={{ background: c.color || '#f97316' }}
                        >
                          {c.code}
                        </span>
                        <span className="text-pm-xs text-content-secondary truncate" title={c.label}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
    </DashboardLayout>
  );
}

function PieceCard({ row, codeColor, busy, canEditNotes, onAdvance, onCancel, onSaveNotes }: {
  row: OrderRow;
  codeColor: string;
  busy: boolean;
  canEditNotes: boolean;
  onAdvance: (next: Status) => void;
  onCancel: () => void;
  onSaveNotes: (notes: string) => Promise<void>;
}) {
  const nextLabel: Record<Status, { next?: Status; label: string }> = {
    requested: { next: 'ordered',   label: 'Confirmă comandă' },
    ordered:   { next: 'arrived',   label: 'Confirmă sosire' },
    arrived:   { next: 'installed', label: 'Marchează montat' },
    installed: { label: 'Finalizat' },
    cancelled: { label: 'Anulat' },
  };
  const nxt = nextLabel[row.status];
  const kind = fileKind(row.source_file_name);

  const [editing, setEditing] = useState(false);
  const [noteBuffer, setNoteBuffer] = useState(row.notes || '');
  useEffect(() => { setNoteBuffer(row.notes || ''); }, [row.notes]);

  const commitNotes = async () => {
    try {
      await onSaveNotes(noteBuffer);
      setEditing(false);
    } catch {  }
  };

  return (
    <div className="bg-surface-primary border border-line rounded-xl p-3 shadow-[var(--elevation-1)] transition-smooth duration-150 hover:shadow-[var(--elevation-2)] motion-reduce:transition-none">
      <div className="flex items-start gap-2 mb-2">
        {row.supplier_code && (
          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-white text-pm-2xs shrink-0"
            style={{ background: codeColor }}>
            {row.supplier_code}
          </span>
        )}
        <p className="flex-1 min-w-0 text-pm-sm font-semibold text-content-primary leading-tight break-words">{row.piece_name}</p>
        {row.quantity > 1 && (
          <span className="text-pm-2xs text-content-muted font-mono shrink-0">×{row.quantity}</span>
        )}
      </div>

      {

}
      {kind && (
        <div className="mb-2">
          <StatusBadge
            size="xs"
            tone={kind === 'assembly' ? 'info' : 'success'}
            label={kind === 'assembly' ? 'ansamblu' : 'piesă'}
          />
        </div>
      )}

      <p className="text-pm-xs text-content-muted truncate mb-2" title={row.project_name}>
        <FileText className="h-3 w-3 inline mr-1" /> {row.project_name}
      </p>
      {row.source_file_name && (
        <p className="text-pm-2xs text-content-muted/70 font-mono truncate" title={row.source_file_name}>
          {row.source_file_name}
        </p>
      )}

      {

}
      {editing ? (
        <div className="anim-fade-slide-in mt-2 space-y-1">
          <textarea
            value={noteBuffer}
            onChange={(e) => setNoteBuffer(e.target.value)}
            placeholder="Ex: doar 4 din 10 buc, sau doar șuruburile…"
            maxLength={500}
            rows={2}
            autoFocus
            className="w-full text-pm-xs px-1.5 py-1 rounded-lg border border-line/70 bg-surface-secondary/40 text-content-primary resize-y focus:outline-none focus:border-accent focus-visible:shadow-[var(--ring-soft)] focus:shadow-[var(--ring-soft)] transition-smooth duration-150 motion-reduce:transition-none"
          />
          <div className="flex items-center gap-1 justify-end">
            <button
              type="button"
              onClick={() => { setEditing(false); setNoteBuffer(row.notes || ''); }}
              disabled={busy}
              className="h-6 px-2 rounded-lg border border-line text-pm-2xs text-content-muted transition-smooth duration-150 hover:bg-surface-tertiary hover:text-content-primary active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none"
            >
              Renunță
            </button>
            <button
              type="button"
              onClick={commitNotes}
              disabled={busy}
              className="h-6 px-2 rounded-lg bg-accent text-pm-2xs text-[var(--color-on-accent)] font-semibold transition-smooth duration-150 hover:bg-accent/90 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-50 inline-flex items-center justify-center gap-1 motion-reduce:transition-none"
            >
              {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Save className="h-2.5 w-2.5" />}
              Salvează
            </button>
          </div>
        </div>
      ) : row.notes ? (
        <div className="mt-2 flex items-start gap-1 group">
          <StickyNote className="h-3 w-3 shrink-0 mt-0.5 text-content-muted/70" />
          {

}
          <p
            className="flex-1 min-w-0 text-pm-xs text-content-secondary italic break-words"
            style={{ overflowWrap: 'anywhere' }}
          >
            {row.notes}
          </p>
          {canEditNotes && (
            <IconButton
              size="sm"
              onClick={() => setEditing(true)}
              title="Editează nota"
              aria-label="Editează nota"
              className="shrink-0 h-6 w-6 [&>svg]:h-3 [&>svg]:w-3 opacity-70 group-hover:opacity-100 transition-opacity"
            >
              <Pencil />
            </IconButton>
          )}
        </div>
      ) : canEditNotes ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 inline-flex items-center gap-1 rounded-lg text-pm-2xs text-content-muted transition-smooth duration-150 hover:text-accent active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] motion-reduce:transition-none"
        >
          <StickyNote className="h-2.5 w-2.5" /> Adaugă notă
        </button>
      ) : null}

      <div className="mt-2 pt-2 border-t border-line/40 space-y-0.5 text-pm-2xs text-content-muted">
        {row.requested_at && (
          <p>
            <span className="font-semibold">Cerut:</span> {timeAgo(row.requested_at)}
            {row.requested_by_name && <span> · {row.requested_by_name}</span>}
          </p>
        )}
        {row.ordered_at && (
          <p>
            <span className="font-semibold">Comandat:</span> {timeAgo(row.ordered_at)}
            {row.ordered_by_name && <span> · {row.ordered_by_name}</span>}
            {row.purchase_order_id && <span> · PO #{row.purchase_order_id}</span>}
          </p>
        )}
        {row.arrived_at && (
          <p>
            <span className="font-semibold">Sosit:</span> {timeAgo(row.arrived_at)}
            {row.arrived_by_name && <span> · {row.arrived_by_name}</span>}
          </p>
        )}
        {row.installed_at && (
          <p>
            <span className="font-semibold">Montat:</span> {timeAgo(row.installed_at)}
            {row.installed_by_name && <span> · {row.installed_by_name}</span>}
          </p>
        )}
      </div>
      {row.status !== 'installed' && row.status !== 'cancelled' && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-line/40">
          {nxt.next && (
            <button onClick={() => onAdvance(nxt.next!)} disabled={busy}
              className="h-7 px-2 rounded-lg bg-accent text-pm-xs font-semibold text-[var(--color-on-accent)] transition-smooth duration-150 hover:bg-accent/90 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-50 inline-flex items-center justify-center gap-1 motion-reduce:transition-none">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
              {nxt.label}
            </button>
          )}
          <IconButton
            intent="danger"
            size="sm"
            onClick={onCancel}
            disabled={busy}
            title="Anulează"
            aria-label="Anulează"
            className="h-7 w-7 border border-line"
          >
            <X />
          </IconButton>
        </div>
      )}

      {row.status === 'cancelled' && (
        <div className="mt-2 pt-2 border-t border-line/40 flex items-center gap-1 text-pm-xs text-status-red">
          <AlertTriangle className="h-3 w-3" /> Anulat
          <button onClick={() => onAdvance('requested')} disabled={busy}
            className="ml-auto rounded text-pm-2xs transition-smooth duration-150 hover:underline active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none">re-deschide</button>
        </div>
      )}
    </div>
  );
}
