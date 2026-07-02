/** Segmented control for discrete preference choices — density-aware. */
export default function Segmented<T extends string>({ value, options, onChange, ariaLabel, className = '' }: {
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex rounded-lg border border-border/60 bg-muted/50 p-0.5 ${className}`}
    >
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`rounded-md px-2.5 font-medium transition-colors duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-[var(--density-btn-h-sm)] text-[length:var(--density-fs-label)] ${
              active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
