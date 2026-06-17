

















import { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { FolderKanban, Factory, Warehouse, Loader2, Sparkles, TrendingUp, Bell, Activity, RefreshCw, Wallet, Receipt, Pencil, Check, Minus, Plus, RotateCcw, MoveHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { User } from '@/core/types';
import { parseDashboardConfig } from '@/core/types';
import { normalizeRole, canAccessPage } from '@/lib/access';
import type { AppPage } from '@/lib/access';
import { aiChat, aiHealth } from '@/api/ai';
import { formatNumber, formatDateRo } from '@/lib/format';
import { useProjectStore } from '@/store/projectStore';
import { useMaterialStore } from '@/store/materialStore';
import { useAlertStore } from '@/store/alertStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useHandoffStore } from '@/store/handoffStore';
import InboxWidget from '@/components/InboxWidget';
import DailyBriefingWidget from '@/components/DailyBriefingWidget';



const RevenueChartWidget = lazy(() => import('@/components/RevenueChartWidget'));
import { filterToggleCls, filterDateInputCls } from '@/components/ui/filterControls';
import { projectStatus } from '@/lib/statusTokens';
import DashboardBackground from '@/components/DashboardBackground';
import { useCountUp } from '@/hooks/useCountUp';
import '@/styles/dashboard.css';

import Page from '@/redesign/ui/Page';
import Card from '@/redesign/ui/Card';
import KpiCard from '@/redesign/ui/KpiCard';
import Button from '@/redesign/ui/Button';
import StatusBadge from '@/redesign/ui/StatusBadge';
import SectionHeader from '@/redesign/ui/SectionHeader';
import EmptyState from '@/redesign/ui/EmptyState';
import { vtName } from '@/redesign/lib/viewTransition';


type IconCmp = React.ComponentType<{ className?: string }>;





interface DashboardPageProps { user: User | null; onNavigate: (page: string, opts?: Record<string, unknown>) => void; }
interface DData {
  total_projects: number; active_projects: number; in_production: number;
  total_materials: number; low_stock_count: number; pending_alerts: number;
  total_documents: number; revenue: number; costs: number; profit: number;
}





type RangePreset = 'month' | '6m' | 'year' | 'custom' | 'all';

interface TimeRange { from: string | null; to: string | null; preset: RangePreset }

function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }


const fmtCount = (n: number): string => formatNumber(Math.round(n));

// Sentence-case a data-derived label (DB stage/status strings arrive lowercase:
// "în producție", "ofertă"…). Keeps card lists on ONE casing rule instead of
// mixing lowercase data with capitalized labels on the same screen.
const sentenceCase = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function presetRange(preset: RangePreset): { from: string | null; to: string | null } {
  if (preset === 'all') return { from: null, to: null };
  const now = new Date();
  const to = isoDate(now);
  const start = new Date(now);
  if (preset === 'month')  start.setMonth(start.getMonth() - 1);
  if (preset === '6m')     start.setMonth(start.getMonth() - 6);
  if (preset === 'year')   start.setFullYear(start.getFullYear() - 1);
  return { from: isoDate(start), to };
}




// ── iOS-style editable widget grid: model + persistence ─────────────────────
type WId = 'revenue_chart' | 'production_stages' | 'activity' | 'active_projects'
  | 'alerts_panel' | 'ai_summary' | 'briefing' | 'inbox' | 'critical_stock';

const DEFAULT_WIDGET_ORDER: WId[] = [
  'revenue_chart', 'production_stages', 'activity', 'active_projects',
  'alerts_panel', 'ai_summary', 'briefing', 'inbox', 'critical_stock',
];
// 2 = full-width tile, 1 = half (the iOS "large/small widget" idea, kept simple
// so a 2-column grid tiles without masonry gaps).
const WIDGET_SPAN: Record<WId, 1 | 2> = {
  revenue_chart: 2, production_stages: 1, activity: 1, active_projects: 2,
  alerts_panel: 1, ai_summary: 1, briefing: 1, inbox: 1, critical_stock: 1,
};

interface DashLayout { order: WId[]; hidden: WId[]; sizes: Record<WId, 1 | 2> }

const defaultSizes = (): Record<WId, 1 | 2> => ({ ...WIDGET_SPAN });

function loadLayout(key: string): DashLayout {
  try {
    const raw = localStorage.getItem(`promix_dash_layout_v1_${key}`);
    if (raw) {
      const p = JSON.parse(raw) as Partial<DashLayout>;
      const order = (Array.isArray(p.order) ? p.order : []).filter((x): x is WId => DEFAULT_WIDGET_ORDER.includes(x as WId));
      for (const id of DEFAULT_WIDGET_ORDER) if (!order.includes(id)) order.push(id); // append new widgets
      const hidden = (Array.isArray(p.hidden) ? p.hidden : []).filter((x): x is WId => DEFAULT_WIDGET_ORDER.includes(x as WId));
      const sizes = defaultSizes();
      if (p.sizes && typeof p.sizes === 'object') {
        for (const id of DEFAULT_WIDGET_ORDER) {
          const s = (p.sizes as Record<string, unknown>)[id];
          if (s === 1 || s === 2) sizes[id] = s;
        }
      }
      return { order, hidden, sizes };
    }
  } catch { /* ignore corrupt layout */ }
  return { order: [...DEFAULT_WIDGET_ORDER], hidden: [], sizes: defaultSizes() };
}

// A personal home-screen arrangement → localStorage per user, not the DB. The
// admin `dashboard_config` flags still decide what is AVAILABLE to arrange.
function useWidgetLayout(key: string) {
  const [layout, setLayout] = useState<DashLayout>(() => loadLayout(key));
  useEffect(() => { try { localStorage.setItem(`promix_dash_layout_v1_${key}`, JSON.stringify(layout)); } catch { /* ignore */ } }, [key, layout]);
  const setOrder = useCallback((order: WId[]) => setLayout(l => ({ ...l, order })), []);
  const setSize = useCallback((id: WId, size: 1 | 2) => setLayout(l => (l.sizes[id] === size ? l : { ...l, sizes: { ...l.sizes, [id]: size } })), []);
  const hide = useCallback((id: WId) => setLayout(l => (l.hidden.includes(id) ? l : { ...l, hidden: [...l.hidden, id] })), []);
  const show = useCallback((id: WId) => setLayout(l => ({ ...l, hidden: l.hidden.filter(x => x !== id) })), []);
  const reset = useCallback(() => setLayout({ order: [...DEFAULT_WIDGET_ORDER], hidden: [], sizes: defaultSizes() }), []);
  return { layout, setOrder, setSize, hide, show, reset };
}

// Edit-mode widget shell. Explicit, discoverable controls (move ◄ ►, resize ⤢,
// remove −) so it's obvious widgets are editable — PLUS drag-to-reorder for the
// iOS feel. The buttons guarantee it works even where native drag is finicky.
function WidgetTile({ span, editMode, dragging, canLeft, canRight, onRemove, onResize, onMoveLeft, onMoveRight, onDragStart, onDragEnter, onDragEnd, children }: {
  span: 1 | 2; editMode: boolean; dragging: boolean; canLeft: boolean; canRight: boolean;
  onRemove: () => void; onResize: (size: 1 | 2) => void; onMoveLeft: () => void; onMoveRight: () => void;
  onDragStart: () => void; onDragEnter: () => void; onDragEnd: () => void;
  children: React.ReactNode;
}) {
  const ctrlBtn = 'h-6 w-6 rounded-full flex items-center justify-center text-content-secondary hover:text-accent disabled:opacity-30 disabled:hover:text-content-secondary transition-colors';
  return (
    <div
      className={cn('relative min-w-0 flex', span === 2 && 'lg:col-span-2', editMode && 'widget-jiggle', dragging && 'opacity-40 z-30')}
      draggable={editMode}
      onDragStart={editMode ? onDragStart : undefined}
      onDragEnter={editMode ? onDragEnter : undefined}
      onDragEnd={editMode ? onDragEnd : undefined}
      onDragOver={editMode ? (e) => e.preventDefault() : undefined}
    >
      {editMode && (
        <>
          {/* remove */}
          <button type="button" onClick={onRemove} onDragStart={(e) => e.preventDefault()} aria-label="Elimină widget"
            className="absolute -left-2 -top-2 z-20 h-6 w-6 rounded-full bg-status-red text-white shadow-md flex items-center justify-center hover:scale-110 transition-transform">
            <Minus className="h-4 w-4" strokeWidth={3} />
          </button>
          {/* move + resize toolbar */}
          <div className="absolute -top-3 right-3 z-20 flex items-center gap-0.5 rounded-full bg-surface-elevated border border-line px-1 py-0.5 shadow-md" onDragStart={(e) => e.preventDefault()}>
            <button type="button" className={ctrlBtn} onClick={onMoveLeft} disabled={!canLeft} aria-label="Mută înainte" title="Mută înainte"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" className={ctrlBtn} onClick={() => onResize(span === 2 ? 1 : 2)} aria-label="Schimbă dimensiunea" title={span === 2 ? 'Fă-l jumătate' : 'Fă-l lat'}><MoveHorizontal className="h-4 w-4" /></button>
            <button type="button" className={ctrlBtn} onClick={onMoveRight} disabled={!canRight} aria-label="Mută după" title="Mută după"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </>
      )}
      <div className={cn('w-full', editMode && 'pointer-events-none select-none cursor-grab')}>
        {children}
      </div>
    </div>
  );
}

function GhostTile({ span, label, onAdd }: { span: 1 | 2; label: string; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        'group relative min-h-[112px] rounded-2xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-2 text-content-muted hover:border-accent/50 hover:text-accent transition-colors',
        span === 2 && 'lg:col-span-2',
      )}
    >
      <Plus className="h-5 w-5" />
      <span className="text-pm-xs font-medium">{label}</span>
    </button>
  );
}

export default function DashboardPage({ user, onNavigate }: DashboardPageProps) {
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const materials = useMaterialStore(s => s.materials);
  const fetchMaterials = useMaterialStore(s => s.fetchMaterials);
  const alerts = useAlertStore(s => s.alerts);
  const fetchAlerts = useAlertStore(s => s.generateAndFetch);
  const dashboardData = useDashboardStore(s => s.dashboardData);
  const financeOverview = useDashboardStore(s => s.financeOverview);
  const refreshDashboard = useDashboardStore(s => s.refreshAll);
  const setRange = useDashboardStore(s => s.setRange);
  const startDashPoll = useDashboardStore(s => s.startPolling);
  const fetchHandoffs = useHandoffStore(s => s.fetchPending);
  const startHandoffPoll = useHandoffStore(s => s.startPolling);
  const loadSettings = useSettingsStore(s => s.load);
  const eurRate = useSettingsStore(s => s.eurToRonRate);
  const displayCurrency = useSettingsStore(s => s.defaultCurrency);
  
  
  // Compact money for the KPI strip so the hero figures never truncate
  // (e.g. "13,9 mil. RON" instead of a cut-off "13.938.520 …"). Converts
  // RON → the display currency first, then compact-notates.
  const moneyCompact = (n: number): string => {
    const converted = displayCurrency === 'EUR' ? n / (eurRate || 4.97) : n;
    return (
      new Intl.NumberFormat('ro-RO', { notation: 'compact', maximumFractionDigits: 1, compactDisplay: 'short' }).format(converted) +
      ' ' + displayCurrency
    );
  };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiConnected, setAiConnected] = useState(false);

  
  const [timeRange, setTimeRange] = useState<TimeRange>(() => ({ ...presetRange('all'), preset: 'all' }));
  const [customFrom, setCustomFrom] = useState<string>(() => isoDate(new Date(Date.now() - 30 * 24 * 3600 * 1000)));
  const [customTo, setCustomTo] = useState<string>(() => isoDate(new Date()));

  const role = normalizeRole(user?.role_name);
  const can = (p: AppPage) => canAccessPage(role, p, user?.custom_pages);
  
  
  
  const widgets = useMemo(() => parseDashboardConfig(user?.dashboard_config), [user?.dashboard_config]);

  
  
  
  const canFinance    = can('finance');
  const canProjects   = can('projects');
  const canProduction = can('production');
  const canWarehouse  = can('warehouse');

  const d: DData = useMemo(() => {
    const s = (dashboardData?.summary || dashboardData) as Record<string, unknown>;
    const fin = (financeOverview ?? {}) as Record<string, unknown>;
    return {
      total_projects:    (s.projects_total as number) || 0,
      active_projects:   (s.projects_active as number) || 0,
      in_production:     (s.projects_in_production as number) || 0,
      total_materials:   materials.length,
      low_stock_count:   (s.materials_critical_stock as number) || 0,
      pending_alerts:    (s.active_alerts as number) || 0,
      total_documents:   (s.documents_total as number) || 0,
      revenue:           (s.revenue_total as number) ?? (fin.total_actual_revenue as number) ?? 0,
      
      
      
      costs:             (((s.costs_materials_total as number) || 0) + ((s.costs_labor_total as number) || 0) + ((s.costs_other_total as number) || 0)) || (fin.total_actual_cost as number) || 0,
      profit:            (s.profit_total as number) ?? (fin.total_actual_profit as number) ?? 0,
    };
  }, [dashboardData, financeOverview, materials.length]);

  const doRefresh = async () => {
    await Promise.all([
      refreshDashboard(), fetchMaterials(), fetchProjects(), fetchAlerts(), fetchHandoffs(true),
    ]);
    aiHealth().then(setAiConnected);
  };

  
  useEffect(() => {
    setLoading(true);
    void loadSettings();
    void doRefresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  
  useEffect(() => {
    // SSE (useLiveEvents) already pushes these updates in real time; this poll
    // is just a slow safety net. 5s was ~4 redundant requests every 5s per open
    // dashboard — raised to 30s (audit T2.1).
    const stopDash = startDashPoll(30000);
    const stopHand = startHandoffPoll(30000);
    return () => { stopDash(); stopHand(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => { setRefreshing(true); await doRefresh(); setRefreshing(false); };

  
  useEffect(() => {
    void setRange({ from: timeRange.from, to: timeRange.to });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange.from, timeRange.to]);

  
  useEffect(() => {
    if (loading || !aiConnected) return;
    const handle = setTimeout(() => {
      setAiSummaryLoading(true);
      const profitNow = d.profit || (d.revenue - d.costs);
      const marginNow = d.revenue > 0 ? (profitNow / d.revenue) * 100 : 0;
      const facts = [
        `proiecte_total=${d.total_projects}`, `proiecte_active=${d.active_projects}`,
        `proiecte_in_productie=${d.in_production}`, `materiale_sub_stoc_minim=${d.low_stock_count}`,
        `alerte_active=${d.pending_alerts}`, `venituri=${Math.round(d.revenue)}`,
        `costuri=${Math.round(d.costs)}`, `profit=${Math.round(profitNow)}`,
        `marja_procent=${marginNow.toFixed(1)}`,
      ].join(', ');
      aiChat(
        [{ role: 'user', content:
          `Date reale (folosește exact aceste cifre, nu inventa): ${facts}.\n\n` +
          `Generează o sinteză scurtă (max 3 propoziții) a situației curente menționând: proiecte active, situația financiară (profit/marjă), stoc critic, alerte. ` +
          `Concis, în română, fără introduceri și fără să schimbi cifrele.` }],
        `dash-summary-${Date.now()}`
      ).then(res => setAiSummary(res.reply))
        .catch(() => setAiSummary(null))
        .finally(() => setAiSummaryLoading(false));
    }, 1500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, aiConnected, d.total_projects, d.active_projects, d.in_production, d.low_stock_count, d.pending_alerts, d.revenue, d.costs, d.profit]);

  const profit = d.profit || (d.revenue - d.costs);
  const margin = d.revenue > 0 ? (profit / d.revenue) * 100 : 0;

  const activeProjects = useMemo(() =>
    projects.filter(p => p.status !== 'finalizat' && p.status !== 'anulat')
      .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
      .slice(0, 8),
    [projects]
  );

  const criticalStock = useMemo(() => materials.filter(m => m.stock <= m.min_stock).slice(0, 6), [materials]);
  
  
  
  const recentAlerts = useMemo(() => alerts.filter(a => !a.acknowledged).slice(0, 5), [alerts]);

  const projectsByStage = useMemo(() => {
    const map = new Map<string, number>();
    projects.forEach(p => { const k = p.stage || p.status || '—'; map.set(k, (map.get(k) || 0) + 1); });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [projects]);

  const dateStr = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, []);

  const userFirst = (user?.full_name || user?.username || '').split(' ')[0] || 'utilizator';

  // iOS-style edit mode + per-user widget arrangement.
  const layoutKey = String(user?.id ?? user?.username ?? 'anon');
  const { layout, setOrder, setSize, hide, show, reset } = useWidgetLayout(layoutKey);
  const [editMode, setEditMode] = useState(false);
  const [dragId, setDragId] = useState<WId | null>(null);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-pm-sm text-content-muted">Se încarcă tabloul...</p>
        </div>
      </div>
    );
  }

  // Each dashboard card → a widget node, rendered in the user's arranged order.
  const widgetNode: Record<WId, React.ReactNode> = {
    revenue_chart: (
      <Card padding="md" className="h-full min-w-0">
        <SectionHeader eyebrow="Financiar" title="Evoluție venituri" icon={TrendingUp} className="mb-4" />
        {widgets.revenue_chart && canFinance
          ? (<Suspense fallback={<div className="ds-skeleton h-64 w-full rounded-xl" />}><RevenueChartWidget /></Suspense>)
          : <EmptyState icon={TrendingUp} title="Fără date financiare" description="Nu există date financiare de afișat pentru intervalul selectat." />}
      </Card>
    ),
    production_stages: (
      <Card padding="md" className="h-full min-w-0">
        <SectionHeader title="Producție pe etape" icon={Factory} className="mb-4" />
        {!canProduction ? <EmptyState icon={Factory} title="Fără acces" />
          : projectsByStage.length === 0 ? <EmptyState icon={Factory} title="Fără date" />
          : (
            <div key={projectsByStage.length} className="stagger-in space-y-3">
              {projectsByStage.slice(0, 5).map(([stage, count]) => {
                const max = projectsByStage[0]?.[1] || 1;
                const pct = (count / max) * 100;
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-pm-xs text-content-secondary truncate">{sentenceCase(stage)}</span>
                      <span className="text-pm-sm font-semibold tabular-nums text-content-primary ml-2">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-tertiary overflow-hidden">
                      <div className="anim-bar-grow h-full bg-content-primary/80 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </Card>
    ),
    activity: (
      <Card padding="md" className="h-full min-w-0 flex flex-col">
        <SectionHeader title="Operațional" icon={Activity} className="mb-4" />
        <div className="stagger-in grid grid-cols-2 gap-3 flex-1 content-center">
          <MiniStat label="Documente" value={d.total_documents} />
          <MiniStat label="Materiale" value={d.total_materials} />
          <MiniStat label="Stoc critic" value={canWarehouse ? d.low_stock_count : '—'} warn={canWarehouse && d.low_stock_count > 0} />
          <MiniStat label="Alerte" value={d.pending_alerts} warn={d.pending_alerts > 0} />
        </div>
      </Card>
    ),
    active_projects: (
      <Card padding="md" className="h-full min-w-0">
        <SectionHeader title="Proiecte active" icon={FolderKanban} className="mb-3"
          actions={canProjects ? (<button onClick={() => onNavigate('projects')} className="text-pm-xs text-accent hover:underline">Deschide</button>) : undefined} />
        {!canProjects ? <EmptyState icon={FolderKanban} title="Fără acces" />
          : activeProjects.length === 0 ? <EmptyState icon={FolderKanban} title="Niciun proiect activ" />
          : (
            <ul key={activeProjects.length} className="stagger-in space-y-1">
              {activeProjects.slice(0, 6).map(p => (
                <li key={p.id}>
                  <button onClick={() => onNavigate('projects')} className="w-full text-left flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-surface-tertiary/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-pm-sm font-medium text-content-primary truncate">{p.name}</p>
                      <p className="text-pm-2xs text-content-muted truncate">{p.client_name || '—'}</p>
                    </div>
                    <StatusBadge {...projectStatus(p.stage || p.status)} size="xs" />
                    <span className="text-pm-2xs text-content-muted tabular-nums shrink-0 hidden sm:inline">{formatDateRo(p.deadline)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </Card>
    ),
    alerts_panel: (
      <Card padding="md" className="h-full min-w-0">
        <SectionHeader title="Alerte" icon={Bell} className="mb-3"
          meta={d.pending_alerts > 0 ? `${d.pending_alerts} active` : undefined}
          actions={can('alerts') ? (<button onClick={() => onNavigate('alerts')} className="text-pm-xs text-accent hover:underline">Toate</button>) : undefined} />
        {!can('alerts') ? <EmptyState icon={Bell} title="Fără acces" />
          : recentAlerts.length === 0 ? <EmptyState icon={Bell} title="Nicio alertă activă" />
          : (
            <ul key={recentAlerts.length} className="stagger-in space-y-1">
              {recentAlerts.map(a => (
                <li key={a.id}>
                  <button onClick={() => onNavigate('alerts')} className="w-full text-left flex items-start gap-3 px-2.5 py-2.5 rounded-lg hover:bg-surface-tertiary/40 transition-colors">
                    <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${a.severity === 'critical' ? 'bg-status-red' : a.severity === 'high' ? 'bg-status-amber' : 'bg-status-blue'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-pm-xs text-content-primary leading-snug">{a.title}</p>
                      <p className="text-pm-2xs text-content-muted mt-0.5">{formatDateRo(a.created_at)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </Card>
    ),
    ai_summary: (
      <Card padding="md" className="h-full min-w-0">
        <SectionHeader title="Sinteză AI" icon={Sparkles} className="mb-3" />
        {aiSummaryLoading
          ? <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-accent" /><span className="text-pm-sm text-content-muted">Se compune sinteza...</span></div>
          : aiSummary ? <p className="text-pm-sm text-content-secondary leading-relaxed">{aiSummary}</p>
            : <p className="text-pm-sm text-content-muted">Nu există date suficiente.</p>}
      </Card>
    ),
    briefing: (
      <Card padding="md" className="h-full min-w-0 overflow-hidden"><DailyBriefingWidget onNavigate={onNavigate} /></Card>
    ),
    inbox: (
      <Card padding="md" className="h-full min-w-0 overflow-hidden"><InboxWidget onOpenProject={(pid) => { sessionStorage.setItem('promix_focus_project', String(pid)); onNavigate('projects'); }} /></Card>
    ),
    critical_stock: (
      <Card padding="md" className="h-full min-w-0">
        <SectionHeader title="Stoc critic" icon={Warehouse} className="mb-3"
          actions={(<button onClick={() => onNavigate('materials')} className="text-pm-xs text-accent hover:underline">Deschide</button>)} />
        {criticalStock.length === 0 ? <EmptyState icon={Warehouse} title="Niciun material sub minim" />
          : (
            <ul key={criticalStock.length} className="stagger-in space-y-0.5">
              {criticalStock.map(m => (
                <li key={m.id} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-surface-tertiary/30">
                  <span className="text-pm-sm text-content-primary truncate">{m.name}</span>
                  <span className="shrink-0 pl-3"><span className="text-pm-sm font-semibold tabular-nums text-status-red">{m.stock}</span><span className="text-pm-2xs text-content-muted"> / {m.min_stock}</span></span>
                </li>
              ))}
            </ul>
          )}
      </Card>
    ),
  };
  const widgetMeta: Record<WId, { label: string; available: boolean }> = {
    revenue_chart:     { label: 'Evoluție venituri', available: widgets.revenue_chart },
    production_stages: { label: 'Producție pe etape', available: widgets.production_stages },
    activity:          { label: 'Operațional', available: widgets.activity },
    active_projects:   { label: 'Proiecte active', available: widgets.active_projects },
    alerts_panel:      { label: 'Alerte', available: widgets.alerts_panel },
    ai_summary:        { label: 'Sinteză AI', available: widgets.ai_summary && aiConnected },
    briefing:          { label: 'Briefing', available: widgets.briefing },
    inbox:             { label: 'Inbox predări', available: widgets.inbox },
    critical_stock:    { label: 'Stoc critic', available: widgets.critical_stock && canWarehouse },
  };
  const visibleWidgets = layout.order.filter(id => widgetMeta[id].available && !layout.hidden.includes(id));
  const hiddenWidgets = layout.order.filter(id => widgetMeta[id].available && layout.hidden.includes(id));

  // Reorder by swapping with the visible neighbour (drives the ◄ ► buttons).
  const moveWidget = (id: WId, dir: -1 | 1) => {
    const vi = visibleWidgets.indexOf(id);
    const neighbor = visibleWidgets[vi + dir];
    if (!neighbor) return;
    const order = [...layout.order];
    const ia = order.indexOf(id), ib = order.indexOf(neighbor);
    [order[ia], order[ib]] = [order[ib], order[ia]];
    setOrder(order);
  };
  // Live reorder while dragging a tile over another.
  const reorderDrag = (from: WId, to: WId) => {
    if (from === to) return;
    const order = [...layout.order];
    const fi = order.indexOf(from), ti = order.indexOf(to);
    if (fi < 0 || ti < 0) return;
    order.splice(fi, 1); order.splice(ti, 0, from);
    setOrder(order);
  };

  return (
    <Page>
      {}
      <DashboardBackground />
      <Page.Body maxWidth="wide" padding="comfortable" className="relative z-[1]">

        {


}
        <header className="dash-enter shrink-0 pb-3.5 border-b border-line/60 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-pm-eyebrow text-content-muted mb-0.5 flex items-center gap-2">
                <span className="inline-block h-px w-3.5 bg-content-muted/40" aria-hidden />
                Tablou de bord
              </p>
              <h1 className="text-pm-xl font-semibold text-content-primary truncate leading-tight">Bună, {userFirst}</h1>
              <p className="mt-1 text-pm-sm text-content-muted capitalize flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span>{dateStr}</span>
                <span className="inline-flex items-center gap-1.5 text-status-green normal-case">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-green animate-pulse" /> Sistem operațional
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {editMode ? (
              <>
                <Button variant="secondary" size="md" onClick={reset} title="Revino la aranjamentul implicit">
                  <RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">Resetează</span>
                </Button>
                <Button size="md" onClick={() => setEditMode(false)}>
                  <Check className="h-4 w-4" /> Gata
                </Button>
              </>
            ) : (
              <>
                {widgets.time_range && (
                  <TimeRangeBar embedded
                    range={timeRange} setRange={setTimeRange}
                    customFrom={customFrom} setCustomFrom={setCustomFrom}
                    customTo={customTo} setCustomTo={setCustomTo} />
                )}
                <Button variant="secondary" size="md" onClick={() => setEditMode(true)} title="Rearanjează widget-urile">
                  <Pencil className="h-4 w-4" /> <span className="hidden sm:inline">Editează</span>
                </Button>
                <Button variant="secondary" size="md" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Reîmprospătează</span>
                </Button>
              </>
            )}
          </div>
        </header>

        {}
        {widgets.kpi_strip && (
          <div className="dash-enter shrink-0 space-y-2" style={{ animationDelay: '80ms' }}>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <DashKpi
                hero
                className="col-span-2 lg:col-span-2"
                vtName={vtName('dash-kpi', 'profit')}
                label="Profit net" icon={Wallet} amount={profit} format={moneyCompact} warn={profit < 0}
                hint={`Marjă netă ${margin.toFixed(1)}%`}
                noAccess={!canFinance}
              />
              <DashKpi
                vtName={vtName('dash-kpi', 'revenue')}
                label="Venituri" icon={TrendingUp} amount={d.revenue} format={moneyCompact}
                noAccess={!canFinance}
              />
              <DashKpi
                vtName={vtName('dash-kpi', 'projects')}
                label="Proiecte active" icon={FolderKanban} amount={d.active_projects} format={fmtCount}
                unit={`/ ${d.total_projects}`}
                noAccess={!canProjects}
              />
              <DashKpi
                vtName={vtName('dash-kpi', 'costs')}
                label="Costuri" icon={Receipt} amount={d.costs} format={moneyCompact}
                noAccess={!canFinance}
              />
            </div>
            {canFinance && (
              <p className="text-right text-pm-2xs text-content-muted">Valori financiare în {displayCurrency} · curs {formatNumber(eurRate, 4)} RON/EUR</p>
            )}
          </div>
        )}

        {/* iOS-style editable widget grid — ◄ ► move · ⤢ resize · − remove · or drag. */}
        {editMode && (
          <p className="dash-enter text-center text-pm-xs text-content-muted">
            Mod editare: <strong className="text-content-secondary">◄ ►</strong> mută · <strong className="text-content-secondary">⤢</strong> dimensiune · <strong className="text-content-secondary">−</strong> elimină · sau trage widget-ul.
          </p>
        )}
        <div className="dash-enter grid grid-cols-1 lg:grid-cols-2 gap-5" style={{ animationDelay: '160ms' }}>
          {visibleWidgets.map((id, i) => (
            <WidgetTile
              key={id}
              span={layout.sizes[id]}
              editMode={editMode}
              dragging={dragId === id}
              canLeft={i > 0}
              canRight={i < visibleWidgets.length - 1}
              onRemove={() => hide(id)}
              onResize={(size) => setSize(id, size)}
              onMoveLeft={() => moveWidget(id, -1)}
              onMoveRight={() => moveWidget(id, 1)}
              onDragStart={() => setDragId(id)}
              onDragEnter={() => { if (dragId && dragId !== id) reorderDrag(dragId, id); }}
              onDragEnd={() => setDragId(null)}
            >
              {widgetNode[id]}
            </WidgetTile>
          ))}
          {editMode && hiddenWidgets.map(id => (
            <GhostTile key={id} span={layout.sizes[id]} label={widgetMeta[id].label} onAdd={() => show(id)} />
          ))}
          {editMode && visibleWidgets.length === 0 && hiddenWidgets.length === 0 && (
            <p className="lg:col-span-2 text-center text-pm-sm text-content-muted py-8">Niciun widget disponibil.</p>
          )}
        </div>

      </Page.Body>
    </Page>
  );
}





function TimeRangeBar({
  range, setRange, customFrom, setCustomFrom, customTo, setCustomTo, embedded,
}: {
  range: TimeRange; setRange: (r: TimeRange) => void;
  customFrom: string; setCustomFrom: (v: string) => void;
  customTo: string; setCustomTo: (v: string) => void;
  
  embedded?: boolean;
}) {
  const presets: Array<{ id: RangePreset; label: string }> = [
    { id: 'all',   label: 'Tot timpul' },
    { id: 'month', label: 'Ultima lună' },
    { id: '6m',    label: 'Ultimele 6 luni' },
    { id: 'year',  label: 'Ultimul an' },
    { id: 'custom',label: 'Custom' },
  ];
  const apply = (preset: RangePreset) => {
    if (preset === 'custom') {
      setRange({ from: customFrom, to: customTo, preset });
    } else {
      setRange({ ...presetRange(preset), preset });
    }
  };
  return (
    <div className={embedded ? '' : 'bg-surface-primary border-b border-line'}>
      <div className={`flex flex-wrap items-center gap-2 ${embedded ? '' : 'px-4 py-2.5'}`}>
        <div className="flex flex-wrap gap-1">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => apply(p.id)}
              className={filterToggleCls(range.preset === p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {range.preset === 'custom' && (
          <div className="flex items-center gap-1.5 ml-2">
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={e => { setCustomFrom(e.target.value); setRange({ from: e.target.value, to: customTo, preset: 'custom' }); }}
              className={filterDateInputCls}
            />
            <span className="text-pm-xs text-content-muted">→</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              onChange={e => { setCustomTo(e.target.value); setRange({ from: customFrom, to: e.target.value, preset: 'custom' }); }}
              className={filterDateInputCls}
            />
          </div>
        )}
      </div>
    </div>
  );
}






function DashKpi({ label, icon, amount, format, unit, warn, trend, trendValue, hint, noAccess, hero, className, vtName: vt }: {
  label: string; icon: IconCmp;
  amount?: number; format?: (n: number) => string; unit?: string;
  warn?: boolean; trend?: 'up' | 'down' | 'flat'; trendValue?: string; hint?: string;
  noAccess?: boolean; hero?: boolean; className?: string; vtName?: string;
}) {
  const animated = useCountUp(amount ?? 0);
  const base = noAccess ? 'NaN' : (format ? format(animated) : fmtCount(animated));
  const value = noAccess ? 'NaN' : (unit ? `${base} ${unit}` : base);
  return (
    <KpiCard
      vtName={vt}
      hero={hero}
      className={className}
      label={label}
      value={value}
      icon={icon}
      iconColor={noAccess ? 'text-content-muted' : warn ? 'text-status-red' : 'text-content-muted'}
      trend={noAccess ? undefined : trend}
      trendValue={noAccess ? undefined : trendValue}
      hint={noAccess ? 'nu ai acces la acest tip de date' : hint}
    />
  );
}





function MiniStat({ label, value, warn, accent }: {
  label: string; value: string | number; warn?: boolean; accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-surface-tertiary/40 p-3">
      <p className="text-pm-2xs font-semibold uppercase tracking-wider text-content-muted">{label}</p>
      <p className={`mt-0.5 text-pm-lg font-semibold tabular-nums ${warn ? 'text-status-red' : accent ? 'text-accent' : 'text-content-primary'}`}>
        {value}
      </p>
    </div>
  );
}
