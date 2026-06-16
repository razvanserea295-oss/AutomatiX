





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
    <div className={`flex items-start justify-between gap-4 mb-5 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-pm-eyebrow text-content-muted mb-1.5 flex items-center gap-2">
            <span className="inline-block h-px w-3.5 bg-surface-tertiary" aria-hidden />
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <h2 className="text-pm-lg font-semibold text-content-primary truncate leading-tight">{title}</h2>
        </div>
        {meta && <p className="mt-1 text-pm-sm text-content-muted">{meta}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
