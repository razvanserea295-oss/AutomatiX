import { Loader2 } from '@/icons';

interface PageLoadingShellProps {
  label?: string;
  className?: string;
}

/** Full-page loading placeholder — skeleton + accent spinner. */
export default function PageLoadingShell({ label = 'Se încarcă', className = '' }: PageLoadingShellProps) {
  return (
    <div
      className={`page-loading-shell bg-surface-page flex-1 ${className}`}
      role="status"
      aria-label={label}
    >
      <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden />
      <div className="ds-skeleton h-2 w-32" />
      <div className="ds-skeleton h-2 w-24 opacity-70" />
    </div>
  );
}
