










import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Intent = 'default' | 'primary' | 'danger' | 'success' | 'warning';
type Size = 'sm' | 'md';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: Intent;
  size?: Size;
  children: ReactNode; 
}

const intent: Record<Intent, string> = {
  default: 'hover:bg-surface-tertiary hover:text-content-primary',
  primary: 'hover:bg-accent/10 hover:text-accent',
  danger:  'hover:bg-status-red/10 hover:text-status-red',
  success: 'hover:bg-status-green/10 hover:text-status-green',
  warning: 'hover:bg-status-amber/10 hover:text-status-amber',
};

const size: Record<Size, string> = {
  sm: 'p-1 [&>svg]:h-3 [&>svg]:w-3',
  md: 'p-1.5 [&>svg]:h-3.5 [&>svg]:w-3.5',
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ intent: i = 'default', size: s = 'md', type = 'button', className = '', children, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={[
        'inline-flex items-center justify-center rounded-md transition-smooth duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'text-content-muted active:scale-95',
        'focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]',
        'disabled:pointer-events-none disabled:opacity-40',
        size[s],
        intent[i],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = 'IconButton';
export default IconButton;
