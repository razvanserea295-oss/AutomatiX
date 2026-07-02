import { TrendingUp } from '@/icons';

export type CompareWindow = 'none' | 'wow' | 'mom' | 'yoy';

interface Props {
  value: CompareWindow;
  onChange: (v: CompareWindow) => void;
}

const opts: Array<{ id: CompareWindow; label: string; help: string }> = [
  { id: 'none', label: 'Fără comparație', help: 'Doar valorile actuale' },
  { id: 'wow',  label: 'vs săpt. trecută', help: 'Week over week' },
  { id: 'mom',  label: 'vs luna trecută', help: 'Month over month' },
  { id: 'yoy',  label: 'vs anul trecut', help: 'Year over year' },
];

export default function ComparisonToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-line bg-surface-secondary px-2 h-8">
      <TrendingUp className="h-3.5 w-3.5 text-content-muted" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CompareWindow)}
        className="bg-transparent text-pm-xs text-content-secondary focus:outline-none"
        aria-label="Mod de comparație"
      >
        {opts.map(o => <option key={o.id} value={o.id} title={o.help}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function deltaPct(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function formatDelta(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}
