import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from '@/icons';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success' | 'link';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  iconOnly?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: 'ds-btn--primary',
  secondary: 'ds-btn--secondary',
  ghost: 'ds-btn--ghost',
  outline: 'ds-btn--secondary',
  danger: 'ds-btn--danger',
  success: 'ds-btn--success',
  link: 'ds-btn--link',
};

const sizeClass: Record<Size, string> = {
  xs: 'ds-btn--xs',
  sm: 'ds-btn--sm',
  md: 'ds-btn--md',
  lg: 'ds-btn--lg',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      block = false,
      loading = false,
      iconOnly = false,
      type = 'button',
      className = '',
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'ds-btn ixn-base ixn-press',
        variantClass[variant],
        sizeClass[size],
        iconOnly && 'ds-btn--icon',
        loading && 'ds-btn--loading',
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="ds-btn__spinner" aria-hidden />
          {!iconOnly && <span className="sr-only">{children as ReactNode}</span>}
        </>
      ) : (
        children
      )}
    </button>
  ),
);
Button.displayName = 'Button';
export default Button;
