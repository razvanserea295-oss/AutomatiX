





import { useMemo, useState } from 'react';
import {
  Layers, Filter, Activity, Archive, Settings2, AlertCircle, ChevronDown, ChevronUp,
} from '@/icons';
import { useLocalStorage, SectionCard, QuickFilterChips } from '@/components/enhancements';
import Button from '@/components/ui/Button';

interface BoardCard { id: number; stageId: number; createdAt?: string | null; assignee?: string | null; priority?: string | null; clientName?: string | null }
interface BoardStage { id: number; name: string }

interface Props {
  stages: BoardStage[];
  cards: BoardCard[];
  
  scope: string;
  
  currentFilter?: Record<string, unknown>;
  onApplyFilter?: (payload: Record<string, unknown>) => void;
}

interface KanbanSettings {
  wipLimits: Record<number, number>;
  swimlane: 'none' | 'priority' | 'client' | 'assignee';
  ageBuckets: number[];
  autoArchiveDays: number;
}

const DEFAULTS: KanbanSettings = {
  wipLimits: {},
  swimlane: 'none',
  ageBuckets: [3, 7, 14],
  autoArchiveDays: 30,
};

function ageDays(iso?: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.floor((Date.now() - t) / 86400_000);
}

export default function KanbanEnhancements({ stages, cards, scope, currentFilter, onApplyFilter }: Props) {
  const [settings, setSettings] = useLocalStorage<KanbanSettings>(`promix_kanban_${scope}_v1`, DEFAULTS);
  const [open, setOpen] = useState(false);

  const violations = useMemo(() => stages.map(s => {
    const limit = settings.wipLimits[s.id] ?? 0;
    const count = cards.filter(c => c.stageId === s.id).length;
    return { stage: s, limit, count, over: limit > 0 && count > limit };
  }), [stages, cards, settings.wipLimits]);

  const ageHistogram = useMemo(() => {
    const [a, b, c] = settings.ageBuckets;
    const buckets = { fresh: 0, aging: 0, stale: 0, ancient: 0 };
    cards.forEach(card => {
      const d = ageDays(card.createdAt);
      if (d < a) buckets.fresh++;
      else if (d < b) buckets.aging++;
      else if (d < c) buckets.stale++;
      else buckets.ancient++;
    });
    return buckets;
  }, [cards, settings.ageBuckets]);

  const swimlaneGroups = useMemo(() => {
    if (settings.swimlane === 'none') return [];
    const map = new Map<string, number>();
    cards.forEach(c => {
      const key = settings.swimlane === 'priority' ? (c.priority || '—')
        : settings.swimlane === 'client' ? (c.clientName || '—')
        : (c.assignee || '—');
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [cards, settings.swimlane]);

  const archiveCandidates = cards.filter(c => ageDays(c.createdAt) > settings.autoArchiveDays).length;

  const setLimit = (stageId: number, value: number) => {
    setSettings({ ...settings, wipLimits: { ...settings.wipLimits, [stageId]: value } });
  };

  return (
    <div className="mx-4 my-4 glass-surface rounded-xl overflow-hidden enter-up">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2.5 px-5 py-3.5 hover:bg-surface-tertiary/20 transition-colors"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="h-8 w-8 rounded-lg bg-accent/12 text-accent flex items-center justify-center shrink-0">
            <Settings2 className="h-4 w-4" />
          </span>
          <span className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-secondary">Setări kanban avansate</span>
          {violations.some(v => v.over) && (
            <span className="inline-flex items-center gap-1 text-pm-2xs text-status-red"><AlertCircle className="h-3 w-3" /> WIP depășit</span>
          )}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-content-muted shrink-0" /> : <ChevronDown className="h-4 w-4 text-content-muted shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-3 border-t border-line/40">
          {}
          <SectionCard title="WIP limits" icon={Layers} description="Limită de carduri per coloană (lean manufacturing)">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {violations.map(v => (
                <label key={v.stage.id} className={`flex items-center gap-2 rounded border px-2 py-1.5 ${v.over ? 'border-status-red/40 bg-status-red/5' : 'border-line/60'}`}>
                  <span className="text-pm-2xs uppercase tracking-wide text-content-muted truncate flex-1">{v.stage.name}</span>
                  <input
                    type="number" min={0}
                    className="w-12 bg-surface-primary border border-line rounded px-1 py-0.5 text-pm-2xs tabular-nums text-content-primary"
                    value={v.limit || ''}
                    onChange={(e) => setLimit(v.stage.id, Number(e.target.value))}
                  />
                  <span className={`text-pm-2xs tabular-nums ${v.over ? 'text-status-red' : 'text-content-muted'}`}>{v.count}</span>
                </label>
              ))}
            </div>
          </SectionCard>

          {}
          <SectionCard title="Swimlanes" icon={Filter} description="Grupare orizontală pentru analiză rapidă">
            <div className="flex items-center gap-2 mb-2">
              {(['none', 'priority', 'client', 'assignee'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => setSettings({ ...settings, swimlane: opt })}
                  className={`px-2.5 py-1 rounded text-pm-2xs ${settings.swimlane === opt ? 'bg-accent text-[var(--color-on-accent)]' : 'bg-surface-tertiary text-content-secondary hover:bg-line'}`}
                >
                  {opt === 'none' ? 'Niciuna' : opt === 'priority' ? 'Prioritate' : opt === 'client' ? 'Client' : 'Responsabil'}
                </button>
              ))}
            </div>
            {swimlaneGroups.length > 0 && (
              <ul className="text-pm-xs grid grid-cols-2 md:grid-cols-4 gap-2">
                {swimlaneGroups.map(([k, n]) => (
                  <li key={k} className="rounded border border-line/60 px-2 py-1 flex items-center justify-between">
                    <span className="truncate text-content-secondary">{k}</span>
                    <span className="tabular-nums text-content-primary">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {}
          <SectionCard title="Vârsta cardurilor" icon={Activity} description={`Praguri (zile): ${settings.ageBuckets.join(' / ')}`}>
            <div className="grid grid-cols-4 gap-2">
              {([
                { label: 'Recent',  value: ageHistogram.fresh,   color: 'text-status-green' },
                { label: 'Mediu',   value: ageHistogram.aging,   color: 'text-status-blue' },
                { label: 'Vechi',   value: ageHistogram.stale,   color: 'text-status-amber' },
                { label: 'Critic',  value: ageHistogram.ancient, color: 'text-status-red' },
              ] as const).map(b => (
                <div key={b.label} className="rounded border border-line/60 px-3 py-2 text-center">
                  <p className="text-pm-2xs uppercase tracking-wide text-content-muted">{b.label}</p>
                  <p className={`text-pm-md font-semibold tabular-nums ${b.color}`}>{b.value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {settings.ageBuckets.map((d, i) => (
                <input
                  key={i} type="number" min={1}
                  className="w-14 bg-surface-primary border border-line rounded px-2 py-0.5 text-pm-2xs tabular-nums"
                  value={d}
                  onChange={(e) => {
                    const next = [...settings.ageBuckets];
                    next[i] = Number(e.target.value);
                    setSettings({ ...settings, ageBuckets: next });
                  }}
                />
              ))}
              <span className="text-pm-2xs text-content-muted">zile</span>
            </div>
          </SectionCard>

          {}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SectionCard title="Auto-archive" icon={Archive} description="Cardurile mai vechi de N zile sunt ascunse">
              <div className="flex items-center gap-3">
                <input
                  type="number" min={1}
                  className="w-20 bg-surface-primary border border-line rounded px-2 py-1 text-pm-base tabular-nums"
                  value={settings.autoArchiveDays}
                  onChange={(e) => setSettings({ ...settings, autoArchiveDays: Number(e.target.value) })}
                />
                <span className="text-pm-2xs text-content-muted">zile</span>
                <span className="ml-auto text-pm-xs text-content-secondary">{archiveCandidates} carduri eligibile</span>
              </div>
            </SectionCard>

            <SectionCard title="Filtre salvate" icon={Filter}>
              {onApplyFilter ? (
                <QuickFilterChips storageKey={`kanban-${scope}`} current={currentFilter ?? {}} onApply={onApplyFilter} />
              ) : (
                <p className="text-pm-2xs text-content-muted">Filtre salvate vor fi disponibile odată ce host-ul expune un payload.</p>
              )}
            </SectionCard>
          </div>

          <p className="text-pm-2xs text-content-muted">
            Setările se păstrează local pentru utilizatorul curent — pentru a aplică WIP limits server-side, deschide o cerere către echipa platformei.
          </p>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setSettings(DEFAULTS)}>Resetează</Button>
          </div>
        </div>
      )}
    </div>
  );
}
