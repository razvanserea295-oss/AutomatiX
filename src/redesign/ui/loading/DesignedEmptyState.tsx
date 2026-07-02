import type { ReactNode, ComponentType } from 'react';

export interface DesignedEmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  centered?: boolean;
}

/** Premium empty state — floating icon, radial glow, CTA attention pulse. */
export default function DesignedEmptyState({
  icon: Icon,
  title,
  description,
  action,
  centered = true,
  className = '',
}: DesignedEmptyStateProps) {
  const alignCls = centered ? 'justify-center min-h-[200px]' : 'justify-start min-h-[168px]';
  return (
    <div className={`ix-designed-empty anim-scale-in flex w-full flex-col items-center px-6 py-10 ${alignCls} ${className}`}>
      {Icon && (
        <div className="ix-designed-empty-icon-wrap">
          <div className="ix-designed-empty-glow" aria-hidden />
          <span className="ix-designed-empty-icon">
            <Icon />
          </span>
        </div>
      )}
      <p className="max-w-sm text-pm-md font-semibold text-content-primary break-words">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-pm-sm text-content-muted break-words">{description}</p>
      )}
      {action && <div className="mt-4 ix-designed-empty-cta--pulse">{action}</div>}
    </div>
  );
}
