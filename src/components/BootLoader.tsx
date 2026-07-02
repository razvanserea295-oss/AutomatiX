import GearLogo from '@/components/ui/GearLogo';

/** Static boot screen shown until auth state is settled (no animations). */
export default function BootLoader({ label = 'Se încarcă aplicația' }: { label?: string }) {
  return (
    <div
      className="boot-loader relative flex min-h-screen w-screen flex-col items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-40 w-40 items-center justify-center">
        <div className="relative">
          <GearLogo size={56} onDark animated />
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Automatix</h1>
        <p className="mt-1.5 text-sm font-medium text-white/55 tracking-wide">{label}</p>

        <div className="mt-6 h-[2px] w-48 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/5 rounded-full bg-accent" />
        </div>
      </div>

      <p className="absolute bottom-6 text-pm-2xs font-mono uppercase tracking-[0.2em] text-white/30">
        automatiX · Industrial Operations
      </p>
    </div>
  );
}
