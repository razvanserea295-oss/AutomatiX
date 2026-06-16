import GearLogo from '@/components/ui/GearLogo';

/**
 * Branded boot splash shown until auth state is settled.
 * Layered:
 *   1. Deep gradient canvas
 *   2. Drifting aurora orb (single, subtle)
 *   3. Spinning gear logo with concentric ripple + breathing halo
 *   4. Indeterminate progress bar that sweeps left→right
 *   5. Product name + loading copy
 *
 * All animations respect prefers-reduced-motion via the global CSS rule in
 * index.css that clamps animation-duration to 0.01ms.
 */
export default function BootLoader({ label = 'Se încarcă aplicația' }: { label?: string }) {
  return (
    <div
      className="boot-loader relative flex min-h-screen w-screen flex-col items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
    >
      {}
      <div className="boot-loader-orb" aria-hidden />

      {}
      <div className="relative flex h-40 w-40 items-center justify-center">
        <span className="boot-ring boot-ring-1" aria-hidden />
        <span className="boot-ring boot-ring-2" aria-hidden />
        <span className="boot-ring boot-ring-3" aria-hidden />

        <div className="boot-gear-halo" aria-hidden />

        <div className="boot-gear relative">
          <GearLogo size={56} />
        </div>
      </div>

      {}
      <div className="mt-10 flex flex-col items-center">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Automatix</h1>
        <p className="mt-1.5 text-sm font-medium text-white/55 tracking-wide">{label}</p>

        {}
        <div className="mt-6 h-[2px] w-48 overflow-hidden rounded-full bg-white/10">
          <div className="boot-progress h-full w-1/3 rounded-full bg-accent" />
        </div>
      </div>

      <p className="absolute bottom-6 text-pm-2xs font-mono uppercase tracking-[0.2em] text-white/30">
        automatiX · Industrial Operations
      </p>
    </div>
  );
}
