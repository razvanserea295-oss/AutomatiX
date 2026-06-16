



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
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`relative inline-flex h-2 w-2 rounded-full ${TONE[tone]}`}>
        {pulse && <span className={`absolute inset-0 rounded-full ${TONE[tone]} opacity-60 animate-ping motion-reduce:animate-none`} />}
      </span>
      {label && <span className="text-pm-xs text-content-secondary">{label}</span>}
    </span>
  );
}
