import { useEffect, useState } from 'react';
import { Columns2, Square } from 'lucide-react';





export function useSplitView(storageKey: string, defaultValue = true): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored == null ? defaultValue : stored === '1';
  });

  useEffect(() => {
    localStorage.setItem(storageKey, value ? '1' : '0');
  }, [storageKey, value]);

  return [value, setValue];
}

interface SplitViewToggleProps {
  enabled: boolean;
  onToggle: (next: boolean) => void;
  className?: string;
}







export default function SplitViewToggle({ enabled, onToggle, className = '' }: SplitViewToggleProps) {
  const segBase =
    'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-pm-2xs font-semibold uppercase tracking-wide ' +
    'transition-smooth duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] ' +
    'focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]';
  const segActive = 'bg-accent text-[var(--color-on-accent)] shadow-[var(--elevation-1)]';
  const segIdle = 'text-content-muted hover:text-content-primary hover:bg-surface-tertiary';

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-xl border border-line bg-surface-secondary p-1 ${className}`}
      role="group"
      aria-label="Mod afișare"
    >
      <button
        type="button"
        onClick={() => onToggle(false)}
        aria-pressed={!enabled}
        title="Vedere completă (lățime maximă, fără panel detalii)"
        className={`${segBase} ${!enabled ? segActive : segIdle}`}
      >
        <Square className="h-3 w-3" />
        Full
      </button>
      <button
        type="button"
        onClick={() => onToggle(true)}
        aria-pressed={enabled}
        title="Vedere split (listă + panel detalii)"
        className={`${segBase} ${enabled ? segActive : segIdle}`}
      >
        <Columns2 className="h-3 w-3" />
        Split
      </button>
    </div>
  );
}
