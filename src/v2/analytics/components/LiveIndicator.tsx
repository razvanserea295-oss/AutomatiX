import { cn } from '@/v2/lib/cn';
import { useReducedMotion } from '@/v2/hooks/useReducedMotion';

export type LiveStatus = 'live' | 'reconnecting' | 'offline';

export type LiveIndicatorProps = {
  status?: LiveStatus;
  label?: string;
  className?: string;
};

const STATUS_LABEL: Record<LiveStatus, string> = {
  live: 'Live',
  reconnecting: 'Reconnecting...',
  offline: 'Offline',
};

export function LiveIndicator({ status = 'live', label, className }: LiveIndicatorProps) {
  const reduced = useReducedMotion();
  const text = label ?? STATUS_LABEL[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="relative inline-flex h-2 w-2">
        <span
          className={cn(
            'h-full w-full rounded-full',
            status === 'live' && 'bg-status-green',
            status === 'reconnecting' && 'bg-status-amber',
            status === 'offline' && 'bg-muted-foreground',
            status === 'live' && !reduced && 'analytics-live-pulse',
          )}
        />
      </span>
      <span
        className={cn(
          'text-xs font-medium',
          status === 'live' && 'text-status-green',
          status === 'reconnecting' && 'text-status-amber',
          status === 'offline' && 'text-muted-foreground',
        )}
      >
        {text}
      </span>
    </span>
  );
}
