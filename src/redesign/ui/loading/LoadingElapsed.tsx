export interface LoadingElapsedProps {
  elapsedMs: number;
  label?: string;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 1) return 'Se încarcă…';
  return `Se încarcă… ${s}s`;
}

/** Tier-3 context strip — elapsed time + indeterminate progress hint. */
export default function LoadingElapsed({ elapsedMs, label }: LoadingElapsedProps) {
  return (
    <div className="ix-loading-elapsed" role="status" aria-live="polite" aria-label={label}>
      <span>{formatElapsed(elapsedMs)}</span>
      <div className="ix-loading-elapsed-bar" aria-hidden>
        <div className="ix-loading-elapsed-fill" />
      </div>
    </div>
  );
}
