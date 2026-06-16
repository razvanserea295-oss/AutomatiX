







import type { CSSProperties } from 'react';


const R = { sm: 'rounded-md', md: 'rounded-lg', lg: 'rounded-xl', full: 'rounded-full' } as const;

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: keyof typeof R;
  className?: string;
  style?: CSSProperties;
}

export default function Skeleton({ width = '100%', height = 16, rounded = 'md', className = '', style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`ds-skeleton block ${R[rounded]} ${className}`}
      style={{ width, height, ...style }}
    />
  );
}
