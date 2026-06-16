






import type { ReactNode, ComponentType, CSSProperties } from 'react';

export interface HeroHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  
  eyebrow?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function HeroHeader({
  title, subtitle, eyebrow, icon: Icon, breadcrumb, actions, children, className = '', style,
}: HeroHeaderProps) {
  return (
    <header
      className={`surface-card surface-card-elevated rounded-xl px-8 py-7 min-h-[128px] flex flex-col justify-center border-l-2 border-line/70 ${className}`}
      style={style}
    >
      {breadcrumb && <div className="mb-3 text-pm-xs text-content-muted">{breadcrumb}</div>}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          {Icon && (
            <span className="h-14 w-14 rounded-2xl bg-surface-tertiary flex items-center justify-center shrink-0">
              <Icon className="h-6 w-6 text-content-primary" />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="text-pm-2xs font-bold uppercase tracking-[0.16em] text-accent/80 mb-1">{eyebrow}</p>}
            <h1 className="text-display-lg font-semibold text-content-primary truncate">{title}</h1>
            {subtitle && <p className="mt-1.5 text-pm-sm text-content-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0 self-start">{actions}</div>}
      </div>
      {children && <div className="mt-4 pt-4 border-t border-line/40">{children}</div>}
    </header>
  );
}
