










import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ChevronLeft, ChevronRight, Globe, ShieldCheck, Search,
} from 'lucide-react';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { toast } from '@/store/toastStore';
import {
  Card, Tag, EmptyState, CenterSpinner, Segmented, initials, type Tone,
} from './kit';

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

function actionTone(action: string): Tone {
  const a = (action || '').toUpperCase();
  if (a === 'CREATE') return 'green';
  if (a === 'DELETE') return 'red';
  if (a === 'LOGIN_FAILED') return 'amber';
  if (a.startsWith('UPDATE')) return 'blue';
  if (a === 'PAYMENT') return 'purple';
  if (a === 'UPLOAD' || a === 'RECEIVE') return 'teal';
  return 'neutral';
}

const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Creare', DELETE: 'Ștergere', UPDATE: 'Modificare', LOGIN: 'Autentificare',
  LOGOUT: 'Deconectare', LOGIN_FAILED: 'Login eșuat', UPLOAD: 'Încărcare',
  DOWNLOAD: 'Descărcare', PAYMENT: 'Plată', RECEIVE: 'Recepție', EXPORT: 'Export',
};
const actionLabel = (a: string) => ACTION_LABEL[(a || '').toUpperCase()] || a;

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shiftDay(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function prettyDay(date: string): string {
  const d = new Date(date + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return date;
  const t = todayStr();
  if (date === t) return 'Azi';
  if (date === shiftDay(t, -1)) return 'Ieri';
  return d.toLocaleDateString('ro-RO', { weekday: 'short', day: '2-digit', month: 'short' });
}
const timeOf = (ts: string): string => (ts || '').split(' ')[1]?.slice(0, 5) || (ts || '').slice(11, 16) || ts;

export default function ActivityTab({ refreshKey }: { user: User; refreshKey: number }) {
  const [actors, setActors] = useState<ActivityActor[]>([]);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [userId, setUserId] = useState<'all' | number>('all');
  const [date, setDate] = useState<string>(todayStr());
  const [action, setAction] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    apiCommand<ActivityActor[]>('get_activity_actors')
      .then(a => setActors(Array.isArray(a) ? a : []))
      .catch(() => setActors([]));
  }, [refreshKey]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const args: Record<string, unknown> = { from: date, to: date, limit: 1000 };
      if (userId !== 'all') args.user_id = userId;
      if (action !== 'all') args.action = action;
      const data = await apiCommand<ActivityEntry[]>('get_user_activity_log', args);
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la încărcarea activității');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [date, userId, action]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const actionOptions = useMemo(() => {
    const set = new Set(entries.map(e => e.action));
    return ['all', ...[...set].sort()];
  }, [entries]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(e =>
      (e.full_name || e.username || '').toLowerCase().includes(needle)
      || e.entity_type?.toLowerCase().includes(needle)
      || e.action?.toLowerCase().includes(needle)
      || (e.details || '').toLowerCase().includes(needle));
  }, [entries, q]);

  const topActors = useMemo(
    () => [...actors].sort((a, b) => b.event_count - a.event_count).slice(0, 12),
    [actors],
  );

  return (
    <div className="pt-3">
      {}
      <div className="px-3.5">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-secondary surface-card p-2">
          <button
            type="button" onClick={() => setDate(d => shiftDay(d, -1))}
            className="grid place-items-center h-10 w-10 rounded-lg text-content-secondary active:bg-surface-tertiary"
            aria-label="Ziua anterioară"
          ><ChevronLeft className="h-5 w-5" /></button>
          <label className="flex-1 text-center cursor-pointer">
            <div className="text-pm-eyebrow uppercase text-content-muted">{prettyDay(date)}</div>
            <div className="relative">
              <input
                type="date" value={date} max={todayStr()}
                onChange={e => setDate(e.target.value || todayStr())}
                className="w-full bg-transparent text-center text-pm-lg font-semibold text-content-primary outline-none"
              />
            </div>
          </label>
          <button
            type="button" onClick={() => setDate(d => (d >= todayStr() ? d : shiftDay(d, 1)))}
            disabled={date >= todayStr()}
            className="grid place-items-center h-10 w-10 rounded-lg text-content-secondary active:bg-surface-tertiary disabled:opacity-30"
            aria-label="Ziua următoare"
          ><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>

      {}
      <div className="mt-3">
        <Segmented
          value={userId === 'all' ? 'all' : String(userId)}
          onChange={(v) => setUserId(v === 'all' ? 'all' : Number(v))}
          options={[
            { value: 'all', label: 'Toți', count: actors.reduce((s, a) => s + a.event_count, 0) },
            ...topActors.map(a => ({
              value: String(a.user_id),
              label: (a.full_name || a.username || `#${a.user_id}`).split(/\s+/)[0],
              count: a.event_count,
            })),
          ]}
        />
      </div>

      {}
      {actionOptions.length > 1 && (
        <div className="mt-2">
          <Segmented
            value={action}
            onChange={setAction}
            options={actionOptions.map(a => ({ value: a, label: a === 'all' ? 'Toate' : actionLabel(a) }))}
          />
        </div>
      )}

      {}
      <div className="px-3.5 mt-3">
        <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-line bg-surface-secondary">
          <Search className="h-4 w-4 text-content-muted shrink-0" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Caută în activitate…"
            className="flex-1 bg-transparent text-pm-lg text-content-primary placeholder:text-content-muted outline-none"
            autoCapitalize="none"
          />
        </div>
      </div>

      {}
      <div className="px-3.5 mt-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-accent" />
        <span className="text-pm-md font-semibold text-content-primary">{visible.length} acțiuni</span>
        <span className="text-pm-sm text-content-muted">· {prettyDay(date)}</span>
      </div>

      {}
      <div className="px-3.5 mt-2">
        {loading && entries.length === 0 ? (
          <CenterSpinner label="Se încarcă activitatea…" />
        ) : visible.length === 0 ? (
          <Card><EmptyState icon={ShieldCheck} title="Nicio activitate" hint="Schimbă ziua, utilizatorul sau filtrul." /></Card>
        ) : (
          <ul className="relative ml-1.5 border-l border-line space-y-2.5 py-1">
            {visible.map(e => {
              const tone = actionTone(e.action);
              return (
                <li key={e.id} className="relative pl-4">
                  <span className={`absolute -left-[5px] top-3 h-2.5 w-2.5 rounded-full ring-2 ring-surface-page ${DOT[tone]}`} />
                  <div className="rounded-xl border border-line bg-surface-secondary surface-card p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-pm-sm text-content-secondary tabular-nums">{timeOf(e.created_at)}</span>
                      <Tag tone={tone}>{actionLabel(e.action)}</Tag>
                      <span className="ml-auto text-pm-xs text-content-muted truncate">
                        {e.entity_type}{e.entity_id != null ? ` #${e.entity_id}` : ''}
                      </span>
                    </div>

                    {userId === 'all' && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="grid place-items-center h-5 w-5 rounded-full bg-accent text-surface-primary text-pm-2xs font-bold">
                          {initials(e.full_name || e.username)}
                        </span>
                        <span className="text-pm-sm text-content-primary truncate">{e.full_name || e.username || `User #${e.user_id}`}</span>
                        {e.role_name && <span className="text-pm-2xs text-content-muted">· {e.role_name}</span>}
                      </div>
                    )}

                    <Evidence details={e.details} />

                    {e.ip_address && (
                      <div className="mt-2 inline-flex items-center gap-1 font-mono text-pm-2xs text-content-muted">
                        <Globe className="h-3 w-3" />{e.ip_address}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="h-2" />
      </div>
    </div>
  );
}

const DOT: Record<Tone, string> = {
  green: 'bg-status-green', red: 'bg-status-red', amber: 'bg-status-amber',
  blue: 'bg-status-blue', teal: 'bg-status-teal', purple: 'bg-status-purple',
  neutral: 'bg-content-muted',
};

function Evidence({ details }: { details: string | null }) {
  if (!details) return null;
  let parsed: Record<string, unknown> | null = null;
  try { const p = JSON.parse(details); if (p && typeof p === 'object' && !Array.isArray(p)) parsed = p; } catch {  }
  if (!parsed) {
    return <p className="mt-2 text-pm-xs text-content-muted break-words">{details}</p>;
  }
  const items = Object.entries(parsed);
  if (items.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1 rounded-md bg-surface-tertiary px-1.5 py-0.5 text-pm-2xs">
          <span className="text-content-muted">{k}:</span>
          <span className="font-medium text-content-primary break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
        </span>
      ))}
    </div>
  );
}
