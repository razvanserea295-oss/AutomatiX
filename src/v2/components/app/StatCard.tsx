import type { LucideIcon } from '@/icons';
import { Card, CardContent } from '@/v2/components/ui/card';
import CountUp from '@/v2/components/motion/CountUp';
import { cn } from '@/v2/lib/cn';

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
  animateValue,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
  animateValue?: boolean;
}) {
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, ''));
  const canCount = animateValue !== false && !Number.isNaN(numeric) && typeof value === 'number';

  return (
    <Card className={cn('v2-animate-kpi density-kpi shadow-none overflow-hidden', className)}>
      <CardContent className="flex h-full items-center justify-between p-0">
        <div className="min-w-0 space-y-0.5">
          <p className="density-kpi-label text-muted-foreground truncate">{label}</p>
          <p className="density-kpi-value text-foreground truncate">
            {canCount ? <CountUp value={numeric} /> : value}
          </p>
          {hint && (
            <p className="density-meta text-muted-foreground line-clamp-1">{hint}</p>
          )}
        </div>
        {Icon && (
          <div className="shrink-0 rounded-md bg-primary/10 p-1.5 text-primary">
            <Icon className="h-4 w-4" style={{ width: 'var(--density-icon)', height: 'var(--density-icon)' }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
