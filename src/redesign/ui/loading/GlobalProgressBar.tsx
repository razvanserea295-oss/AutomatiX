import { useProgressBarStore } from './progressBarStore';

/** Fixed 2px viewport-top progress — driven by `progressBarStore` / `NavigationProgress`. */
export default function GlobalProgressBar() {
  const { phase, progress } = useProgressBarStore();
  const active = phase !== 'idle';
  const error = phase === 'error';
  const fade = phase === 'done';

  if (!active && progress === 0) return null;

  const cls = [
    'ix-global-progress',
    phase === 'active' && progress > 20 ? 'ix-global-progress--crawl' : '',
    error ? 'ix-global-progress--error' : '',
    fade ? 'ix-global-progress--fade' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cls}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-hidden={!active}
      style={{ width: `${progress}%` }}
    />
  );
}
