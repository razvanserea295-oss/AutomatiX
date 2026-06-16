







import { useEffect } from 'react';
import {
  TrendingUp, FolderKanban, Factory, Boxes, Wallet, BellRing, Bell,
} from 'lucide-react';
import type { User } from '@/core/types';
import { useDashboardStore } from '@/store/dashboardStore';
import { useAlertStore } from '@/store/alertStore';
import {
  KpiTile, SectionTitle, Card, ListRow, RowTitle, RowMeta, Tag, Divider,
  EmptyState, CenterSpinner, fmtNum, fmtMoneyShort, timeAgo, type Tone,
} from './kit';

function num(o: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = o?.[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
  }
  return 0;
}

function severityTone(sev: string): Tone {
  const s = (sev || '').toLowerCase();
  if (s === 'critical' || s === 'high') return 'red';
  if (s === 'medium' || s === 'warning') return 'amber';
  return 'blue';
}

export default function HomeTab({ user, refreshKey }: { user: User; refreshKey: number }) {
  const dash = useDashboardStore(s => s.dashboardData);
  const finance = useDashboardStore(s => s.financeOverview);
  const sales = useDashboardStore(s => s.salesStats);
  const loaded = useDashboardStore(s => s.loaded);
  const alerts = useAlertStore(s => s.alerts);

  
  useEffect(() => {
    const stop = useDashboardStore.getState().startPolling(5000);
    void useAlertStore.getState().fetchAlerts();
    return stop;
  }, []);

  
  useEffect(() => {
    if (refreshKey === 0) return;
    void useDashboardStore.getState().refreshAll();
    void useAlertStore.getState().fetchAlerts(true);
  }, [refreshKey]);

  const d = dash as Record<string, unknown>;
  const f = (finance || {}) as Record<string, unknown>;

  const activeProjects = num(d, 'active_projects', 'projects_active');
  const totalProjects = num(d, 'total_projects', 'projects_total');
  const inProduction = num(d, 'in_production', 'projects_in_production');
  const lowStock = num(d, 'low_stock_count', 'materials_critical_stock');
  const pendingAlerts = num(d, 'pending_alerts', 'active_alerts');

  const revenue = num(f, 'total_actual_revenue') || num(d, 'revenue');
  const profit = num(f, 'total_actual_profit') || num(d, 'profit');
  const hasFinance = finance != null;

  const pipeline = sales?.pipeline_value ?? 0;
  const totalLeads = sales?.total_leads ?? 0;
  const inNeg = sales?.in_negocieri ?? 0;

  const recentAlerts = [...alerts]
    .sort((a, b) => Number(a.acknowledged) - Number(b.acknowledged)
      || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);
  const unack = alerts.filter(a => !a.acknowledged).length;

  if (!loaded && Object.keys(d).length === 0) {
    return <CenterSpinner label="Se încarcă datele…" />;
  }

  const firstName = (user.full_name || user.username || '').split(/\s+/)[0];

  return (
    <div className="px-3.5 pt-3">
      <div className="px-1 mb-1">
        <p className="text-pm-2xl font-semibold text-content-primary leading-tight">
          Salut, {firstName} 👋
        </p>
        <p className="text-pm-sm text-content-muted">Privire de ansamblu — live</p>
      </div>

      <SectionTitle>Vânzări</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        <KpiTile
          label="Pipeline"
          value={fmtMoneyShort(pipeline)}
          sub={`€ · ${totalLeads} lead-uri`}
          tone="teal"
          icon={TrendingUp}
        />
        <KpiTile
          label="În negociere"
          value={fmtNum(inNeg)}
          sub="oportunități"
          tone="purple"
          icon={TrendingUp}
        />
      </div>

      <SectionTitle>Operațional</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        <KpiTile
          label="Proiecte active"
          value={fmtNum(activeProjects)}
          sub={`din ${fmtNum(totalProjects)}`}
          icon={FolderKanban}
        />
        <KpiTile
          label="În producție"
          value={fmtNum(inProduction)}
          sub="pe linie"
          tone="blue"
          icon={Factory}
        />
        <KpiTile
          label="Stoc critic"
          value={fmtNum(lowStock)}
          sub="sub minim"
          tone={lowStock > 0 ? 'red' : 'neutral'}
          icon={Boxes}
        />
        <KpiTile
          label="Alerte active"
          value={fmtNum(pendingAlerts || unack)}
          sub="nerezolvate"
          tone={(pendingAlerts || unack) > 0 ? 'amber' : 'neutral'}
          icon={BellRing}
        />
      </div>

      {hasFinance && (
        <>
          <SectionTitle>Financiar</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            <KpiTile label="Venituri" value={fmtMoneyShort(revenue)} sub="RON" tone="green" icon={Wallet} />
            <KpiTile
              label="Profit net"
              value={fmtMoneyShort(profit)}
              sub="RON"
              tone={profit < 0 ? 'red' : 'green'}
              icon={Wallet}
            />
          </div>
        </>
      )}

      <SectionTitle count={recentAlerts.length}>Alerte recente</SectionTitle>
      <Card className="overflow-hidden">
        {recentAlerts.length === 0 ? (
          <EmptyState icon={Bell} title="Nicio alertă" hint="Totul e în regulă." />
        ) : (
          recentAlerts.map((a, i) => (
            <div key={a.id}>
              {i > 0 && <Divider />}
              <ListRow accent={a.acknowledged ? 'neutral' : severityTone(a.severity)}>
                <div className="flex items-center gap-2">
                  {!a.acknowledged && <Tag tone={severityTone(a.severity)}>{a.severity || 'info'}</Tag>}
                  <RowTitle>{a.title || a.message}</RowTitle>
                </div>
                <RowMeta>
                  {a.message && a.title && <span className="truncate">{a.message}</span>}
                  <span>· {timeAgo(a.created_at)}</span>
                </RowMeta>
              </ListRow>
            </div>
          ))
        )}
      </Card>

      <div className="h-2" />
    </div>
  );
}
