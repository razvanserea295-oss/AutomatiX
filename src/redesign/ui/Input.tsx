import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import { Search, X } from '@/icons';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  floatingLabel?: boolean;
  error?: string | null;
  shakeOnError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, floatingLabel, error, shakeOnError, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;

    if (floatingLabel && label) {
      return (
        <div className={cn('ds-input-wrap ds-input-floating', props.value && 'ds-input-floating--active')}>
          <input
            ref={ref}
            id={inputId}
            placeholder=" "
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              'ds-input',
              error && shakeOnError && 'ds-input--shake',
              className,
            )}
            {...props}
          />
          <label htmlFor={inputId} className="ds-input-floating__label">
            {label}
          </label>
          {error && (
            <p id={errorId} className={cn('ds-input-error', error && 'ds-input-error--visible')} role="alert">
              {error}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="ds-input-wrap">
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-ds-sm font-medium text-ds-primary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn('ds-input', error && shakeOnError && 'ds-input--shake', className)}
          {...props}
        />
        {error && (
          <p id={errorId} className={cn('ds-input-error', error && 'ds-input-error--visible')} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export interface SearchInputProps extends Omit<InputProps, 'type'> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, defaultValue, onClear, onChange, ...props }, ref) => {
    const [internal, setInternal] = useState(String(defaultValue ?? ''));
    const current = value !== undefined ? String(value) : internal;
    const hasValue = current.length > 0;

    return (
      <div className={cn('ds-search', hasValue && 'ds-search--has-value')}>
        <Search className="ds-search__icon" aria-hidden />
        <input
          ref={ref}
          type="search"
          value={value}
          defaultValue={defaultValue}
          className={cn('ds-input', className)}
          onChange={(e) => {
            if (value === undefined) setInternal(e.target.value);
            onChange?.(e);
          }}
          {...props}
        />
        {hasValue && (
          <button
            type="button"
            className="ds-search__clear inline-flex h-6 w-6 items-center justify-center rounded-md text-ds-muted hover:text-ds-primary"
            aria-label="Șterge căutarea"
            onClick={() => {
              if (value === undefined) setInternal('');
              onClear?.();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = 'SearchInput';

export default Input;
