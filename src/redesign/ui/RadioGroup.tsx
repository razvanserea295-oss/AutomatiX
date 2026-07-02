import { createContext, forwardRef, useContext, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface RadioGroupContextValue {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function RadioGroup({
  name: nameProp,
  value: valueProp,
  defaultValue,
  onValueChange,
  disabled,
  className,
  children,
}: RadioGroupProps) {
  const autoName = useId();
  const name = nameProp ?? autoName;
  const [internal, setInternal] = useState(defaultValue);
  const value = valueProp ?? internal;

  const handleChange = (next: string) => {
    if (valueProp === undefined) setInternal(next);
    onValueChange?.(next);
  };

  return (
    <RadioGroupContext.Provider value={{ name, value, onValueChange: handleChange, disabled }}>
      <div role="radiogroup" className={cn('flex flex-col gap-2', className)}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioItemProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'name' | 'onChange'> {
  value: string;
  label?: string;
}

export const RadioItem = forwardRef<HTMLInputElement, RadioItemProps>(
  ({ value, label, className, id, disabled, ...props }, ref) => {
    const ctx = useContext(RadioGroupContext);
    if (!ctx) throw new Error('RadioItem must be used within RadioGroup');

    const inputId = id ?? `${ctx.name}-${value}`;
    const checked = ctx.value === value;
    const isDisabled = disabled ?? ctx.disabled;

    return (
      <label htmlFor={inputId} className={cn('ds-radio-root', isDisabled && 'opacity-40', className)}>
        <span className="ds-radio" data-state={checked ? 'checked' : 'unchecked'}>
          <span className="ds-radio__dot" />
        </span>
        <input
          ref={ref}
          type="radio"
          id={inputId}
          name={ctx.name}
          value={value}
          checked={checked}
          disabled={isDisabled}
          className="sr-only"
          onChange={() => ctx.onValueChange?.(value)}
          {...props}
        />
        {label && <span className="text-ds-sm text-ds-primary select-none">{label}</span>}
      </label>
    );
  },
);
RadioItem.displayName = 'RadioItem';

export default RadioGroup;
