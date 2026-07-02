import { AlertTriangle } from '@/icons';
import type { ReactNode } from 'react';
import Button from '@/redesign/ui/Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
  centered?: boolean;
}

/** Failed-to-load state — static amber icon, retry CTA. */
export default function ErrorState({
  title = 'Nu s-au putut încărca datele',
  description,
  onRetry,
  action,
  className = '',
  centered = true,
}: ErrorStateProps) {
  return (
    <div
      className={`ix-designed-empty flex flex-col items-center text-center py-12 px-6 ${centered ? 'flex-1 justify-center' : ''} ${className}`}
      role="alert"
    >
      <span className="ix-error-state-icon mb-4">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <p className="text-pm-md font-semibold text-content-primary max-w-sm break-words">{title}</p>
      {description && (
        <p className="mt-1 text-pm-xs text-content-muted max-w-sm break-words font-mono">{description}</p>
      )}
      {(onRetry || action) && (
        <div className="mt-4">
          {action ?? (
            <Button variant="outline" size="md" onClick={onRetry}>
              Reîncearcă
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
