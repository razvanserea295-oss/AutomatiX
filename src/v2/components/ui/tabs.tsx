import { useRef, useState, useEffect, type ReactNode } from 'react';
import { cn } from '@/v2/lib/cn';

export function Tabs({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-[var(--density-gap-card)]', className)}>{children}</div>;
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const update = () => {
      const active = list.querySelector<HTMLElement>('[data-tab-active="true"]');
      if (!active) return;
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(list);
    list.addEventListener('click', update);
    return () => {
      ro.disconnect();
      list.removeEventListener('click', update);
    };
  }, [children]);

  return (
    <div
      ref={listRef}
      className={cn(
        'relative inline-flex items-center rounded-lg border bg-muted p-0.5 text-muted-foreground h-[var(--density-tabs-h)]',
        className,
      )}
    >
      <span
        className="absolute top-0.5 bottom-0.5 rounded-md bg-background shadow-sm transition-[left,width] duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ left: indicator.left, width: indicator.width }}
        aria-hidden
      />
      {children}
    </div>
  );
}

export function TabsTrigger({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-tab-active={active ? 'true' : 'false'}
      onClick={onClick}
      className={cn(
        'relative z-[1] inline-flex h-full items-center justify-center rounded-md font-medium transition-colors duration-150 px-[var(--density-tabs-px)] text-[length:var(--density-fs-btn)]',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

export function TabsPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('v2-tab-panel-enter', className)}>{children}</div>;
}
