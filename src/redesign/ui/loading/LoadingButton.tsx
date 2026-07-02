import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
} from 'react';
import { Check, X } from '@/icons';
import ButtonSpinner from './ButtonSpinner';

export type LoadingButtonPhase = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  phase?: LoadingButtonPhase;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
}

const base = [
  'relative inline-flex items-center justify-center font-semibold whitespace-nowrap select-none',
  'ixn-base ixn-press ixn-focus rounded-xl',
  'focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]',
  'disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50',
  'ix-btn-loading',
].join(' ');

const variants: Record<NonNullable<LoadingButtonProps['variant']>, string> = {
  primary:
    'bg-accent text-[var(--color-on-accent)] shadow-[var(--elevation-1)] hover:bg-accent/95 hover:shadow-[var(--elevation-2)] hover:-translate-y-px',
  secondary:
    'bg-surface-secondary text-content-primary border border-line hover:bg-surface-tertiary hover:border-[var(--ixn-border-hover)] hover:shadow-[var(--elevation-1)]',
  ghost:
    'bg-transparent text-content-secondary hover:bg-surface-secondary hover:text-content-primary',
  outline:
    'border border-line text-content-secondary bg-transparent hover:bg-surface-secondary hover:text-content-primary hover:border-[var(--ixn-border-hover)]',
  danger:
    'bg-status-red text-white shadow-[var(--elevation-1)] hover:shadow-[var(--elevation-2)] hover:bg-status-red/90 active:bg-status-red/80',
  success:
    'bg-status-green text-white shadow-[var(--elevation-1)] hover:shadow-[var(--elevation-2)] hover:bg-status-green/90 active:bg-status-green/80',
};

const sizes: Record<NonNullable<LoadingButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-pm-sm',
  md: 'h-9 px-4 text-pm-md',
  lg: 'h-11 px-5 text-pm-md',
};

function resolvePhase(loading?: boolean, phase?: LoadingButtonPhase): LoadingButtonPhase {
  if (phase != null) return phase;
  return loading ? 'loading' : 'idle';
}

const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      block = false,
      type = 'button',
      className = '',
      children,
      phase: phaseProp,
      loading,
      disabled,
      style,
      ...props
    },
    ref,
  ) => {
    const phase = resolvePhase(loading, phaseProp);
    const labelRef = useRef<HTMLSpanElement>(null);
    const [lockedWidth, setLockedWidth] = useState<number | undefined>();
    const isBusy = phase === 'loading';

    useEffect(() => {
      if (!isBusy || lockedWidth != null) return;
      const w = labelRef.current?.offsetWidth;
      if (w && w > 0) setLockedWidth(w);
    }, [isBusy, lockedWidth]);

    useEffect(() => {
      if (phase === 'idle') setLockedWidth(undefined);
    }, [phase]);

    const flashCls =
      phase === 'success' ? 'ix-btn--success-flash' : phase === 'error' ? 'ix-btn--error-flash' : '';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isBusy}
        aria-busy={isBusy || undefined}
        className={`${base} ${variants[variant]} ${sizes[size]} ${flashCls} ${block ? 'w-full' : ''} ${className}`}
        style={{ ...style, minWidth: lockedWidth ?? style?.minWidth }}
        {...props}
      >
        <span
          ref={labelRef}
          className={`relative z-[1] inline-flex items-center justify-center gap-2 ${isBusy ? 'ix-btn-label--out opacity-0' : ''}`}
        >
          {phase === 'success' && <Check className="h-4 w-4" aria-hidden />}
          {phase === 'error' && <X className="h-4 w-4" aria-hidden />}
          {(phase === 'idle' || phase === 'loading') && children}
        </span>
        {isBusy && (
          <span className="ix-btn-spinner-wrap" aria-hidden>
            <ButtonSpinner />
          </span>
        )}
      </button>
    );
  },
);
LoadingButton.displayName = 'LoadingButton';
export default LoadingButton;
