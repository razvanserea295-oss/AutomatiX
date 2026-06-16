


















import type { ReactNode } from 'react';

interface UISurfaceLayerProps {
  children: ReactNode;
  className?: string;
}

export default function UISurfaceLayer({ children, className = '' }: UISurfaceLayerProps) {
  return (
    <div data-ui-surface className={`relative isolate z-0 flex min-h-0 flex-1 flex-col ${className}`}>
      {children}
    </div>
  );
}
