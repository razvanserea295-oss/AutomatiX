import type { ReactNode } from 'react';
import { cn } from '@/v2/lib/cn';

export type AnomalyBadgeProps = {
  active?: boolean;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
};

export function AnomalyBadge({ active = true, onClick, children, className }: AnomalyBadgeProps) {
  if (!active) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'analytics-anomaly-badge relative inline-flex items-center gap-1.5 rounded-md px-2 py-1',
        'text-xs font-medium text-status-red',
        onClick && 'cursor-pointer hover:bg-status-red/10',
        className,
      )}
    >
      <span className="analytics-anomaly-dot h-2 w-2 rounded-full bg-status-red" />
      {children ?? 'Anomaly detected'}
    </button>
  );
}
