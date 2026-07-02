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
  title, subtitle, icon: Icon, breadcrumb, actions, children, className = '', style,
}: HeroHeaderProps) {
  return (
    <header
      className={`hero-header shrink-0 flex flex-col pb-3 border-b border-line/60 anim-slide-up ${className}`}
      style={style}
    >
      {breadcrumb && <div className="mb-2 text-pm-xs text-content-muted">{breadcrumb}</div>}
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        {Icon && (
          <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {title && <h1 className="text-pm-2xl font-semibold text-content-primary truncate leading-tight">{title}</h1>}
          {subtitle && <p className="mt-1 text-pm-sm text-content-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children && <div className="mt-3 pt-3 border-t border-line/60">{children}</div>}
    </header>
  );
}
