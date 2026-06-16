import { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { formatKeys } from '@/hooks/useKeyboardShortcuts';

export interface ShortcutEntry {
  keys: string;
  description: string;
  group: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  shortcuts: ShortcutEntry[];
}

export default function KeyboardShortcutsOverlay({ open, onClose, shortcuts }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const grouped = shortcuts.reduce<Record<string, ShortcutEntry[]>>((acc, s) => {
    (acc[s.group] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scurtături tastatură"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="surface-glass-strong max-w-2xl w-full mx-4 rounded-xl overflow-hidden animate-scale-in motion-reduce:animate-none"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-content-muted" />
            <h2 className="text-sm font-semibold text-content-primary">Scurtături tastatură</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Închide"
            className="p-1 rounded hover:bg-surface-tertiary text-content-muted hover:text-content-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-5">
          {Object.entries(grouped).map(([group, items]) => (
            <section key={group}>
              <h3 className="text-pm-xs font-semibold uppercase tracking-wider text-content-muted mb-2">{group}</h3>
              <ul className="space-y-1.5">
                {items.map(s => (
                  <li key={`${group}:${s.keys}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-content-primary">{s.description}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {s.keys.split(' ').map((token, i) => (
                        <kbd
                          key={i}
                          className="font-mono text-pm-xs px-2 py-0.5 rounded border border-line bg-surface-primary text-content-secondary min-w-[1.75rem] text-center"
                        >
                          {formatKeys(token)}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="border-t border-line px-5 py-2.5 text-pm-xs text-content-muted">
          Apasă <kbd className="font-mono px-1 py-0.5 rounded bg-surface-primary border border-line">Esc</kbd> pentru a închide.
        </footer>
      </div>
    </div>
  );
}
