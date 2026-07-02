import { Save, Loader2, CheckCircle2, AlertCircle } from '@/icons';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SaveButtonProps {
  onClick: () => void;
  state: SaveState;
  disabled?: boolean;
  label?: string;
  savedLabel?: string;
  className?: string;
}








const stateStyles: Record<SaveState, string> = {
  idle:   'bg-accent text-[var(--color-on-accent)] shadow-[var(--elevation-1)] hover:bg-accent/95 active:brightness-95',
  saving: 'bg-accent/90 text-[var(--color-on-accent)] shadow-[var(--elevation-1)]',
  saved:  'bg-status-green text-white shadow-[var(--elevation-1)] hover:bg-status-green/90',
  error:  'bg-status-red text-white shadow-[var(--elevation-1)] hover:bg-status-red/90',
};

const stateIcons: Record<SaveState, typeof Save> = {
  idle:   Save,
  saving: Loader2,
  saved:  CheckCircle2,
  error:  AlertCircle,
};

const stateLabels: Record<SaveState, string> = {
  idle:   'Salvează',
  saving: 'Salvează',
  saved:  'Salvat!',
  error:  'Eroare!',
};

export default function SaveButton({
  onClick,
  state,
  disabled = false,
  label,
  savedLabel,
  className = '',
}: SaveButtonProps) {
  const Icon = stateIcons[state];
  const text = state === 'idle' && label
    ? label
    : state === 'saved' && savedLabel
    ? savedLabel
    : stateLabels[state];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || state === 'saving'}
      className={`relative shrink-0 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-pm-sm font-semibold whitespace-nowrap select-none transition-smooth duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50 ${stateStyles[state]} ${className}`}
    >
      <span key={state} className="relative z-[1] inline-flex items-center justify-center gap-1.5 anim-fade-in">
        <Icon className={`h-4 w-4 shrink-0 ${state === 'saving' ? 'animate-spin' : ''}`} />
        {text}
      </span>
    </button>
  );
}
