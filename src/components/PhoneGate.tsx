import { Smartphone, Monitor, ArrowLeft } from 'lucide-react';
import { useDesktopOverride } from '@/hooks/useIsPhone';

interface Props {
  pageLabel?: string;
  
  onGoHome?: () => void;
}











export default function PhoneGate({ pageLabel, onGoHome }: Props) {
  const [, toggleDesktop] = useDesktopOverride();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 bg-surface-page">
      <div className="max-w-md w-full bg-surface-secondary border border-line p-6 rounded-lg shadow-sm">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Smartphone className="h-10 w-10 text-content-muted" />
            <span className="absolute -top-1 -right-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-status-amber text-surface-primary text-[8px] font-bold">!</span>
          </div>
        </div>

        <h2 className="text-base font-semibold text-content-primary text-center mb-1">
          Pagină ne-optimizată pentru telefon
        </h2>
        <p className="text-pm-sm text-content-secondary text-center mb-5">
          {pageLabel
            ? <>Pagina <strong>{pageLabel}</strong> nu este adaptată pentru ecrane mici.</>
            : 'Această pagină nu este adaptată pentru ecrane mici.'}
          {' '}
          Versiunea desktop îți permite acces, dar va trebui să dai zoom și să faci scroll orizontal.
        </p>

        <div className="space-y-2">
          <button
            type="button"
            onClick={toggleDesktop}
            className="w-full inline-flex items-center justify-center gap-2 h-10 bg-accent text-surface-primary text-sm font-semibold rounded hover:opacity-90 transition-opacity"
          >
            <Monitor className="h-4 w-4" />
            Treci la versiunea desktop
          </button>
          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className="w-full inline-flex items-center justify-center gap-2 h-10 border border-line text-content-secondary text-sm font-medium rounded hover:bg-surface-tertiary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Înapoi la Dashboard
            </button>
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-line/60">
          <p className="text-pm-xs text-content-muted text-center mb-2">
            Pe telefon sunt optimizate doar:
          </p>
          <ul className="text-pm-xs text-content-secondary text-center space-y-0.5">
            <li>• Dashboard</li>
            <li>• Birou control</li>
            <li>• Task-urile mele</li>
            <li>• Calendar</li>
            <li>• Deplasări</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
