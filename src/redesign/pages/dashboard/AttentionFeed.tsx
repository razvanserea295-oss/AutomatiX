import { useMemo } from 'react';
import { AlertTriangle, ArrowRightLeft, Bell, ChevronRight } from '@/icons';
import type { Alert } from '@/store/alertStore';
import type { ProjectHandoff } from '@/store/handoffStore';
import { formatDateRo } from '@/lib/format';
import { Panel } from '@/app-ui';
import EmptyState from '@/redesign/ui/EmptyState';
import type { NavigateFn } from './types';
import { DASH_EMPTY, DASH_LIST, DASH_LIST_ICON, DASH_LIST_ROW, DASH_PANEL } from './density';

type AttentionKind = 'alert' | 'handoff';

interface AttentionItem {
  kind: AttentionKind;
  id: number;
  title: string;
  subtitle: string;
  urgent: boolean;
  sortKey: number;
  route: string;
}

function alertSeverityRank(alert: Alert): number {
  const s = (alert.severity || '').toLowerCase();
  const t = (alert.alert_type || '').toLowerCase();
  if (s === 'critical' || s === 'error' || t === 'critical' || t === 'error') return 0;
  if (s === 'warning' || t === 'warning' || t === 'deadline') return 1;
  return 2;
}

function handoffSortKey(h: ProjectHandoff): number {
  const overdue = new Date(h.sla_due_at).getTime() < Date.now();
  if (h.is_urgent) return 0;
  if (overdue) return 1;
  return 2;
}

interface AttentionFeedProps {
  alerts: Alert[];
  handoffs: ProjectHandoff[];
  attentionCount: number;
  onNavigate: NavigateFn;
}

export default function AttentionFeed({ alerts, handoffs, attentionCount, onNavigate }: AttentionFeedProps) {
  const items = useMemo(() => {
    const rows: AttentionItem[] = [
      ...alerts.map((a) => ({
        kind: 'alert' as const,
        id: a.id,
        title: a.title,
        subtitle: formatDateRo(a.created_at),
        urgent: alertSeverityRank(a) === 0,
        sortKey: alertSeverityRank(a),
        route: 'alerts',
      })),
      ...handoffs.map((h) => ({
        kind: 'handoff' as const,
        id: h.id,
        title: h.project_name,
        subtitle: `${h.from_stage_name || '—'} → ${h.to_stage_name}${h.is_urgent ? ' · urgent' : ''}`,
        urgent: h.is_urgent || new Date(h.sla_due_at).getTime() < Date.now(),
        sortKey: handoffSortKey(h),
        route: 'manager-control',
      })),
    ];
    return rows
      .sort((a, b) => a.sortKey - b.sortKey || a.title.localeCompare(b.title, 'ro'))
      .slice(0, 8);
  }, [alerts, handoffs]);

  const subtitle = attentionCount > 0
    ? `${attentionCount} element${attentionCount === 1 ? '' : 'e'}`
    : 'Totul la zi';

  return (
    <Panel
      title="Necesită atenția ta"
      subtitle={subtitle}
      fill
      scroll
      className={DASH_PANEL}
      actions={(
        <button
          type="button"
          onClick={() => onNavigate('alerts')}
          className="text-pm-2xs font-semibold text-accent hover:underline"
        >
          Vezi toate
        </button>
      )}
    >
      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nimic urgent acum"
          description="Nu ai alerte neconfirmate sau handoff-uri în așteptare."
          className={DASH_EMPTY}
        />
      ) : (
        <ul className={DASH_LIST}>
          {items.map((item) => {
            const Icon = item.kind === 'handoff' ? ArrowRightLeft : AlertTriangle;
            return (
              <li key={`${item.kind}-${item.id}`}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.route)}
                  className={DASH_LIST_ROW}
                >
                  <span className={`${DASH_LIST_ICON} ${item.urgent ? 'bg-status-red/10 text-status-red' : 'bg-surface-tertiary text-content-muted'}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <p className="truncate text-pm-sm font-medium leading-snug text-content-primary">{item.title}</p>
                    <p className="truncate text-pm-2xs leading-snug text-content-muted">{item.subtitle}</p>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-content-muted" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
