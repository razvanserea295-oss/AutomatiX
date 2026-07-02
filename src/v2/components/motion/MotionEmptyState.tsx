import type { LucideIcon } from '@/icons';
import type { ReactNode } from 'react';
import { Button } from '@/v2/components/ui/button';
import { cn } from '@/v2/lib/cn';

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
  className?: string;
};

export default function MotionEmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: Props) {
  return (
    <div className={cn('relative flex flex-col items-center gap-3 py-12 text-center', className)}>
      <div className="relative">
        <div className="v2-empty-glow" aria-hidden />
        <div className="v2-empty-icon relative rounded-full bg-muted p-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Button
          size="sm"
          className="v2-animate-pop motion-cta-attention"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}
