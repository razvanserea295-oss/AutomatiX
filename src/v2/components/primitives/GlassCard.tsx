





import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export type GlassCardSize = 'compact' | 'regular' | 'hero';

const PAD: Record<GlassCardSize, string> = { compact: 'p-4', regular: 'p-5 sm:p-6', hero: 'p-6 sm:p-8' };

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  size?: GlassCardSize;
  interactive?: boolean;
  vtName?: string;
  children?: ReactNode;
}

/** Legacy alias — unified Card surface (polished SaaS tokens). */
export default function GlassCard({
  size = 'regular', interactive = false, className = '', vtName, style, children, ...rest
}: GlassCardProps) {
  return (
    <div
      className={`pm-panel pm-card surface-card ixn-border-hover flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-line/60 bg-surface-primary ${PAD[size]} ${interactive ? 'card-interactive ixn-focus cursor-pointer' : ''} ${vtName ? 'vt-morph' : ''} ${className}`}
      style={vtName ? ({ viewTransitionName: vtName, ...style } as CSSProperties) : style}
      {...rest}
    >
      {children}
    </div>
  );
}
