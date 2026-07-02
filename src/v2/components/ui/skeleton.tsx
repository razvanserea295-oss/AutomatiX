import { cn } from '@/v2/lib/cn';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('v2-skeleton', className)} {...props} />;
}

export { Skeleton };
