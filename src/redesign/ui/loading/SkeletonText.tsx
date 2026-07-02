import Skeleton from './Skeleton';

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
  animated?: boolean;
  waveIndex?: number;
}

/** Multi-line text placeholder — last line 60%, others 85–100%. */
export default function SkeletonText({
  lines = 3,
  className = '',
  animated = true,
  waveIndex,
}: SkeletonTextProps) {
  return (
    <Skeleton
      lines={lines}
      animated={animated}
      waveIndex={waveIndex}
      className={className}
    />
  );
}
