import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type GlassCardSize = 'compact' | 'regular' | 'hero';

const PAD: Record<GlassCardSize, string> = { compact: 'p-4', regular: 'p-5 sm:p-6', hero: 'p-6 sm:p-8' };

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  size?: GlassCardSize;
  interactive?: boolean;
  selected?: boolean;
  vtName?: string;
  children?: ReactNode;
}

/** Solid card surface — legacy name kept for API compatibility. */
export default function GlassCard({
  size = 'regular',
  interactive = false,
  selected = false,
  className = '',
  vtName,
  style,
  children,
  ...rest
}: GlassCardProps) {
  return (
    <div
      className={cn(
        'ds-card pm-card surface-card flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-line/60 bg-surface-primary',
        PAD[size],
        interactive && 'ds-card--interactive card-interactive ixn-focus cursor-pointer',
        selected && 'ds-card--selected',
        vtName && 'vt-morph',
        className,
      )}
      style={vtName ? ({ viewTransitionName: vtName, ...style } as CSSProperties) : style}
      {...rest}
    >
      {children}
    </div>
  );
}
