



import type { ReactNode, ComponentType } from 'react';

export interface SectionHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}

export default function SectionHeader({ title, eyebrow, meta, actions, icon: Icon, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="text-pm-2xs font-semibold uppercase tracking-[0.14em] text-content-secondary mb-1">{eyebrow}</p>}
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <span className="h-7 w-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <h2 className="text-pm-lg font-semibold text-content-primary truncate">{title}</h2>
        </div>
        {meta && <p className="mt-0.5 text-pm-sm text-content-muted">{meta}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
