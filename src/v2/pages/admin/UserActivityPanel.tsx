import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { formatDateTimeRo } from '@/lib/format';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Card } from '@/v2/components/ui/card';

interface ActivityEntry {
  id: number;
  username: string | null;
  full_name: string | null;
  action: string;
  entity_type: string;
  details: string | null;
  created_at: string;
}

interface ActivityActor {
  user_id: number;
  full_name: string | null;
  username: string | null;
  event_count: number;
}

const PERIODS = [
  { key: '7d', label: '7 zile', days: 7 },
  { key: '30d', label: '30 zile', days: 30 },
  { key: '6m', label: '6 luni', days: 182 },
] as const;

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function UserActivityPanel() {
  const [actors, setActors] = useState<ActivityActor[]>([]);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<'all' | number>('all');
  const [periodKey, setPeriodKey] = useState<string>('30d');

  const period = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[1];

  useEffect(() => {
    apiCommand<ActivityActor[]>('get_activity_actors')
      .then((a) => setActors(Array.isArray(a) ? a : []))
      .catch(() => setActors([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const args: Record<string, unknown> = {
        from: daysAgo(period.days),
        to: today(),
        limit: 500,
      };
      if (userId !== 'all') args.user_id = userId;
      const data = await apiCommand<ActivityEntry[]>('get_user_activity_log', args);
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [period.days, userId]);

  useEffect(() => { void load(); }, [load]);

  const summary = useMemo(() => {
    const byAction: Record<string, number> = {};
    for (const e of entries) byAction[e.action] = (byAction[e.action] || 0) + 1;
    return Object.entries(byAction).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [entries]);

  return (
    <div className="space-y-[var(--density-gap-section)]">
      <div className="density-toolbar flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-md border px-3 text-sm"
          value={String(userId)}
          onChange={(e) => setUserId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value="all">Toți utilizatorii</option>
          {actors.map((a) => (
            <option key={a.user_id} value={a.user_id}>
              {a.full_name || a.username} ({a.event_count})
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border px-3 text-sm"
          value={periodKey}
          onChange={(e) => setPeriodKey(e.target.value)}
        >
          {PERIODS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {summary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.map(([action, count]) => (
            <span key={action} className="rounded-md border px-2 py-1 text-xs">
              <StatusBadge status={action.toLowerCase()} /> <span className="ml-1 tabular-nums">{count}</span>
            </span>
          ))}
        </div>
      )}

      <AsyncContent loading={loading} error={null} empty={entries.length === 0}>
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id} className="shadow-none">
              <div className="density-list-item text-[length:var(--density-fs-body)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={e.action.toLowerCase()} />
                    <span className="font-medium">{e.full_name || e.username || '—'}</span>
                    <span className="text-muted-foreground">{e.entity_type}</span>
                  </div>
                  <span className="density-meta text-muted-foreground">{formatDateTimeRo(e.created_at)}</span>
                </div>
                {e.details && (
                  <p className="density-meta mt-1 break-all text-muted-foreground">{e.details}</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </AsyncContent>
    </div>
  );
}
