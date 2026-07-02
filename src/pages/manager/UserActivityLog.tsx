





import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw, Loader2, ShieldCheck, Globe, Calendar } from '@/icons';
import { apiCommand } from '@/api/commands';
import StatusBadge from '@/components/ui/StatusBadge';
import { filterSelectCls } from '@/components/ui/filterControls';
import type { StatusTone } from '@/lib/statusTokens';
import { toast } from '@/store/toastStore';

interface ActivityEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  full_name: string | null;
  role_name: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

interface ActivityActor {
  user_id: number;
  full_name: string | null;
  username: string | null;
  role_name: string | null;
  event_count: number;
  last_active: string | null;
}


function actionTone(action: string): StatusTone {
  const a = action.toUpperCase();
  if (a === 'CREATE') return 'success';
  if (a === 'DELETE') return 'danger';
  if (a === 'LOGIN_FAILED') return 'warning';
  if (a.startsWith('UPDATE')) return 'info';
  if (a === 'PAYMENT') return 'special';
  if (a === 'UPLOAD' || a === 'RECEIVE') return 'accent';
  if (a === 'LOGIN' || a === 'LOGOUT') return 'neutral';
  return 'neutral';
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr(): string {
  return ymd(new Date());
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return ymd(d);
}


const PERIODS = [
  { key: '7d',  label: 'Ultimele 7 zile',  days: 7 },
  { key: '30d', label: 'Ultimele 30 zile', days: 30 },
  { key: '6m',  label: 'Ultimele 6 luni',  days: 182 },
  { key: '1y',  label: 'Ultimul an',       days: 365 },
] as const;


const timeOf = (ts: string): string => (ts || '').split(' ')[1] || ts;

const dayOf = (ts: string): string => (ts || '').split(' ')[0] || ts;


function formatDayRo(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}


function Evidence({ details }: { details: string | null }) {
  if (!details) return null;
  let parsed: Record<string, unknown> | null = null;
  try { const p = JSON.parse(details); if (p && typeof p === 'object' && !Array.isArray(p)) parsed = p; } catch {  }
  if (!parsed) {
    return <span className="text-pm-2xs text-content-muted break-all">{details}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(parsed).map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1 rounded bg-surface-tertiary px-1.5 py-0.5 text-pm-2xs">
          <span className="text-content-muted">{k}:</span>
          <span className="font-medium text-content-primary break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
        </span>
      ))}
    </div>
  );
}

export default function UserActivityLog() {
  const [actors, setActors] = useState<ActivityActor[]>([]);
  const [userId, setUserId] = useState<'all' | number>('all');
  const [periodKey, setPeriodKey] = useState<string>('30d');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const period = PERIODS.find(p => p.key === periodKey) ?? PERIODS[1];

  useEffect(() => {
    apiCommand<ActivityActor[]>('get_activity_actors')
      .then((a) => setActors(Array.isArray(a) ? a : []))
      .catch(() => setActors([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const args: Record<string, unknown> = { from: daysAgoStr(period.days), to: todayStr(), limit: 1000 };
      if (userId !== 'all') args.user_id = userId;
      if (actionFilter !== 'all') args.action = actionFilter;
      const data = await apiCommand<ActivityEntry[]>('get_user_activity_log', args);
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la încărcarea activității');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [period.days, userId, actionFilter]);

  useEffect(() => { void load(); }, [load]);

  
  const summary = useMemo(() => {
    const byAction = new Map<string, number>();
    for (const e of entries) byAction.set(e.action, (byAction.get(e.action) || 0) + 1);
    return { total: entries.length, byAction: [...byAction.entries()].sort((a, b) => b[1] - a[1]) };
  }, [entries]);

  
  
  const byDay = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    for (const e of entries) {
      const day = dayOf(e.created_at);
      const arr = map.get(day);
      if (arr) arr.push(e); else map.set(day, [e]);
    }
    return [...map.entries()];
  }, [entries]);

  const selectedActor = userId === 'all' ? null : actors.find((a) => a.user_id === userId) ?? null;

  const allActions = useMemo(
    () => [...new Set(actors.length ? entries.map((e) => e.action) : entries.map((e) => e.action))].sort(),
    [entries, actors.length],
  );

  return (
    <div className="px-5 py-4 space-y-4">
      {}
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-line bg-surface-secondary px-4 py-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="act-user" className="text-pm-2xs uppercase tracking-wide text-content-muted">Utilizator</label>
          <select
            id="act-user"
            value={userId === 'all' ? 'all' : String(userId)}
            onChange={(e) => setUserId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className={`${filterSelectCls(userId !== 'all')} min-w-[200px]`}
          >
            <option value="all">Toți utilizatorii</option>
            {actors.map((a) => (
              <option key={a.user_id} value={a.user_id}>
                {(a.full_name || a.username || `User #${a.user_id}`)}{a.role_name ? ` · ${a.role_name}` : ''} ({a.event_count})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="act-period" className="text-pm-2xs uppercase tracking-wide text-content-muted">Perioadă</label>
          <select
            id="act-period"
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
            className={`${filterSelectCls(false)} min-w-[160px]`}
          >
            {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="act-action" className="text-pm-2xs uppercase tracking-wide text-content-muted">Acțiune</label>
          <select
            id="act-action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className={filterSelectCls(actionFilter !== 'all')}
          >
            <option value="all">Toate acțiunile</option>
            {allActions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <button
          onClick={() => void load()}
          className="h-8 px-3 rounded-md border border-line bg-surface-primary text-pm-xs text-content-secondary hover:bg-surface-tertiary inline-flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="h-3 w-3" /> Reîmprospătează
        </button>
      </div>

      {}
      <div className="flex flex-wrap items-center gap-2 text-pm-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold text-content-primary">
          <Activity className="h-4 w-4 text-accent" />
          {selectedActor ? `${selectedActor.full_name || selectedActor.username || `User #${selectedActor.user_id}`} · ` : ''}
          {summary.total} acțiuni · {period.label.toLowerCase()}
        </span>
        {summary.byAction.map(([action, count]) => (
          <StatusBadge key={action} tone={actionTone(action)} label={`${action} ${count}`} size="sm" />
        ))}
      </div>

      {}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-content-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-content-muted border border-dashed border-line rounded-md">
          <ShieldCheck className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-pm-sm">Nicio activitate în perioada selectată</p>
          <p className="text-pm-2xs mt-1">Schimbă utilizatorul sau perioada</p>
        </div>
      ) : (
        <div className="space-y-5">
          {entries.length >= 1000 && (
            <p className="text-pm-2xs text-status-amber">
              Se afișează cele mai recente 1000 de evenimente. Restrânge perioada sau alege un utilizator pentru detalii complete.
            </p>
          )}
          {byDay.map(([day, dayEntries]) => (
            <div key={day}>
              {}
              <div className="sticky top-0 z-10 -mx-1 mb-2 flex items-center gap-2 bg-surface-primary/95 px-1 py-1 backdrop-blur">
                <Calendar className="h-3.5 w-3.5 text-accent shrink-0" />
                <h3 className="text-pm-sm font-semibold text-content-primary capitalize">{formatDayRo(day)}</h3>
                <span className="text-pm-2xs text-content-muted">· {dayEntries.length} {dayEntries.length === 1 ? 'acțiune' : 'acțiuni'}</span>
              </div>
              {}
              <div className="ml-1.5 space-y-2 border-l-2 border-line pl-4">
                {dayEntries.map((e) => (
                  <div key={e.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface-primary" aria-hidden />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono text-pm-2xs text-content-muted whitespace-nowrap">{timeOf(e.created_at)}</span>
                      <StatusBadge tone={actionTone(e.action)} label={e.action} size="xs" />
                      <span className="text-pm-xs text-content-secondary whitespace-nowrap">
                        {e.entity_type}{e.entity_id != null ? <span className="text-content-muted"> #{e.entity_id}</span> : null}
                      </span>
                      {userId === 'all' && (
                        <span className="text-pm-2xs text-content-muted">· {e.full_name || e.username || `User #${e.user_id}`}{e.role_name ? ` (${e.role_name})` : ''}</span>
                      )}
                      {e.ip_address && (
                        <span className="inline-flex items-center gap-1 font-mono text-pm-2xs text-content-muted"><Globe className="h-3 w-3" />{e.ip_address}</span>
                      )}
                    </div>
                    {e.details && <div className="mt-1"><Evidence details={e.details} /></div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
