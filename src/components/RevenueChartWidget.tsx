import { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Loader2 } from '@/icons';
import { apiCommand } from '@/api/commands';
import { useMoney } from '@/store/settingsStore';
import MetricValue from '@/redesign/ui/MetricValue';
import TrendBadge from '@/redesign/ui/TrendBadge';

type Period = 'week' | 'month' | 'quarter' | 'year';

interface CashFlowPoint { month: string; inflow?: number; amount?: number }
interface FinanceInsights { monthly_cash_flow: CashFlowPoint[] }
// Only the bits of a quotation we need for the "money on offers" series.
interface QuotationLite { total?: number; created_at?: string | null }

interface Point { date: Date; amount: number }

const MONTH_LABELS = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];

const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'Săpt.' },
  { id: 'month', label: 'Lună' },
  { id: 'quarter', label: 'Trim.' },
  { id: 'year', label: 'An' },
];

// How many trailing buckets to show per granularity.
const KEEP: Record<Period, number> = { week: 16, month: 12, quarter: 8, year: 5 };
const NOUN: Record<Period, [string, string]> = {
  week: ['săptămână', 'săptămâni'], month: ['lună', 'luni'], quarter: ['trimestru', 'trimestre'], year: ['an', 'ani'],
};

const C_REVENUE = 'var(--color-accent)';
const C_OFFERS = 'var(--status-amber)';

function formatCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(Math.round(v));
}

interface Bucket { key: string; label: string; sort: number; revenue: number; offers: number; total: number }

function bucketMeta(d: Date, period: Period): { key: string; label: string; sort: number } {
  const y = d.getFullYear();
  if (period === 'week') {
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    mon.setHours(0, 0, 0, 0);
    return { key: `w${mon.getTime()}`, label: `${mon.getDate()} ${MONTH_LABELS[mon.getMonth()]}`, sort: mon.getTime() };
  }
  if (period === 'year') return { key: `y${y}`, label: String(y), sort: y };
  if (period === 'quarter') {
    const q = Math.floor(d.getMonth() / 3) + 1;
    return { key: `${y}q${q}`, label: `T${q} ${y}`, sort: y * 10 + q };
  }
  const m = d.getMonth();
  return { key: `${y}m${m}`, label: `${MONTH_LABELS[m]} ${y}`, sort: y * 100 + m };
}

// Roll realized revenue + offer money into the same period buckets so they can
// be stacked (total height = revenue including offers).
function buildBuckets(revenue: Point[], offers: Point[], period: Period): Bucket[] {
  const map = new Map<string, Bucket>();
  const at = (d: Date, rev: number, off: number) => {
    if (Number.isNaN(d.getTime())) return;
    const meta = bucketMeta(d, period);
    let b = map.get(meta.key);
    if (!b) { b = { key: meta.key, label: meta.label, sort: meta.sort, revenue: 0, offers: 0, total: 0 }; map.set(meta.key, b); }
    b.revenue += rev; b.offers += off;
  };
  revenue.forEach(p => at(p.date, p.amount, 0));
  offers.forEach(p => at(p.date, 0, p.amount));
  return [...map.values()]
    .map(b => ({ ...b, total: b.revenue + b.offers }))
    .sort((a, b) => a.sort - b.sort)
    .slice(-KEEP[period]);
}

export default function RevenueChartWidget() {
  const money = useMoney();
  const [revenue, setRevenue] = useState<Point[]>([]);
  const [offers, setOffers] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiCommand<FinanceInsights>('get_finance_insights'),
      // Offers are best-effort: a finance-only user may lack sales access, in
      // which case we just show realized revenue without the offers layer.
      apiCommand<QuotationLite[]>('list_quotations').catch(() => [] as QuotationLite[]),
    ])
      .then(([ins, quotes]) => {
        if (cancelled) return;
        setRevenue((ins.monthly_cash_flow ?? []).map(p => ({
          date: new Date(`${p.month}T00:00:00`),
          amount: Number(p.inflow ?? p.amount ?? 0),
        })));
        setOffers((Array.isArray(quotes) ? quotes : [])
          .filter(q => q && q.created_at)
          .map(q => ({
            date: new Date(String(q.created_at).replace(' ', 'T')),
            amount: Number(q.total ?? 0),
          })));
      })
      .catch(err => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Eroare la încărcare';
        setError(/refuzat|forbidden|403/i.test(msg) ? 'Acces restricționat la datele financiare' : msg);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const buckets = useMemo(() => buildBuckets(revenue, offers, period), [revenue, offers, period]);
  const current = buckets[buckets.length - 1];
  const prior = buckets[buckets.length - 2];
  const curTotal = current?.total ?? 0;
  const deltaPct = prior && prior.total > 0 ? ((curTotal - prior.total) / prior.total) * 100 : null;
  const windowTotal = buckets.reduce((s, b) => s + b.total, 0);
  const hasOffers = useMemo(() => offers.some(o => o.amount > 0), [offers]);

  return (
    <div className="flex min-h-0 flex-col gap-3 lg:min-h-0 lg:flex-1 lg:gap-4">
      {/* Hero figure + period toggle */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">
            {hasOffers ? 'Venit + oferte' : 'Venit'} · {current?.label ?? '—'}
          </p>
          <div className="mt-1">
            <MetricValue value={curTotal} format={(v) => money(v, 'RON')} size="display" />
          </div>
          {hasOffers && current && (
            <p className="mt-1 text-pm-xs text-content-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: C_REVENUE }} />
                Venit <span className="font-semibold text-content-secondary tabular-nums">{money(current.revenue, 'RON')}</span>
              </span>
              <span className="mx-2 text-line">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: C_OFFERS }} />
                Oferte <span className="font-semibold text-content-secondary tabular-nums">{money(current.offers, 'RON')}</span>
              </span>
            </p>
          )}
          <div className="mt-1.5 min-h-[1.25rem]">
            {deltaPct != null
              ? <TrendBadge value={deltaPct} pill suffix={`vs ${prior?.label ?? 'anterior'}`} />
              : <span className="text-pm-xs text-content-muted">Fără perioadă de comparație</span>}
          </div>
        </div>

        <div className="shrink-0 inline-flex items-center rounded-xl border border-line bg-surface-secondary p-0.5">
          {PERIODS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              aria-pressed={period === p.id}
              className={`rounded-lg px-2.5 py-1 text-pm-2xs font-semibold transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                period === p.id
                  ? 'bg-accent text-[var(--color-on-accent)] shadow-[var(--elevation-1)]'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stacked trend chart: revenue + offers */}
      <div className="h-44 w-full lg:min-h-[7rem] lg:flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-content-muted"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : error ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-pm-xs text-content-muted">{error}</div>
        ) : buckets.length === 0 ? (
          <div className="flex h-full items-center justify-center text-pm-xs text-content-muted">Fără date de afișat.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C_REVENUE} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={C_REVENUE} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="offArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C_OFFERS} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={C_OFFERS} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tickFormatter={(v) => formatCompact(Number(v))}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ stroke: C_REVENUE, strokeOpacity: 0.3 }}
                contentStyle={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--color-text-primary)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                }}
                labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--color-text-primary)' }}
                formatter={(value: number | string, name: string) => [money(Number(value), 'RON'), name]}
              />
              <Area
                type="monotone" dataKey="revenue" name="Venit" stackId="1"
                stroke={C_REVENUE} strokeWidth={2} fill="url(#revArea)"
                dot={false} activeDot={{ r: 3, fill: C_REVENUE }}
                isAnimationActive animationDuration={850} animationEasing="ease-out"
              />
              <Area
                type="monotone" dataKey="offers" name="Oferte" stackId="1"
                stroke={C_OFFERS} strokeWidth={2} fill="url(#offArea)"
                dot={false} activeDot={{ r: 3, fill: C_OFFERS }}
                isAnimationActive animationDuration={850} animationBegin={150} animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer — combined total across the visible window */}
      {buckets.length > 0 && !loading && !error && (
        <div className="flex items-center justify-between border-t border-line pt-2 text-pm-2xs text-content-muted">
          <span>Total {buckets.length} {NOUN[period][buckets.length === 1 ? 0 : 1]}</span>
          <span className="font-semibold tabular-nums text-content-secondary">{money(windowTotal, 'RON')}</span>
        </div>
      )}
    </div>
  );
}
