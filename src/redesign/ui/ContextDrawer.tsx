import { useEffect, useState } from 'react';
import { X, ArrowUpRight, Info } from '@/icons';
import { useContextDrawerStore } from '@/store/contextDrawerStore';

// Global right-hand context drawer. Mounted once in <App/>. Slides over the
// shell; reveals the granular story behind whatever the user clicked. Uses a
// setTimeout-driven mount/show toggle (NOT rAF) so it animates even when the
// tab is backgrounded.

const ACCENT: Record<string, { text: string; bg: string; ring: string; bar: string }> = {
  green:  { text: 'text-status-green',  bg: 'bg-status-green/12',  ring: 'ring-status-green/30',  bar: 'bg-status-green' },
  red:    { text: 'text-status-red',    bg: 'bg-status-red/12',    ring: 'ring-status-red/30',    bar: 'bg-status-red' },
  amber:  { text: 'text-status-amber',  bg: 'bg-status-amber/12',  ring: 'ring-status-amber/30',  bar: 'bg-status-amber' },
  blue:   { text: 'text-status-blue',   bg: 'bg-status-blue/12',   ring: 'ring-status-blue/30',   bar: 'bg-status-blue' },
  teal:   { text: 'text-status-teal',   bg: 'bg-status-teal/12',   ring: 'ring-status-teal/30',   bar: 'bg-status-teal' },
  purple: { text: 'text-status-purple', bg: 'bg-status-purple/12', ring: 'ring-status-purple/30', bar: 'bg-status-purple' },
  accent: { text: 'text-accent',        bg: 'bg-accent-muted',     ring: 'ring-accent/30',        bar: 'bg-accent' },
};

export default function ContextDrawer() {
  const open = useContextDrawerStore((s) => s.open);
  const payload = useContextDrawerStore((s) => s.payload);
  const close = useContextDrawerStore((s) => s.close);

  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const t = setTimeout(() => setShown(true), 10);
      return () => clearTimeout(t);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 240);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!mounted || !payload) return null;

  const Icon = payload.icon;
  const ac = ACCENT[payload.accent ?? 'accent'];

  return (
    <div className="dark fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={payload.title}>
      {/* backdrop */}
      <button
        type="button"
        aria-label="Închide"
        onClick={close}
        className={`absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-200 ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* panel */}
      <aside
        className={`absolute right-0 top-0 h-full w-[min(480px,94vw)] flex flex-col bg-surface-primary border-l border-line shadow-[var(--elevation-4)] transition-transform duration-240 ease-[cubic-bezier(0.22,1,0.36,1)] ${shown ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* header */}
        <div className="shrink-0 flex items-start gap-3 px-5 pt-5 pb-4 border-b border-line/70">
          {Icon && (
            <span className={`h-10 w-10 rounded-xl ${ac.bg} ${ac.text} ring-1 ${ac.ring} flex items-center justify-center shrink-0`}>
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-pm-md font-semibold text-content-primary leading-tight truncate">{payload.title}</h2>
            {payload.subtitle && <p className="mt-0.5 text-pm-xs text-content-muted truncate">{payload.subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-surface-tertiary/60 transition-smooth duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* headline */}
        {payload.headline != null && (
          <div className={`shrink-0 px-5 py-4 border-b border-line/70 ${ac.bg}`}>
            <div className={`text-pm-3xl font-semibold tabular-nums leading-none ${ac.text}`}>{payload.headline}</div>
            {payload.headlineHint && <p className="mt-1.5 text-pm-xs text-content-muted">{payload.headlineHint}</p>}
          </div>
        )}

        {/* sections */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5">
          {payload.sections.map((s) => (
            <section key={s.id}>
              <div className="flex items-center gap-1.5 mb-2">
                <h3 className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">{s.label}</h3>
                {s.hint && (
                  <span className="group/h relative inline-flex">
                    <Info className="h-3 w-3 text-content-muted/70" />
                    <span className="pointer-events-none absolute left-1/2 top-5 z-10 hidden -translate-x-1/2 group-hover/h:block w-56 rounded-lg bg-surface-elevated border border-line px-2.5 py-1.5 text-pm-2xs text-content-secondary shadow-[var(--elevation-3)]">
                      {s.hint}
                    </span>
                  </span>
                )}
              </div>
              <div className="text-pm-sm text-content-secondary">{s.body}</div>
            </section>
          ))}
        </div>

        {/* actions + source */}
        {(payload.actions?.length || payload.source) && (
          <div className="shrink-0 border-t border-line/70 px-5 py-3.5 space-y-3">
            {payload.actions && payload.actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {payload.actions.map((a, i) => {
                  const AIcon = a.icon ?? ArrowUpRight;
                  const primary = a.variant !== 'secondary';
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { a.onClick(); close(); }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-pm-xs font-semibold transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                        primary
                          ? 'bg-accent text-white hover:brightness-110'
                          : 'bg-surface-tertiary/60 text-content-secondary hover:text-content-primary hover:bg-surface-tertiary'
                      }`}
                    >
                      <AIcon className="h-3.5 w-3.5" />
                      {a.label}
                    </button>
                  );
                })}
              </div>
            )}
            {payload.source && (
              <p className="text-pm-2xs text-content-muted flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${ac.bar}`} />
                Sursă: {payload.source}
              </p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
