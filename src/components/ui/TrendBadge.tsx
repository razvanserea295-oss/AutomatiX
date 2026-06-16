



import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface TrendBadgeProps {
  
  value: number;
  direction?: 'up' | 'down' | 'flat';
  pill?: boolean;
  
  suffix?: string;
  className?: string;
}

export default function TrendBadge({ value, direction, pill = false, suffix, className = '' }: TrendBadgeProps) {
  const dir = direction ?? (value > 0 ? 'up' : value < 0 ? 'down' : 'flat');
  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus;
  const color = dir === 'up' ? 'text-status-green' : dir === 'down' ? 'text-status-red' : 'text-content-muted';
  const bg = dir === 'up' ? 'bg-status-green/12' : dir === 'down' ? 'bg-status-red/12' : 'bg-surface-tertiary/50';
  const label = `${value > 0 ? '+' : ''}${value.toLocaleString('ro-RO', { maximumFractionDigits: 1 })}%`;

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${color} ${pill ? `rounded-full px-3 py-1 text-pm-sm ${bg}` : 'text-pm-xs'} ${className}`}>
      <Icon className="h-4 w-4" /> {label}
      {suffix && <span className="font-normal text-content-muted">{suffix}</span>}
    </span>
  );
}
