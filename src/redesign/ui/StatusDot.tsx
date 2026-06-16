







export type StatusDotTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const TONE: Record<StatusDotTone, string> = {
  success: 'bg-status-green',
  danger: 'bg-status-red',
  warning: 'bg-status-amber',
  info: 'bg-status-blue',
  neutral: 'bg-content-muted',
};

export interface StatusDotProps {
  tone?: StatusDotTone;
  pulse?: boolean;
  label?: string;
  className?: string;
}

export default function StatusDot({ tone = 'neutral', pulse = false, label, className = '' }: StatusDotProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`relative inline-flex h-2 w-2 rounded-full ${TONE[tone]} ring-2 ring-surface-primary shadow-[var(--elevation-1)]`}>
        {pulse && (
          <span
            className={`absolute inset-0 rounded-full ${TONE[tone]} opacity-60 animate-ping motion-reduce:animate-none`}
            aria-hidden
          />
        )}
      </span>
      {label && <span className="text-pm-xs font-medium text-content-secondary">{label}</span>}
    </span>
  );
}
