import { forwardRef, useState, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, defaultChecked, onCheckedChange, label, disabled, id, ...props }, ref) => {
    const [internal, setInternal] = useState(defaultChecked ?? false);
    const isChecked = checked ?? internal;

    const toggle = () => {
      if (disabled) return;
      const next = !isChecked;
      if (checked === undefined) setInternal(next);
      onCheckedChange?.(next);
    };

    return (
      <label htmlFor={id} className={cn('inline-flex items-center gap-2', disabled && 'opacity-40', className)}>
        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={isChecked}
          disabled={disabled}
          className="ds-switch"
          data-state={isChecked ? 'checked' : 'unchecked'}
          onClick={toggle}
          {...props}
        >
          <span className="ds-switch__thumb" />
        </button>
        {label && <span className="text-ds-sm text-ds-primary select-none">{label}</span>}
      </label>
    );
  },
);
Switch.displayName = 'Switch';

export { Switch };
export default Switch;
