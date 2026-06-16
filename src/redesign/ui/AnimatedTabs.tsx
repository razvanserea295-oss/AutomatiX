






import { useLayoutEffect, useRef, useState, type ComponentType } from 'react';

export interface AnimatedTab {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface AnimatedTabsProps {
  tabs: AnimatedTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function AnimatedTabs({ tabs, active, onChange, className = '' }: AnimatedTabsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active, tabs]);

  return (
    <div
      ref={ref}
      role="tablist"
      className={`relative inline-flex items-center gap-1 rounded-full border border-line/70 bg-surface-secondary p-1 ${className}`}
    >
      <span
        aria-hidden
        className="ds-tab-indicator absolute top-1 bottom-1 rounded-full bg-accent-muted shadow-[var(--elevation-1)]"
        style={{ left: ind.left, width: ind.width }}
      />
      {tabs.map((t) => {
        const Icon = t.icon;
        const on = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            data-tab={t.id}
            onClick={() => onChange(t.id)}
            className={`relative z-[1] inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-pm-xs font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
              on ? 'text-accent' : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
