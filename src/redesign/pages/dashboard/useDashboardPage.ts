import { useState, useEffect, useMemo, useCallback } from 'react';
import type { User } from '@/core/types';
import { normalizeRole, canAccessPage, type AppPage } from '@/lib/access';
import { formatNumber } from '@/lib/format';
import { useProjectStore } from '@/store/projectStore';
import { useMaterialStore } from '@/store/materialStore';
import { useAlertStore } from '@/store/alertStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useHandoffStore } from '@/store/handoffStore';
import type { DashboardSummary } from './types';

export function useDashboardPage(user: User | null) {
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const materials = useMaterialStore(s => s.materials);
  const fetchMaterials = useMaterialStore(s => s.fetchMaterials);
  const alerts = useAlertStore(s => s.alerts);
  const fetchAlerts = useAlertStore(s => s.generateAndFetch);
  const dashboardData = useDashboardStore(s => s.dashboardData);
  const financeOverview = useDashboardStore(s => s.financeOverview);
  const salesStats = useDashboardStore(s => s.salesStats);
  const refreshDashboard = useDashboardStore(s => s.refreshAll);
  const startDashPoll = useDashboardStore(s => s.startPolling);
  const handoffs = useHandoffStore(s => s.pending);
  const fetchHandoffs = useHandoffStore(s => s.fetchPending);
  const startHandoffPoll = useHandoffStore(s => s.startPolling);
  const loadSettings = useSettingsStore(s => s.load);
  const eurRate = useSettingsStore(s => s.eurToRonRate);
  const displayCurrency = useSettingsStore(s => s.defaultCurrency);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const role = normalizeRole(user?.role_name);
  const can = useCallback(
    (page: AppPage) => canAccessPage(role, page, user?.custom_pages),
    [role, user?.custom_pages],
  );

  const toDisplay = useCallback(
    (n: number): number => (displayCurrency === 'EUR' ? n / (eurRate || 4.97) : n),
    [displayCurrency, eurRate],
  );

  const money = useCallback(
    (n: number): string => `${formatNumber(Math.round(toDisplay(n)))} ${displayCurrency}`,
    [displayCurrency, toDisplay],
  );

  const fmtCount = (n: number): string => formatNumber(Math.round(n));

  const summary: DashboardSummary = useMemo(() => {
    const s = (dashboardData?.summary || dashboardData) as Record<string, unknown>;
    const fin = (financeOverview ?? {}) as Record<string, unknown>;
    return {
      total_projects: (s.projects_total as number) || 0,
      active_projects: (s.projects_active as number) || 0,
      in_production: (s.projects_in_production as number) || 0,
      total_materials: materials.length,
      low_stock_count: (s.materials_critical_stock as number) || 0,
      pending_alerts: (s.active_alerts as number) || 0,
      total_documents: (s.documents_total as number) || 0,
      revenue: (s.revenue_total as number) ?? (fin.total_actual_revenue as number) ?? 0,
      costs:
        (((s.costs_materials_total as number) || 0)
          + ((s.costs_labor_total as number) || 0)
          + ((s.costs_other_total as number) || 0))
        || (fin.total_actual_cost as number) || 0,
      profit: (s.profit_total as number) ?? (fin.total_actual_profit as number) ?? 0,
    };
  }, [dashboardData, financeOverview, materials.length]);

  const costsKnown = summary.costs > 0;
  const profit = costsKnown ? (summary.profit || (summary.revenue - summary.costs)) : 0;
  const marginPercent = costsKnown && summary.revenue > 0 ? (profit / summary.revenue) * 100 : null;

  const activeProjects = useMemo(
    () => projects
      .filter(p => p.status !== 'finalizat' && p.status !== 'anulat')
      .sort((a, b) => {
        const aOver = a.deadline && a.deadline < new Date().toISOString().slice(0, 10) ? 0 : 1;
        const bOver = b.deadline && b.deadline < new Date().toISOString().slice(0, 10) ? 0 : 1;
        if (aOver !== bOver) return aOver - bOver;
        return (a.deadline || '9999').localeCompare(b.deadline || '9999');
      })
      .slice(0, 8),
    [projects],
  );

  const criticalStock = useMemo(
    () => materials.filter(m => m.stock <= m.min_stock).slice(0, 8),
    [materials],
  );

  const unackedAlerts = useMemo(() => alerts.filter(a => !a.acknowledged), [alerts]);

  const attentionCount = unackedAlerts.length + handoffs.length;

  const doRefresh = useCallback(async () => {
    await Promise.all([
      refreshDashboard(),
      fetchMaterials(),
      fetchProjects(),
      fetchAlerts(),
      fetchHandoffs(true),
    ]);
    setLastRefreshedAt(new Date());
  }, [refreshDashboard, fetchMaterials, fetchProjects, fetchAlerts, fetchHandoffs]);

  useEffect(() => {
    setLoading(true);
    void loadSettings();
    void doRefresh().finally(() => setLoading(false));
  }, [doRefresh, loadSettings]);

  useEffect(() => {
    const stopDash = startDashPoll(30000);
    const stopHand = startHandoffPoll(30000);
    return () => { stopDash(); stopHand(); };
  }, [startDashPoll, startHandoffPoll]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await doRefresh();
    setRefreshing(false);
  }, [doRefresh]);

  const dateLabel = new Date().toLocaleDateString('ro-RO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return {
    loading,
    refreshing,
    can,
    money,
    fmtCount,
    summary,
    costsKnown,
    profit,
    marginPercent,
    displayCurrency,
    activeProjects,
    criticalStock,
    unackedAlerts,
    handoffs,
    salesStats,
    attentionCount,
    handleRefresh,
    dateLabel,
    lastRefreshedAt,
  };
}
