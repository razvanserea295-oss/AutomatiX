












import { Fragment, type ReactNode } from 'react';
import { ChevronRight } from '@/icons';

export interface BreadcrumbSegment {
  label: ReactNode;
  onClick?: () => void;
}

interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
  
  maxVisible?: number;
  className?: string;
}

export default function Breadcrumb({
  segments,
  maxVisible = 3,
  className = '',
}: BreadcrumbProps) {
  if (segments.length === 0) return null;

  
  
  
  const visible: (BreadcrumbSegment | { ellipsis: true })[] =
    segments.length <= maxVisible
      ? segments
      : [
          segments[0],
          { ellipsis: true },
          ...segments.slice(-(maxVisible - 1)),
        ];

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1 text-pm-xs min-w-0 ${className}`}>
      <ol className="flex items-center gap-1 min-w-0">
        {visible.map((seg, i) => {
          const isLast = i === visible.length - 1;
          if ('ellipsis' in seg) {
            return (
              <Fragment key={`ellipsis-${i}`}>
                <li className="text-content-muted px-2 select-none" aria-hidden>…</li>
                <li aria-hidden><ChevronRight className="h-3.5 w-3.5 text-content-muted/60" /></li>
              </Fragment>
            );
          }

          return (
            <Fragment key={i}>
              <li className="min-w-0">
                {seg.onClick && !isLast ? (
                  <button
                    type="button"
                    onClick={seg.onClick}
                    className="rounded-lg px-2 py-1 text-content-secondary hover:text-content-primary hover:bg-surface-tertiary transition-smooth duration-150 active:scale-[0.98] truncate max-w-[160px] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
                  >
                    {seg.label}
                  </button>
                ) : (
                  <span className={`px-2 py-1 truncate max-w-[160px] inline-block align-bottom ${
                    isLast ? 'text-content-primary font-semibold' : 'text-content-secondary'
                  }`}>
                    {seg.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li aria-hidden>
                  <ChevronRight className="h-3.5 w-3.5 text-content-muted/60" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
