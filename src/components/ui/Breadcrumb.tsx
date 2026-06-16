











import { Fragment, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

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
                <li className="text-content-muted/70 px-1 select-none" aria-hidden>…</li>
                <li aria-hidden><ChevronRight className="h-3 w-3 text-content-muted/50" /></li>
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
                    className="rounded px-1.5 py-0.5 text-content-secondary hover:text-content-primary hover:bg-surface-tertiary/50 transition-colors truncate max-w-[160px] focus-ring-soft"
                  >
                    {seg.label}
                  </button>
                ) : (
                  <span className={`px-1.5 py-0.5 truncate max-w-[160px] inline-block align-bottom ${
                    isLast ? 'text-content-primary font-medium' : 'text-content-secondary'
                  }`}>
                    {seg.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li aria-hidden>
                  <ChevronRight className="h-3 w-3 text-content-muted/50" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
