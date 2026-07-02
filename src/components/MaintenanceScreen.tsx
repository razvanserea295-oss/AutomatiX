





import { Wrench } from '@/icons';
import DashboardBackground from '@/components/DashboardBackground';
import '@/styles/dashboard.css';

const DEFAULT_MESSAGE =
  'Aplicația este momentan în mentenanță. Revenim cât mai curând — mulțumim pentru răbdare.';

export default function MaintenanceScreen({
  message, eta, onRetry,
}: {
  message?: string | null;
  eta?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="dash-shell relative min-h-[100dvh] w-full flex items-center justify-center bg-surface-page px-4">
      <DashboardBackground />
      <div className="dash-enter dash-glass dash-card relative z-[1] w-full max-w-md rounded-2xl p-8 text-center">
        <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center">
          <Wrench className="h-7 w-7 text-accent" />
        </div>

        <p className="text-pm-xs font-bold uppercase tracking-[0.16em] text-content-muted">Automatix</p>
        <h1 className="mt-2 text-pm-2xl font-semibold text-content-primary">Mentenanță în curs</h1>

        <p className="mt-3 text-pm-sm text-content-secondary leading-relaxed">
          {message?.trim() || DEFAULT_MESSAGE}
        </p>

        {eta?.trim() && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-tertiary/50 px-3 py-1.5 text-pm-xs text-content-secondary">
            <span className="text-content-muted">Estimat:</span>
            <span className="font-medium text-content-primary">{eta}</span>
          </p>
        )}

        {}
        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-surface-tertiary/60" role="progressbar" aria-label="Mentenanță în curs">
          <div className="maint-progress h-full w-1/3 rounded-full bg-accent" />
        </div>

        <button
          type="button"
          onClick={() => (onRetry ? onRetry() : window.location.reload())}
          className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface-tertiary/40 px-4 text-pm-xs font-medium text-content-secondary hover:bg-surface-tertiary active:scale-[0.97] transition-all"
        >
          Reîncearcă
        </button>

        <p className="mt-4 text-pm-2xs text-content-muted">
          Administratorii pot continua să lucreze normal.
        </p>
      </div>
    </div>
  );
}
