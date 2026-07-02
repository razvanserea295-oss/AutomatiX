import { cn } from '@/v2/lib/cn';

type Props = {
  /** When true, shows pulsing ring (online / live) */
  live?: boolean;
  /** Tailwind color class for the dot, e.g. `bg-emerald-500` */
  colorClass?: string;
  className?: string;
  label?: string;
};

export default function LiveStatusDot({
  live = false,
  colorClass = 'bg-emerald-500',
  className,
  label,
}: Props) {
  return (
    <span
      className={cn('relative inline-flex h-2.5 w-2.5 shrink-0', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <span className={cn('h-full w-full rounded-full', colorClass, live && 'v2-status-live')} />
    </span>
  );
}
