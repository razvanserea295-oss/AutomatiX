





import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export type GlassCardSize = 'compact' | 'regular' | 'hero';

const PAD: Record<GlassCardSize, string> = { compact: 'p-4', regular: 'p-6', hero: 'p-8' };

const RADIUS: Record<GlassCardSize, string> = { compact: 'rounded-2xl', regular: 'rounded-2xl', hero: 'rounded-2xl' };

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  size?: GlassCardSize;
  interactive?: boolean;
  
  vtName?: string;
  children?: ReactNode;
}

export default function GlassCard({
  size = 'regular', interactive = false, className = '', vtName, style, children, ...rest
}: GlassCardProps) {
  return (
    <div
      className={`pm-card pm-card-pad surface-card surface-card-elevated bg-surface-elevated border border-line ${RADIUS[size]} ${PAD[size]} ${interactive ? 'card-interactive cursor-pointer transition-smooth duration-150 active:scale-[0.99]' : ''} ${vtName ? 'vt-morph' : ''} ${className}`}
      style={vtName ? ({ viewTransitionName: vtName, ...style } as CSSProperties) : style}
      {...rest}
    >
      {children}
    </div>
  );
}
