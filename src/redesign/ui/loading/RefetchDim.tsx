import type { ReactNode } from 'react';
import { useRefetchLoading } from '@/redesign/lib/loading';
import PanelProgressBar from './PanelProgressBar';

export interface RefetchDimProps {
  isFetching: boolean;
  children: ReactNode;
  className?: string;
}

/** Dims panel content to 60% opacity during background refetch. */
export default function RefetchDim({ isFetching, children, className = '' }: RefetchDimProps) {
  const { showBar, isComplete } = useRefetchLoading(isFetching);
  return (
    <div className={`ix-panel-progress-host ix-refetch-dim ${isFetching ? 'ix-refetch-dim--active' : ''} ${className}`}>
      <PanelProgressBar active={showBar} complete={isComplete} />
      {children}
    </div>
  );
}
