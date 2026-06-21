import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  
  block?: boolean;
}






const base = [
  'relative inline-flex items-center justify-center font-semibold whitespace-nowrap select-none',
  'rounded-xl transition-smooth duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]',
  'focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]',
  'active:scale-[0.98]',
  'disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50',
].join(' ');

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-[var(--color-on-accent)] shadow-[var(--elevation-1)] hover:bg-accent/95 hover:shadow-[var(--elevation-2)] focus-visible:shadow-[var(--ring-soft)]',
  secondary:
    'bg-surface-secondary text-content-primary border border-line hover:bg-surface-tertiary hover:shadow-[var(--shadow-soft-sm)] focus-visible:shadow-[var(--ring-soft)]',
  ghost:
    'bg-transparent text-content-secondary hover:bg-surface-secondary hover:text-content-primary focus-visible:shadow-[var(--ring-soft)]',
  outline:
    'border border-line text-content-secondary bg-transparent hover:bg-surface-secondary hover:text-content-primary hover:border-line/80 focus-visible:shadow-[var(--ring-soft)]',
  danger:
    'bg-status-red text-white shadow-[var(--elevation-1)] hover:shadow-[var(--elevation-2)] hover:bg-status-red/90 active:bg-status-red/80 focus-visible:shadow-[var(--ring-soft)]',
  success:
    'bg-status-green text-white shadow-[var(--elevation-1)] hover:shadow-[var(--elevation-2)] hover:bg-status-green/90 active:bg-status-green/80 focus-visible:shadow-[var(--ring-soft)]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-pm-sm',
  md: 'h-9 px-4 text-pm-md',
  lg: 'h-11 px-5 text-pm-md',
};

const contentGaps: Record<Size, string> = {
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-2',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', block = false, type = 'button', className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
      {...props}
    >
      <span className={`relative z-[1] inline-flex items-center justify-center ${contentGaps[size]}`}>
        {children}
      </span>
    </button>
  ),
);
Button.displayName = 'Button';
export default Button;
