















import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Truck, Package, CheckCircle2, Clock, Filter, Loader2, X,
  ChevronRight, AlertTriangle, FileText, StickyNote, Pencil, Save,
} from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import Page from '@/components/ui/Page';
import { HeroHeader, GlassCard, MetricValue } from '@/components/ui';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import type { SupplierCode } from '@/pages/parts-tree/SupplierCodesModal';
import { getErrorMessage } from '@/utils/errors';
import { filterSelectCls } from '@/components/ui/filterControls';











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
    if (!confirm(row.status === 'requested'
      ? 'Sigur ștergi această cerere?'
      : 'Sigur anulezi această comandă? Va rămâne în istoric ca "anulat".')) return;
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

  return (
    
    
    
    
    
    
    
    <Page className="!overflow-hidden mod-shell">
      {}
      <div className="px-5 pt-4 pb-8 space-y-4 shrink-0">
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Proiectare"
          icon={Truck}
          title="Piese de comandat"
          subtitle="Tracking pe ciclul cerere → comandă → sosire → montaj"
        />
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={Clock}        label="Cerute"    value={byStatus.requested.length} warn={byStatus.requested.length > 0} />
          <KpiMini icon={Truck}        label="Comandate" value={byStatus.ordered.length} />
          <KpiMini icon={Package}      label="Sosite"    value={byStatus.arrived.length} />
          <KpiMini icon={CheckCircle2} label="Montate"   value={byStatus.installed.length} />
        </div>
      </div>

      {}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-line shrink-0 bg-surface-secondary flex-wrap">
        <Filter className="h-3.5 w-3.5 text-content-muted" />
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className={filterSelectCls(projectFilter !== 'all')}>
          <option value="all">Toate proiectele</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)}
          className={filterSelectCls(codeFilter !== 'all')}>
          <option value="all">Toate codurile</option>
          {codes.map(c => <option key={c.id} value={c.code}>{c.code} — {c.label}</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={refresh}>Actualizează</Button>
        <span className="ml-auto text-pm-xs text-content-muted">
          {rows.length} {rows.length === 1 ? 'cerere' : 'cereri'}
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-content-muted gap-2 p-6 text-center">
          <Package className="h-8 w-8" />
          <p className="text-pm-sm">Nicio cerere de aprovizionare în acest moment.</p>
          <p className="text-pm-xs">
            Adaugă prefix de cod (ex: <code className="font-mono bg-surface-tertiary px-1 rounded">CMO_</code>) la numele unei piese
            din Arbore — apare automat aici.
          </p>
        </div>
      ) : (
        
        
        
        
        
        
        
        
        <div className="flex flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
          {COLUMNS.map((col, i) => {
            const Icon = col.icon;
            const cards = byStatus[col.status];
            const isLast = i === COLUMNS.length - 1;
            return (
              <div
                key={col.status}
                className={`flex min-w-[260px] flex-1 flex-col bg-surface-secondary ${isLast ? '' : 'border-r border-line'}`}
              >
                <div
                  className="flex items-center gap-2 px-3 py-2.5 border-b border-line shrink-0"
                  style={{ borderTop: `3px solid ${col.accent}` }}
                >
                  <Icon className={`h-4 w-4 ${col.iconClass}`} />
                  <h3 className={`text-pm-sm font-semibold ${col.iconClass}`}>{col.label}</h3>
                  <span className="ml-auto bg-surface-tertiary px-2 text-pm-2xs font-semibold text-content-muted tabular-nums rounded">
                    {cards.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
                  {cards.length === 0 ? (
                    <p className="text-pm-xs text-content-muted/60 text-center py-4">Niciuna</p>
                  ) : cards.map(row => (
                    <Card
                      key={row.id}
                      row={row}
                      codeColor={codeColor(row.supplier_code)}
                      busy={busy === row.id}
                      canEditNotes={isAdmin || row.requested_by_user_id === me?.id}
                      onAdvance={(next) => advance(row, next)}
                      onCancel={() => cancel(row)}
                      onSaveNotes={(notes) => saveNotes(row, notes)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}


function KpiMini({ icon: Icon, label, value, warn }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; warn?: boolean;
}) {
  return (
    <GlassCard size="compact" className="flex items-center gap-3.5 !p-5">
      <span className="h-11 w-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted truncate">{label}</p>
        <MetricValue value={value} size="display" warn={warn} className="mt-0.5 block" />
      </div>
    </GlassCard>
  );
}

function Card({ row, codeColor, busy, canEditNotes, onAdvance, onCancel, onSaveNotes }: {
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
    <div className="bg-surface-primary border border-line rounded p-2.5 shadow-sm">
      <div className="flex items-start gap-2 mb-1.5">
        {row.supplier_code && (
          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-white text-pm-2xs shrink-0"
            style={{ background: codeColor }}>
            {row.supplier_code}
          </span>
        )}
        <p className="flex-1 text-pm-sm font-semibold text-content-primary leading-tight">{row.piece_name}</p>
        {row.quantity > 1 && (
          <span className="text-pm-2xs text-content-muted font-mono shrink-0">×{row.quantity}</span>
        )}
      </div>

      {


}
      {kind && (
        <StatusBadge
          size="xs"
          tone={kind === 'assembly' ? 'info' : 'success'}
          label={kind === 'assembly' ? 'ansamblu' : 'piesă'}
          className="mb-1.5"
        />
      )}

      <p className="text-pm-xs text-content-muted truncate mb-1.5" title={row.project_name}>
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
        <div className="mt-1.5 space-y-1">
          <textarea
            value={noteBuffer}
            onChange={(e) => setNoteBuffer(e.target.value)}
            placeholder="Ex: doar 4 din 10 buc, sau doar șuruburile…"
            maxLength={500}
            rows={2}
            autoFocus
            className="w-full text-pm-xs px-1.5 py-1 border border-line rounded bg-surface-primary text-content-primary resize-y"
          />
          <div className="flex items-center gap-1 justify-end">
            <button
              type="button"
              onClick={() => { setEditing(false); setNoteBuffer(row.notes || ''); }}
              disabled={busy}
              className="h-6 px-2 rounded border border-line text-pm-2xs text-content-muted hover:bg-surface-tertiary disabled:opacity-50"
            >
              Renunță
            </button>
            <button
              type="button"
              onClick={commitNotes}
              disabled={busy}
              className="h-6 px-2 rounded bg-accent text-pm-2xs text-surface-primary font-semibold hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1"
            >
              {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Save className="h-2.5 w-2.5" />}
              Salvează
            </button>
          </div>
        </div>
      ) : row.notes ? (
        <div className="mt-1.5 flex items-start gap-1 group">
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
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Editează nota"
              className="opacity-70 group-hover:opacity-100 h-5 w-5 rounded hover:bg-surface-tertiary flex items-center justify-center text-content-muted hover:text-content-primary transition-opacity"
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      ) : canEditNotes ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1.5 inline-flex items-center gap-1 text-pm-2xs text-content-muted hover:text-accent"
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

      {}
      {row.status !== 'installed' && row.status !== 'cancelled' && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-line/40">
          {nxt.next && (
            <button onClick={() => onAdvance(nxt.next!)} disabled={busy}
              className="h-7 px-2.5 rounded bg-accent text-pm-xs font-semibold text-surface-primary hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
              {nxt.label}
            </button>
          )}
          <button onClick={onCancel} disabled={busy}
            title="Anulează"
            className="h-7 w-7 rounded border border-line text-content-muted hover:bg-status-red/10 hover:text-status-red flex items-center justify-center disabled:opacity-50">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {row.status === 'cancelled' && (
        <div className="mt-2 pt-2 border-t border-line/40 flex items-center gap-1 text-pm-xs text-status-red">
          <AlertTriangle className="h-3 w-3" /> Anulat
          <button onClick={() => onAdvance('requested')} disabled={busy}
            className="ml-auto text-pm-2xs hover:underline">re-deschide</button>
        </div>
      )}
    </div>
  );
}
