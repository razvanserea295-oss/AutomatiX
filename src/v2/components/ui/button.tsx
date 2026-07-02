import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from '@/icons';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/v2/lib/cn';

const buttonVariants = cva(
  'ds-btn ixn-base inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold focus-visible:outline-none disabled:pointer-events-none [&_svg]:h-4 [&_svg]:w-4',
  {
    variants: {
      variant: {
        default: 'ds-btn--primary',
        destructive: 'ds-btn--danger',
        outline: 'ds-btn--secondary',
        secondary: 'ds-btn--secondary',
        ghost: 'ds-btn--ghost',
        link: 'ds-btn--link',
        success: 'ds-btn--success',
      },
      size: {
        default: 'ds-btn--md',
        xs: 'ds-btn--xs',
        sm: 'ds-btn--sm',
        lg: 'ds-btn--lg',
        icon: 'ds-btn--md ds-btn--icon',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), loading && 'ds-btn--loading')}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="ds-btn__spinner" aria-hidden />
            <span className="sr-only">{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
