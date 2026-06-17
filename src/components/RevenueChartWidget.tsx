





import { useEffect, useState } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Label } from 'recharts';
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

function formatMonth(ym: string): string {
  
  const [y, m] = ym.split('-');
  const idx = Math.max(0, Math.min(11, Number(m) - 1));
  return `${MONTH_LABELS[idx]} ${y.slice(2)}`;
}

function formatCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
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

  
  const baseSeries: Array<{ month: string; label: string; amount: number }> = (() => {
    const map = new Map<string, number>();
    (data ?? []).forEach(p => map.set(p.month, pickAmount(p)));
    const out: Array<{ month: string; label: string; amount: number }> = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({ month: ym, label: formatMonth(ym), amount: map.get(ym) ?? 0 });
    }
    return out;
  })();

  // Plot the ACTUAL monthly revenue (honest, discrete bars). The previous chart
  // drew a linear-regression "trend" as the hero line which sloped to ~0 at the
  // last month → it read as "revenue collapsing to zero" and contradicted the
  // positive Profit KPI. Bars say "this month earned X"; an empty month is just a
  // short bar, not a doom-line.
  const series = baseSeries;

  const total = series.reduce((s, p) => s + p.amount, 0);

  
  
  
  const median = (() => {
    const xs = series.map(p => p.amount).filter(v => v > 0).sort((a, b) => a - b);
    if (xs.length === 0) return null;
    const mid = Math.floor(xs.length / 2);
    return xs.length % 2 === 0 ? (xs[mid - 1] + xs[mid]) / 2 : xs[mid];
  })();

  return (
    <div className="bg-surface-secondary border-b border-line p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-content-primary">Venituri lunare</h3>
        <span className="text-pm-2xs text-content-muted">· ultimele 12 luni</span>
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
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
                interval={0}
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
                formatter={(value: number | string) => [money(Number(value), 'RON'), 'Venit']}
              />
              <defs>
                <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              {/* Honest monthly-revenue bars. Empty month = short bar, not a crash. */}
              <Bar
                dataKey="amount"
                name="Venit"
                fill="url(#revBar)"
                radius={[4, 4, 0, 0]}
                maxBarSize={34}
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
