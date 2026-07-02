import type { ReactNode } from 'react';

export interface SkeletonGroupProps {
  children: ReactNode;
  className?: string;
  wave?: boolean;
}

/** Stagger skeleton children with 0 / 150 / 300ms shimmer wave delays. */
export default function SkeletonGroup({ children, className = '', wave = true }: SkeletonGroupProps) {
  return (
    <div
      className={`${wave ? 'ix-skeleton-wave' : ''} ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}
