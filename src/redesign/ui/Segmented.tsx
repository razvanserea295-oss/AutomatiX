/** iOS-style segmented control for discrete preference choices. */
export default function Segmented<T extends string>({ value, options, onChange, ariaLabel, className = '' }: {
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={`inline-flex rounded-xl bg-surface-tertiary/50 p-1 ${className}`}>
      {options.map(o => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`h-8 rounded-lg px-3.5 text-pm-xs font-semibold transition-smooth duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
              active ? 'bg-surface-primary text-content-primary shadow-soft' : 'text-content-muted hover:text-content-secondary'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
