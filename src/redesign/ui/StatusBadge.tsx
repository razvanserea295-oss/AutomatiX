










import { memo } from 'react';
import type { StatusTone, StatusToken } from '@/lib/statusTokens';

const toneClass: Record<StatusTone, string> = {
  success:  'bg-status-green/12 text-status-green ring-1 ring-status-green/20',
  warning:  'bg-status-amber/12 text-status-amber ring-1 ring-status-amber/20',
  danger:   'bg-status-red/12 text-status-red ring-1 ring-status-red/20',
  info:     'bg-status-blue/12 text-status-blue ring-1 ring-status-blue/20',
  progress: 'bg-status-teal/12 text-status-teal ring-1 ring-status-teal/20',
  special:  'bg-status-purple/12 text-status-purple ring-1 ring-status-purple/20',
  accent:   'bg-accent-muted text-accent ring-1 ring-accent/20',
  neutral:  'bg-surface-tertiary text-content-muted ring-1 ring-line/60',
};

const dotClass: Record<StatusTone, string> = {
  success:  'bg-status-green',
  warning:  'bg-status-amber',
  danger:   'bg-status-red',
  info:     'bg-status-blue',
  progress: 'bg-status-teal',
  special:  'bg-status-purple',
  accent:   'bg-accent',
  neutral:  'bg-content-muted',
};

const sizeClass = {
  xs: 'px-1.5 py-px text-pm-2xs',
  sm: 'px-2 py-0.5 text-pm-xs',
  md: 'px-2.5 py-1 text-pm-sm',
} as const;

interface StatusBadgeProps extends StatusToken {
  
  size?: keyof typeof sizeClass;
  
  dot?: boolean;
  
  uppercase?: boolean;
  className?: string;
}

function StatusBadge({
  tone,
  label,
  size = 'sm',
  dot = false,
  uppercase = false,
  className = '',
}: StatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap',
        sizeClass[size],
        toneClass[tone],
        uppercase ? 'uppercase tracking-wide' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shadow-[0_0_3px_currentColor] ${dotClass[tone]}`}
          aria-hidden
        />
      )}
      {label}
    </span>
  );
}



export default memo(StatusBadge);


export function statusBorderClass(tone: StatusTone): string {
  switch (tone) {
    case 'success':  return 'border-l-status-green';
    case 'warning':  return 'border-l-status-amber';
    case 'danger':   return 'border-l-status-red';
    case 'info':     return 'border-l-status-blue';
    case 'progress': return 'border-l-status-teal';
    case 'special':  return 'border-l-status-purple';
    case 'accent':   return 'border-l-accent';
    case 'neutral':  return 'border-l-line';
  }
}
