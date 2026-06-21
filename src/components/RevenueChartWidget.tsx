
import { useEffect, useState } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Label } from 'recharts';
import { apiCommand } from '@/api/commands';
import { useMoney } from '@/store/settingsStore';

interface CashFlowPoint { month: string; inflow?: number; amount?: number }
interface FinanceInsights {
  monthly_cash_flow: CashFlowPoint[];
}

function pickAmount(p: CashFlowPoint): number {
  return Number(p.inflow ?? p.amount ?? 0);
}

const MONTH_LABELS = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];

// Returns "YYYY-MM-DD" for the Monday of the week containing d.
// Matches the SQL: date(pr.date, '-' || CAST((strftime('%w', pr.date)+6)%7 AS INTEGER) || ' days')
function getMondayKey(d: Date): string {
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  mon.setHours(0, 0, 0, 0);
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
}

function formatWeekLabel(key: string): string {
  const d = new Date(key + 'T00:00:00');
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;
}

function formatCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

// 3-week centred rolling median (smoothing)
function rollingMedian(data: number[], window = 3): number[] {
  const half = Math.floor(window / 2);
  return data.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(data.length, i + half + 1);
    const slice = [...data.slice(start, end)].sort((a, b) => a - b);
    const mid = Math.floor(slice.length / 2);
    return slice.length % 2 === 0 ? (slice[mid - 1] + slice[mid]) / 2 : slice[mid];
  });
}

interface MKResult { tau: number; Z: number; label: string; pillClass: string }

// Non-parametric Mann-Kendall monotonic trend test (two-tailed)
function mannKendall(values: number[]): MKResult {
  const n = values.length;
  if (n < 4) return { tau: 0, Z: 0, label: '→ date insuficiente', pillClass: '' };

  let S = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      if (values[j] > values[i]) S++;
      else if (values[j] < values[i]) S--;
    }
  }

  const variance = (n * (n - 1) * (2 * n + 5)) / 18;
  const Z = S === 0 ? 0 : S > 0 ? (S - 1) / Math.sqrt(variance) : (S + 1) / Math.sqrt(variance);
  const tau = (2 * S) / (n * (n - 1));

  if (Math.abs(Z) >= 1.96)
    return tau > 0
      ? { tau, Z, label: '↑ Tendință crescătoare', pillClass: 'pill-success' }
      : { tau, Z, label: '↓ Tendință descrescătoare', pillClass: 'pill-danger' };

  if (Math.abs(Z) >= 1.28)
    return tau > 0
      ? { tau, Z, label: '↗ Ușor crescătoare', pillClass: 'pill-warn' }
      : { tau, Z, label: '↘ Ușor descrescătoare', pillClass: 'pill-warn' };

  return { tau, Z, label: '→ Stabilă', pillClass: '' };
}

export default function RevenueChartWidget() {
  const money = useMoney();
  const [data, setData] = useState<CashFlowPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiCommand<FinanceInsights>('get_finance_insights')
      .then(r => { if (!cancelled) setData(r.monthly_cash_flow ?? []); })
      .catch(err => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Eroare la încărcare';
        setError(/refuzat|forbidden|403/i.test(msg) ? 'Acces restricționat la datele financiare' : msg);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Build last 24 weeks anchored on this week's Monday
  const rawSeries = (() => {
    const map = new Map<string, number>();
    (data ?? []).forEach(p => map.set(p.month, pickAmount(p)));

    const now = new Date();
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    thisMonday.setHours(0, 0, 0, 0);

    const out: Array<{ weekKey: string; label: string; amount: number }> = [];
    for (let i = 23; i >= 0; i--) {
      const mon = new Date(thisMonday);
      mon.setDate(thisMonday.getDate() - i * 7);
      const weekKey = getMondayKey(mon);
      out.push({ weekKey, label: formatWeekLabel(weekKey), amount: map.get(weekKey) ?? 0 });
    }
    return out;
  })();

  // 3-week centred rolling median overlaid as a smoothing line
  const smoothed = rollingMedian(rawSeries.map(p => p.amount), 3);
  const series = rawSeries.map((p, i) => ({ ...p, medSmooth: smoothed[i] }));

  // Overall median — horizontal reference line
  const median = (() => {
    const xs = series.map(p => p.amount).filter(v => v > 0).sort((a, b) => a - b);
    if (xs.length === 0) return null;
    const mid = Math.floor(xs.length / 2);
    return xs.length % 2 === 0 ? (xs[mid - 1] + xs[mid]) / 2 : xs[mid];
  })();

  const total = series.reduce((s, p) => s + p.amount, 0);
  const mk = mannKendall(series.map(p => p.amount));

  return (
    <div className="bg-surface-secondary border-b border-line p-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <TrendingUp className="h-4 w-4 text-accent shrink-0" />
        <h3 className="text-sm font-semibold text-content-primary">Venituri săptămânale</h3>
        <span className="text-pm-2xs text-content-muted">· ultimele 24 săpt</span>
        <span
          className={`text-xs font-medium ${mk.pillClass ? `${mk.pillClass} px-1.5 py-0.5 rounded` : 'text-content-muted'}`}
          title={`Mann-Kendall τ=${mk.tau.toFixed(3)}, Z=${mk.Z.toFixed(2)}`}
        >
          {mk.label}
        </span>
        <span className="ml-auto flex items-center gap-3 text-xs tabular-nums">
          {median != null && (
            <span className="text-content-muted">Mediană: <span className="font-semibold text-content-secondary">{money(median, 'RON')}</span></span>
          )}
          <span className="font-semibold text-content-primary">Total: {money(total, 'RON')}</span>
        </span>
      </div>

      <div className="h-56 w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-content-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-pm-xs text-content-muted">
            {error}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
              <XAxis
                type="category"
                dataKey="label"
                allowDuplicatedCategory={false}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
                interval={3}
              />
              <YAxis
                type="number"
                tickFormatter={(v) => formatCompact(Number(v))}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
                width={48}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-accent)', fillOpacity: 0.06 }}
                contentStyle={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 0,
                  fontSize: 12,
                  color: 'var(--color-text-primary)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                }}
                labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--color-text-primary)' }}
                formatter={(value: number | string, name: string) => {
                  const v = money(Number(value), 'RON');
                  return name === 'medSmooth' ? [v, 'Med. glisantă'] : [v, 'Venit'];
                }}
              />
              <defs>
                <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <Bar
                dataKey="amount"
                name="Venit"
                fill="url(#revBar)"
                radius={[3, 3, 0, 0]}
                maxBarSize={22}
                isAnimationActive={false}
              />
              {/* 3-week rolling median — smoothing line (mediana glisantă) */}
              <Line
                type="monotone"
                dataKey="medSmooth"
                name="medSmooth"
                stroke="var(--status-amber)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: 'var(--status-amber)' }}
                isAnimationActive={false}
              />
              {median != null && (
                <ReferenceLine
                  y={median}
                  stroke="var(--color-text-secondary)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  ifOverflow="extendDomain"
                >
                  <Label
                    value={`Mediană ${money(median, 'RON')}`}
                    position="insideTopRight"
                    fill="var(--color-text-secondary)"
                    fontSize={11}
                    offset={6}
                  />
                </ReferenceLine>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
