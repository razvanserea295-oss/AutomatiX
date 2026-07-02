import type { ComponentType, ReactNode } from 'react';
import { ArrowRight, ChevronRight, Sparkles } from '@/icons';

// Shared "insight kit" for the premium redesign — the building blocks that turn
// a flat metric into something that guides an action. Used by the Dashboard,
// Finance, and every page rolled out after them.

type IconCmp = ComponentType<{ className?: string }>;
type Accent = 'red' | 'amber' | 'blue' | 'green' | 'teal' | 'purple';

// ── Clickable KPI wrapper ────────────────────────────────────────────────────
// Wraps any KpiCard so the whole tile opens a context drawer. A disabled tile
// (no access / no depth) renders inert. The hover ring lands on the inner
// .pm-card via an arbitrary descendant variant.
export function ClickableKpi({ children, onOpen, disabled, className }: {
  children: ReactNode; onOpen: () => void; disabled?: boolean; className?: string;
}) {
  if (disabled) return <div className={className}>{children}</div>;
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Click pentru detalii"
      // Noticeable, on-brand affordance: a PERSISTENT accent chevron marks the tile
      // as expandable (using solid text-accent — the /alpha ring modifier doesn't
      // render on this palette), brightening + lifting on hover.
      className={`group/k relative text-left w-full rounded-2xl transition-transform duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] [&_.pm-card]:pr-8 [&_.pm-card]:transition-[box-shadow,transform] [&:hover_.pm-card]:-translate-y-0.5 [&:hover_.pm-card]:shadow-[var(--elevation-2)] ${className ?? ''}`}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-3.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface-tertiary text-accent opacity-50 transition-all duration-150 group-hover/k:opacity-100 group-hover/k:scale-110"
      >
        <ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}

// ── Intent card ("where to look first") ──────────────────────────────────────
export interface IntentItem {
  id: string; icon: IconCmp; accent: 'red' | 'amber' | 'blue';
  title: string; value: number | string; unit: string; onOpen: () => void;
}

// Only SOLID status classes (`bg-status-red`, `text-status-red`) render here —
// the `/opacity` modifier does NOT work on the status palette. So the coloured
// wash is a solid layer at element-level opacity (which always works).
const INTENT_ACCENT: Record<string, { text: string; solid: string }> = {
  red:   { text: 'text-status-red',   solid: 'bg-status-red' },
  amber: { text: 'text-status-amber', solid: 'bg-status-amber' },
  blue:  { text: 'text-status-blue',  solid: 'bg-status-blue' },
};

// Bold, hard-to-miss triage card: coloured wash + left accent bar + big figure +
// a persistent "Vezi →" call-to-action. Reads as "look here, then act."
export function IntentCard({ item }: { item: IntentItem }) {
  const ac = INTENT_ACCENT[item.accent];
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={item.onOpen}
      className="group/i relative overflow-hidden text-left flex items-center gap-4 rounded-2xl border border-line bg-surface-primary pl-5 pr-4 py-4 transition-smooth duration-150 active:scale-[0.99] hover:border-line/80 hover:shadow-[var(--elevation-2)] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
    >
      {/* coloured wash (solid colour at element opacity — status /alpha doesn't apply) */}
      <span aria-hidden className={`absolute inset-0 ${ac.solid} opacity-[0.07] transition-opacity duration-150 group-hover/i:opacity-[0.13]`} />
      <span aria-hidden className={`absolute left-0 inset-y-0 w-1.5 ${ac.solid}`} />
      <span className={`relative z-[1] h-11 w-11 rounded-xl bg-surface-tertiary/70 ${ac.text} flex items-center justify-center shrink-0`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="relative z-[1] min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-pm-2xl font-bold tabular-nums leading-none ${ac.text}`}>{item.value}</span>
          {item.unit && <span className="text-pm-xs font-medium text-content-muted">{item.unit}</span>}
        </div>
        <p className="mt-1 text-pm-sm font-semibold text-content-primary truncate">{item.title}</p>
      </div>
      <span className={`relative z-[1] ml-auto inline-flex shrink-0 items-center gap-1 text-pm-2xs font-bold uppercase tracking-wide ${ac.text}`}>
        Vezi <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover/i:translate-x-0.5" />
      </span>
    </button>
  );
}

// A labelled triage section — a prominent "Necesită atenție" header above the
// intent cards, so the new area reads as a deliberate, consistent section on
// every page. `className` carries each page's own spacing.
export function IntentBand({ items, className = '' }: { items: IntentItem[]; className?: string }) {
  if (!items.length) return null;
  return (
    <section aria-label="Necesită atenție" className={className}>
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-muted text-accent ring-1 ring-accent/30">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-pm-xs font-bold uppercase tracking-[0.12em] text-content-secondary">Necesită atenție</h2>
        <span className="text-pm-2xs font-semibold text-content-muted tabular-nums">· {items.length}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => <IntentCard key={it.id} item={it} />)}
      </div>
    </section>
  );
}

// ── Drawer building blocks ───────────────────────────────────────────────────
export function DrawerRow({ label, value, accent, strong }: {
  label: string; value: string; accent?: Accent; strong?: boolean;
}) {
  const color =
    accent === 'green' ? 'text-status-green' : accent === 'red' ? 'text-status-red' :
    accent === 'amber' ? 'text-status-amber' : accent === 'blue' ? 'text-status-blue' :
    accent === 'teal' ? 'text-status-teal' : accent === 'purple' ? 'text-status-purple' : 'text-content-primary';
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-pm-sm ${strong ? 'font-semibold text-content-primary' : 'text-content-secondary'}`}>{label}</span>
      <span className={`text-pm-sm tabular-nums ${strong ? 'font-bold' : 'font-medium'} ${color}`}>{value}</span>
    </div>
  );
}

export function MarginBar({ margin }: { margin: number }) {
  const pct = Math.max(0, Math.min(100, margin));
  const color = margin < 0 ? 'bg-status-red' : margin < 10 ? 'bg-status-amber' : 'bg-status-green';
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-pm-xs text-content-muted">Marjă netă</span>
        <span className="text-pm-sm font-semibold tabular-nums text-content-primary">{margin.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-surface-tertiary overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-pm-2xs text-content-muted">Reper sănătos: peste 10%.</p>
    </div>
  );
}
