import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'accent'
  | 'secondary'
  | 'danger'
  | 'outline';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Numeric notification badge — renders as absolute overlay when used inside relative parent */
  count?: number;
  dot?: boolean;
}

const variantClass: Record<BadgeVariant, string> = {
  default: 'ds-badge--accent',
  success: 'ds-badge--success',
  warning: 'ds-badge--warning',
  error: 'ds-badge--error',
  info: 'ds-badge--info',
  neutral: 'ds-badge--neutral',
  accent: 'ds-badge--accent',
  secondary: 'ds-badge--neutral',
  danger: 'ds-badge--error',
  outline: 'ds-badge--outline',
};

export function Badge({ variant = 'default', count, dot, className, children, ...props }: BadgeProps) {
  if (count !== undefined) {
    if (count <= 0) return null;
    const display = count > 99 ? '99+' : String(count);
    return (
      <span key={count} className={cn('ds-notification-badge', className)} {...props}>
        {display}
      </span>
    );
  }

  return (
    <span className={cn('ds-badge', variantClass[variant], className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export default Badge;
