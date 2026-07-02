import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from '@/icons';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '@/lib/cn';

export interface CheckboxProps extends ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: string;
}

const Checkbox = forwardRef<ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, label, id, checked, ...props }, ref) => (
    <label
      htmlFor={id}
      className={cn('ds-checkbox-root', props.disabled && 'opacity-40', className)}
    >
      <CheckboxPrimitive.Root ref={ref} id={id} className="ds-checkbox" checked={checked} {...props}>
        <CheckboxPrimitive.Indicator className="ds-checkbox__indicator flex items-center justify-center text-[var(--accent-fg)]">
          {checked === 'indeterminate' ? (
            <Minus className="h-3 w-3" strokeWidth={3} />
          ) : (
            <Check className="ds-checkbox__check h-3 w-3" strokeWidth={3} />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label && <span className="text-ds-sm text-ds-primary select-none">{label}</span>}
    </label>
  ),
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
export default Checkbox;
