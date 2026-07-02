import type { ReactNode } from 'react';
import { useRefetchLoading } from '@/redesign/lib/loading';

export interface PanelRefetchOverlayProps {
  isFetching: boolean;
  children: ReactNode;
  className?: string;
  dim?: boolean;
}

/**
 * Inline refetch — keeps content visible, dims to 60%, shows 2px progress bar at top.
 * Never replaces content with skeleton on refetch.
 */
export default function PanelRefetchOverlay({
  isFetching,
  children,
  className = '',
  dim = true,
}: PanelRefetchOverlayProps) {
  const { showBar, isComplete } = useRefetchLoading(isFetching);

  return (
    <div className={`ix-panel-progress-host ${className}`}>
      {showBar && (
        <div
          className={`ix-panel-progress ${isComplete ? 'ix-panel-progress--done' : ''}`}
          aria-hidden
        />
      )}
      <div className={`ix-refetch-dim ${dim && isFetching ? 'ix-refetch-dim--active' : ''}`}>
        {children}
      </div>
    </div>
  );
}
