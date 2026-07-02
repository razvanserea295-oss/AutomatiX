import type { CSSProperties } from 'react';

const RADIUS: Record<string, string> = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
};

function lineWidth(index: number, total: number): string {
  if (index === total - 1) return '60%';
  const base = 85 + ((index * 17 + total * 3) % 16);
  return `${Math.min(100, base)}%`;
}

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: keyof typeof RADIUS | number | string;
  /** Alias for `borderRadius` (e.g. "sm" | "md" | "lg" | "full" | a CSS length). */
  rounded?: keyof typeof RADIUS | number | string;
  className?: string;
  style?: CSSProperties;
  /** Multi-line text placeholder blocks. */
  lines?: number;
  animated?: boolean;
  waveIndex?: number;
}

/** Shimmer placeholder — decorative; parent should expose loading state to assistive tech. */
export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius,
  rounded,
  className = '',
  style,
  lines,
  animated = true,
  waveIndex,
}: SkeletonProps) {
  const radius = borderRadius ?? rounded ?? 'md';
  const radiusCls =
    typeof radius === 'string' && radius in RADIUS
      ? RADIUS[radius]
      : undefined;
  const radiusStyle =
    typeof radius === 'number'
      ? { borderRadius: radius }
      : typeof radius === 'string' && !(radius in RADIUS)
        ? { borderRadius: radius }
        : undefined;

  if (lines != null && lines > 0) {
    return (
      <span className={`ix-skeleton-lines ${className}`} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className={`ix-skeleton ix-skeleton-line ${animated ? '' : '[animation:none]'}`}
            style={{
              width: lineWidth(i, lines),
              ...(waveIndex != null ? { ['--ix-wave-i' as string]: waveIndex + i } : {}),
            }}
          />
        ))}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`ix-skeleton ds-skeleton-enhanced block ${radiusCls ?? ''} ${animated ? '' : '[animation:none]'} ${className}`}
      style={{
        width,
        height,
        ...radiusStyle,
        ...(waveIndex != null ? { ['--ix-wave-i' as string]: waveIndex } : {}),
        ...style,
      }}
    />
  );
}
