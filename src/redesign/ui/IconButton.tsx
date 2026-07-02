import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { IconTooltip, TooltipProvider } from '@/redesign/ui/Tooltip';
import { cn } from '@/lib/cn';

type Intent = 'default' | 'primary' | 'danger' | 'success' | 'warning';
type Size = 'sm' | 'md';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: Intent;
  size?: Size;
  /** Tooltip label — strongly recommended for icon-only buttons */
  tooltip?: string;
  children: ReactNode;
}

const intent: Record<Intent, string> = {
  default: 'hover:bg-surface-tertiary hover:text-content-primary',
  primary: 'hover:bg-accent-muted hover:text-accent',
  danger: 'hover:bg-status-red/10 hover:text-status-red',
  success: 'hover:bg-status-green/10 hover:text-status-green',
  warning: 'hover:bg-status-amber/10 hover:text-status-amber',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-8 w-8 [&>svg]:h-3.5 [&>svg]:w-3.5',
  md: 'h-9 w-9 [&>svg]:h-4 [&>svg]:w-4',
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ intent: i = 'default', size: s = 'md', tooltip, type = 'button', className = '', children, disabled, ...rest }, ref) => {
    const button = (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'ds-btn ds-btn--ghost ds-btn--icon inline-flex shrink-0 items-center justify-center rounded-xl',
          'text-content-muted active:scale-95 [&>svg]:pointer-events-none [&>svg]:shrink-0',
          'focus-visible:outline-none focus-visible:shadow-[var(--ring-default)]',
          'disabled:pointer-events-none disabled:opacity-30',
          sizeClass[s],
          intent[i],
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );

    if (!tooltip) return button;

    return (
      <TooltipProvider>
        <IconTooltip label={tooltip} disabled={disabled}>
          {button}
        </IconTooltip>
      </TooltipProvider>
    );
  },
);
IconButton.displayName = 'IconButton';
export default IconButton;
