import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search, X } from 'lucide-react';
import { formatDateTimeRo } from '@/lib/format';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import { getErrorMessage } from '@/utils/errors';
import StatusBadge from '@/components/ui/StatusBadge';
import type { StatusTone } from '@/lib/statusTokens';
import { filterSearchInputCls, filterSearchIconCls, filterSelectCls, filterDateInputCls } from '@/components/ui/filterControls';

interface AuditRow {
  source: 'audit_logs' | 'audit_log';
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;             
  entity: string | null;
  entity_id: number | null;
  details: string | null;     
  diff_json: string | null;   
  ip_address: string | null;
  created_at: string;
}

const rowKey = (r: AuditRow) => `${r.source}-${r.id}`;

interface Filters {
  entity: string;
  action: '' | 'create' | 'update' | 'delete';
  since: string;
  until: string;
  query: string;
}

const EMPTY_FILTERS: Filters = { entity: '', action: '', since: '', until: '', query: '' };

export default function AuditLogPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const ipcFilters = useMemo(() => {
    const f: Record<string, unknown> = { limit: 200 };
    if (filters.entity) f.entity = filters.entity;
    if (filters.action) f.action = filters.action;
    if (filters.since) f.since = new Date(filters.since).toISOString();
    if (filters.until) f.until = new Date(filters.until).toISOString();
    return f;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      
      
      
      const [list, count] = await Promise.all([
        apiCommand<AuditRow[]>('audit_list', ipcFilters),
        apiCommand<number>('audit_count', ipcFilters),
      ]);
      setRows(list || []);
      setTotal(count || 0);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Nu am putut încărca jurnalul de modificări'));
    } finally {
      setLoading(false);
    }
  }, [ipcFilters]);

  useEffect(() => { void load(); }, [load]);

  const filteredByQuery = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.entity ?? '').toLowerCase().includes(q) ||
      (r.username ?? '').toLowerCase().includes(q) ||
      (r.action ?? '').toLowerCase().includes(q) ||
      (r.details ?? '').toLowerCase().includes(q) ||
      (r.diff_json ?? '').toLowerCase().includes(q),
    );
  }, [rows, filters.query]);

  const handleExport = async () => {
    try {
      const csv = await apiCommand<string>('audit_export_csv', ipcFilters);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Export eșuat'));
    }
  };

  return (
    <div className="space-y-4">
      {}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-content-primary">Jurnal modificări</h3>
          <p className="text-pm-xs text-content-muted mt-0.5">
            {loading ? 'Încarc…' : `${filteredByQuery.length} din ${total} înregistrări`}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3 h-8 text-sm rounded border border-line text-content-primary hover:bg-surface-tertiary transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div className="relative group">
          <Search className={filterSearchIconCls} />
          <input
            type="text"
            placeholder="Caută în rezultate…"
            value={filters.query}
            onChange={e => setFilters(f => ({ ...f, query: e.target.value }))}
            className={filterSearchInputCls + ' !w-full'}
          />
        </div>
        <select
          value={filters.entity}
          onChange={e => setFilters(f => ({ ...f, entity: e.target.value }))}
          className={filterSelectCls(filters.entity !== '')}
        >
          <option value="">Toate entitățile</option>
          <option value="user">User</option>
          <option value="project">Proiect</option>
          <option value="piece">Piesă</option>
          <option value="contract">Contract</option>
          <option value="client">Client</option>
          <option value="material">Material</option>
        </select>
        <select
          value={filters.action}
          onChange={e => setFilters(f => ({ ...f, action: e.target.value as Filters['action'] }))}
          className={filterSelectCls(filters.action !== '')}
        >
          <option value="">Toate acțiunile</option>
          <option value="create">Creare</option>
          <option value="update">Modificare</option>
          <option value="delete">Ștergere</option>
        </select>
        <input
          type="date"
          value={filters.since}
          onChange={e => setFilters(f => ({ ...f, since: e.target.value }))}
          className={filterDateInputCls}
          title="De la"
        />
        <input
          type="date"
          value={filters.until}
          onChange={e => setFilters(f => ({ ...f, until: e.target.value }))}
          className={filterDateInputCls}
          title="Până la"
        />
      </div>

      {}
      <div className="rounded border border-line overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-tertiary/40">
            <tr className="text-left text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Utilizator</th>
              <th className="px-3 py-2">Acțiune</th>
              <th className="px-3 py-2">Entitate</th>
              <th className="px-3 py-2 w-20">ID</th>
              <th className="px-3 py-2">Modificări</th>
            </tr>
          </thead>
          <tbody>
            {filteredByQuery.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-pm-xs text-content-muted">
                  Nicio înregistrare. Modificările la entități urmărite vor apărea aici.
                </td>
              </tr>
            )}
            {filteredByQuery.map(r => (
              <tr
                key={rowKey(r)}
                onClick={() => setSelected(r)}
                className="border-t border-line cursor-pointer hover:bg-surface-tertiary/50 transition-colors"
              >
                <td className="px-3 py-2 text-pm-xs text-content-muted font-mono tabular-nums whitespace-nowrap">
                  {formatDateTimeRo(r.created_at)}
                </td>
                <td className="px-3 py-2 text-content-primary">{r.username ?? `#${r.user_id ?? '—'}`}</td>
                <td className="px-3 py-2">
                  <ActionBadge action={r.action} />
                </td>
                <td className="px-3 py-2 text-content-secondary">{r.entity ?? '—'}</td>
                <td className="px-3 py-2 text-content-muted font-mono tabular-nums">{r.entity_id ?? '—'}</td>
                <td className="px-3 py-2 text-pm-xs text-content-muted truncate max-w-[20rem]">
                  {r.diff_json ? formatDiffPreview(r.diff_json) : (r.details || '—')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {}
      {selected && <AuditDetailModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const a = (action || '').toLowerCase();
  
  
  
  const map: Record<string, { tone: StatusTone; label: string }> = {
    create: { tone: 'success', label: 'creat' },
    update: { tone: 'info', label: 'modificat' },
    delete: { tone: 'danger', label: 'șters' },
  };
  const m = map[a];
  if (m) return <StatusBadge tone={m.tone} label={m.label} size="xs" uppercase />;
  if (a.includes('login') || a.includes('logout') || a.includes('auth'))
    return <StatusBadge tone="special" label={action} size="xs" uppercase />;
  return <StatusBadge tone="neutral" label={action || '—'} size="xs" uppercase />;
}

function formatDiffPreview(json: string): string {
  try {
    const diff = JSON.parse(json) as Record<string, [unknown, unknown]>;
    const fields = Object.keys(diff);
    if (fields.length === 0) return '—';
    return fields.slice(0, 3).join(', ') + (fields.length > 3 ? ` +${fields.length - 3}` : '');
  } catch {
    return json.slice(0, 80);
  }
}

function AuditDetailModal({ row, onClose }: { row: AuditRow; onClose: () => void }) {
  const diff = (() => {
    if (!row.diff_json) return null;
    try { return JSON.parse(row.diff_json) as Record<string, [unknown, unknown]>; }
    catch { return null; }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-w-2xl w-full mx-4 bg-surface-secondary border border-line rounded-lg shadow-soft-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <div className="flex items-center gap-3">
            <ActionBadge action={row.action} />
            <h3 className="text-sm font-semibold text-content-primary">
              {row.entity ?? '—'} <span className="text-content-muted font-normal">#{row.entity_id ?? '—'}</span>
            </h3>
          </div>
          <button onClick={onClose} aria-label="Închide" className="p-1 rounded hover:bg-surface-tertiary text-content-muted hover:text-content-primary">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
          <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
            <dt className="text-content-muted">Data</dt>
            <dd className="text-content-primary font-mono">{formatDateTimeRo(row.created_at)}</dd>
            <dt className="text-content-muted">Utilizator</dt>
            <dd className="text-content-primary">{row.username ?? `#${row.user_id ?? '—'}`}</dd>
            <dt className="text-content-muted">Acțiune</dt>
            <dd className="text-content-primary">{row.action}</dd>
            {row.ip_address && (<>
              <dt className="text-content-muted">IP</dt>
              <dd className="text-content-primary font-mono">{row.ip_address}</dd>
            </>)}
          </dl>

          {diff ? (
            <div>
              <h4 className="text-pm-xs uppercase tracking-wider text-content-muted mb-2">Modificări de câmpuri</h4>
              <table className="w-full text-pm-xs">
                <thead className="bg-surface-tertiary/40">
                  <tr className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">
                    <th className="text-left px-2 py-1">Câmp</th>
                    <th className="text-left px-2 py-1">Înainte</th>
                    <th className="text-left px-2 py-1">După</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(diff).map(([field, [before, after]]) => (
                    <tr key={field} className="border-t border-line">
                      <td className="px-2 py-1.5 font-mono text-content-muted">{field}</td>
                      <td className="px-2 py-1.5 text-status-red font-mono break-all">{stringify(before)}</td>
                      <td className="px-2 py-1.5 text-status-green font-mono break-all">{stringify(after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : row.details ? (
            <div>
              <h4 className="text-pm-xs uppercase tracking-wider text-content-muted mb-2">Detalii</h4>
              <pre className="text-pm-xs text-content-secondary whitespace-pre-wrap break-all bg-surface-tertiary/30 rounded p-2">{row.details}</pre>
            </div>
          ) : (
            <p className="text-pm-xs text-content-muted italic">Fără detalii înregistrate.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function stringify(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

