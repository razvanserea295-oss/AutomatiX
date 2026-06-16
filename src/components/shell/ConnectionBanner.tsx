import { WifiOff, Loader2 } from 'lucide-react';

export type ConnectionState = 'online' | 'reconnecting' | 'offline' | 'local';

interface Props {
  state: ConnectionState;
  serverUrl: string;
  retryInSec?: number;
  onRetryNow?: () => void;
}





export default function ConnectionBanner({ state, serverUrl, retryInSec, onRetryNow }: Props) {
  if (state === 'online' || state === 'local') return null;

  const isReconnecting = state === 'reconnecting';
  const bg = isReconnecting ? 'bg-status-amber/10' : 'bg-status-red/10';
  const border = isReconnecting ? 'border-status-amber/30' : 'border-status-red/30';
  const text = isReconnecting ? 'text-status-amber' : 'text-status-red';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`anim-slide-up relative flex items-center justify-between gap-3 border-b px-4 py-1.5 text-pm-xs font-medium ${bg} ${border} ${text}`}
    >
      {}
      <div className="flex items-center gap-2">
        {isReconnecting
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <WifiOff className="h-3.5 w-3.5" />}
        <span>
          {isReconnecting ? 'Reconectare la server' : 'Server inaccesibil'}
          <span className="ml-1 font-mono opacity-70">— {serverUrl}</span>
          {retryInSec != null && retryInSec > 0 && (
            <span className="ml-2 opacity-70 tabular-nums">(retry in {retryInSec}s)</span>
          )}
        </span>
      </div>
      {onRetryNow && (
        <button
          type="button"
          onClick={onRetryNow}
          className="rounded-md px-2.5 py-1 text-pm-2xs font-semibold uppercase tracking-wider transition-all duration-150 hover:bg-black/5 dark:hover:bg-white/8 active:scale-95"
        >
          Reîncearcă
        </button>
      )}
    </div>
  );
}
