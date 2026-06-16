




import type { HTMLAttributes, ReactNode } from 'react';

export type GlassCardSize = 'compact' | 'regular' | 'hero';

const PAD: Record<GlassCardSize, string> = { compact: 'p-4', regular: 'p-6', hero: 'p-8' };

const RADIUS: Record<GlassCardSize, string> = { compact: 'rounded-md', regular: 'rounded-lg', hero: 'rounded-lg' };

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  size?: GlassCardSize;
  interactive?: boolean;
  children?: ReactNode;
}

export default function GlassCard({
  size = 'regular', interactive = false, className = '', children, ...rest
}: GlassCardProps) {
  return (
    <div
      className={`surface-card surface-card-elevated ${RADIUS[size]} ${PAD[size]} ${interactive ? 'hover-lift cursor-pointer' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
