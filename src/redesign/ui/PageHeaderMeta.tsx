import type { ReactNode } from 'react';
import { Clock } from '@/icons';
import { formatDateTimeRo } from '@/lib/format';
import type { StatusTone } from '@/lib/statusTokens';
import StatusBadge from './StatusBadge';

export interface PageHeaderMetric {
  label: string;
  value: ReactNode;
  tone?: StatusTone;
}

export function PageHeaderCount({ count, label }: { count: number | string; label?: string }) {
  return (
    <span className="page-header-count inline-flex shrink-0 items-center rounded-md bg-surface-tertiary px-2 py-0.5 text-pm-xs font-semibold tabular-nums text-content-secondary ring-1 ring-line/50">
      {label ? (
        <>
          <span className="text-content-primary">{count}</span>
          <span className="ml-1 font-medium text-content-muted">{label}</span>
        </>
      ) : (
        count
      )}
    </span>
  );
}

export function PageHeaderMetricChip({ label, value, tone = 'neutral' }: PageHeaderMetric) {
  return (
    <span className="page-header-metric inline-flex items-center gap-1.5 rounded-md bg-surface-secondary/80 px-2 py-0.5 ring-1 ring-line/40">
      <span className="text-pm-2xs text-content-muted">{label}</span>
      <StatusBadge tone={tone} label={String(value)} size="xs" />
    </span>
  );
}

export function PageHeaderLastUpdated({
  at,
  refreshing,
}: {
  at?: Date | string | number | null;
  refreshing?: boolean;
}) {
  if (!at) return null;
  const iso =
    at instanceof Date
      ? at.toISOString()
      : typeof at === 'number'
        ? new Date(at).toISOString()
        : at;

  return (
    <span
      className="page-header-updated inline-flex items-center gap-1 text-pm-2xs text-content-muted"
      title={formatDateTimeRo(iso)}
    >
      <Clock className={`h-3 w-3 shrink-0 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
      <span>Actualizat {formatRelativeRo(at)}</span>
    </span>
  );
}

function formatRelativeRo(at: Date | string | number): string {
  const d = at instanceof Date ? at : new Date(at);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'acum';
  if (mins < 60) return `acum ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `acum ${hours} h`;
  return formatDateTimeRo(d.toISOString()).split(',')[0] ?? formatDateTimeRo(d.toISOString());
}

export function PageHeaderMetaRow({ children }: { children: ReactNode }) {
  return (
    <div className="page-header-meta-row mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
      {children}
    </div>
  );
}
