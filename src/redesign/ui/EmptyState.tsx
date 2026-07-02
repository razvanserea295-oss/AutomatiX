import { useEffect, useState, type ReactNode, type ComponentType } from 'react';
import Button from '@/redesign/ui/Button';

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Shorthand CTA — renders primary button with attention pulse after 1.5s */
  ctaLabel?: string;
  onCta?: () => void;
  className?: string;
  /** Vertically center inside a tall panel */
  centered?: boolean;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  ctaLabel,
  onCta,
  centered = false,
  className = '',
}: EmptyStateProps) {
  const [ctaPulse, setCtaPulse] = useState(false);

  useEffect(() => {
    if (!ctaLabel && !action) return;
    const t = window.setTimeout(() => setCtaPulse(true), 1500);
    return () => window.clearTimeout(t);
  }, [ctaLabel, action]);

  const cta =
    action ??
    (ctaLabel && onCta ? (
      <Button
        variant="primary"
        size="md"
        onClick={onCta}
        className={ctaPulse ? 'ix-designed-empty-cta--pulse' : ''}
      >
        {ctaLabel}
      </Button>
    ) : null);

  return (
    <div
      className={`ix-designed-empty min-h-[168px] w-full px-6 py-10 ${centered ? 'justify-center flex-1' : ''} ${className}`}
    >
      {Icon && (
        <div className="ix-designed-empty-icon-wrap">
          <div className="ix-designed-empty-glow" aria-hidden />
          <span className="ix-designed-empty-icon">
            <Icon className="h-6 w-6" />
          </span>
        </div>
      )}
      <p className="max-w-sm text-pm-md font-semibold text-content-primary break-words">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-pm-sm text-content-muted break-words">{description}</p>
      )}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
