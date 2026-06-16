







import { useMemo } from 'react';
import { AlertOctagon, Check } from 'lucide-react';
import { useLocalStorage, SectionCard } from '@/components/enhancements';
import { formatDateRo } from '@/lib/format';

interface EventLite { id: string | number; title: string; start: string; end?: string; type?: string }
interface Props { events: EventLite[] }


function conflictKey(a: EventLite, b: EventLite): string {
  const ids = [String(a.id), String(b.id)].sort();
  return `${ids[0]}|${ids[1]}`;
}

function ConflictDetectorCard({ events }: Props) {
  
  const [dismissed, setDismissed] = useLocalStorage<string[]>('promix_calendar_conflicts_dismissed_v1', []);
  const dismissedSet = useMemo(() => new Set(dismissed), [dismissed]);

  const conflicts = useMemo(() => {
    const out: Array<{ key: string; a: EventLite; b: EventLite }> = [];
    const toRange = (ev: EventLite) => {
      const s = new Date(ev.start).getTime();
      const eRaw = ev.end ? new Date(ev.end).getTime() : s;
      
      const e = eRaw <= s ? s + 24 * 3600 * 1000 : eRaw + 24 * 3600 * 1000;
      return { s, e };
    };
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i]; const b = events[j];
        const ra = toRange(a); const rb = toRange(b);
        if (ra.s < rb.e && rb.s < ra.e) {
          out.push({ key: conflictKey(a, b), a, b });
        }
      }
    }
    return out;
  }, [events]);

  const visible = conflicts.filter(c => !dismissedSet.has(c.key)).slice(0, 20);
  const dismissedCount = conflicts.length - visible.length;

  const toggleDismiss = (key: string) => {
    setDismissed(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  return (
    <SectionCard
      title="Detectare conflicte"
      icon={AlertOctagon}
      description={
        visible.length === 0
          ? (conflicts.length === 0
              ? 'Fără suprapuneri'
              : `${conflicts.length} suprapuneri marcate ca acceptate`)
          : `${visible.length} suprapuneri active${dismissedCount ? ` (+${dismissedCount} marcate)` : ''}`
      }
      actions={dismissedCount > 0 ? (
        <button
          type="button"
          onClick={() => setDismissed([])}
          className="text-pm-2xs text-accent hover:underline"
        >
          resetează acceptate
        </button>
      ) : undefined}
    >
      {visible.length > 0 && (
        <ul className="text-pm-xs space-y-1.5 max-h-60 overflow-y-auto">
          {visible.map(c => (
            <li key={c.key}
              className="rounded border border-status-red/30 bg-status-red/5 px-2 py-1.5 flex items-start gap-2">
              <button
                type="button"
                onClick={() => toggleDismiss(c.key)}
                title="Marchează ca acceptat (nu mai apare aici)"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border border-line bg-surface-primary hover:bg-status-green/20 hover:border-status-green flex items-center justify-center"
              >
                <Check className="h-3 w-3 opacity-0 hover:opacity-100" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-content-primary truncate font-medium">{c.a.title}</p>
                <p className="text-pm-2xs text-content-muted truncate">se suprapune cu: {c.b.title}</p>
                <p className="text-pm-2xs text-content-muted">
                  {formatDateRo(c.a.start)} ⟷ {formatDateRo(c.b.start)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export default function CalendarEnhancements({ events }: Props) {
  return (
    <div className="px-4 py-3">
      <ConflictDetectorCard events={events} />
    </div>
  );
}
