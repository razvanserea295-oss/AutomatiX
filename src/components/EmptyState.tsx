














import type { LucideIcon } from '@/icons';
import { Inbox } from '@/icons';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  
  icon?: LucideIcon;
  
  title: string;
  
  body?: ReactNode;
  
  actionLabel?: string;
  onAction?: () => void;
  
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  
  size?: 'sm' | 'md' | 'lg';
  
  className?: string;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const sizing = {
    sm: {
      wrap: 'py-4 px-3 gap-1.5',
      orb:  'h-9 w-9',
      icon: 'h-4 w-4',
      title: 'text-pm-sm font-medium',
      body: 'text-pm-2xs',
      bodyMax: 'max-w-[260px]',
      btnH: 'h-7 px-2.5 text-pm-2xs',
    },
    md: {
      wrap: 'py-10 px-6 gap-2',
      orb:  'h-14 w-14',
      icon: 'h-6 w-6',
      title: 'text-pm-md font-semibold',
      body: 'text-pm-xs',
      bodyMax: 'max-w-sm',
      btnH: 'h-8 px-3 text-pm-xs',
    },
    lg: {
      wrap: 'py-16 px-8 gap-3',
      orb:  'h-20 w-20',
      icon: 'h-8 w-8',
      title: 'text-pm-3xl font-semibold tracking-tight',
      body: 'text-pm-base',
      bodyMax: 'max-w-md',
      btnH: 'h-10 px-4 text-pm-sm',
    },
  }[size];

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${sizing.wrap} ${className}`}
      role="status"
    >
      {}
      <span
        className={`group relative mb-1 inline-flex items-center justify-center rounded-full bg-gradient-to-br from-accent/15 to-accent/0 ring-1 ring-accent/20 text-accent transition-all duration-200 hover:ring-accent/40 ${sizing.orb}`}
      >
        <Icon className={`${sizing.icon} transition-transform duration-200 group-hover:scale-110`} aria-hidden />
        {}
        <span aria-hidden className="absolute inset-0 rounded-full bg-accent/0 group-hover:bg-accent/5 transition-colors duration-300" />
      </span>

      <p className={`${sizing.title} text-content-primary leading-snug`}>{title}</p>

      {body && (
        <p className={`leading-relaxed text-content-muted ${sizing.body} ${sizing.bodyMax}`}>{body}</p>
      )}

      {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
        <div className="mt-3 flex items-center gap-2">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className={`btn-shine inline-flex items-center justify-center gap-1.5 rounded-md bg-accent text-[var(--color-on-accent)] font-semibold shadow-[var(--elevation-1)] hover:shadow-[var(--elevation-2)] hover:brightness-105 active:scale-[0.98] transition-all duration-150 focus-ring-soft ${sizing.btnH}`}
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className={`inline-flex items-center justify-center rounded-md text-content-muted hover:text-content-primary hover:bg-surface-tertiary/50 transition-colors focus-ring-soft ${sizing.btnH}`}
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
