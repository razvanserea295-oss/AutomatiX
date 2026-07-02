import { Sparkles, Gauge } from '@/icons';
import { useViewTierStore, type ViewTier } from '@/store/viewTierStore';

// Standard ↔ Expert switch. Low-friction, persistent, with micro-tooltips so
// users discover the two depths. Carries a "Nou" badge for feature discovery.
const OPTIONS: Array<{ id: ViewTier; label: string; icon: typeof Gauge; hint: string }> = [
  { id: 'standard', label: 'Standard', icon: Gauge,    hint: 'Vedere ghidată, doar esențialul' },
  { id: 'expert',   label: 'Expert',   icon: Sparkles, hint: 'Filtre avansate, parametri, grilă editabilă' },
];

export default function TierToggle({ showNew = true }: { showNew?: boolean }) {
  const tier = useViewTierStore((s) => s.tier);
  const setTier = useViewTierStore((s) => s.setTier);

  return (
    <div className="relative inline-flex items-center rounded-xl bg-surface-tertiary/50 p-1 ring-1 ring-line/60">
      {showNew && (
        <span className="absolute -top-2 -right-2 z-10 rounded-full bg-accent px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white shadow-[var(--elevation-2)]">
          Nou
        </span>
      )}
      {OPTIONS.map((o) => {
        const active = tier === o.id;
        const Icon = o.icon;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setTier(o.id)}
            aria-pressed={active}
            title={o.hint}
            className={`group/t relative inline-flex items-center gap-1.5 h-8 rounded-lg px-3 text-pm-xs font-semibold transition-smooth duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
              active ? 'bg-surface-primary text-content-primary shadow-soft' : 'text-content-muted hover:text-content-secondary'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${active ? 'text-accent' : ''}`} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
