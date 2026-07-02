export interface PanelProgressBarProps {
  active: boolean;
  complete?: boolean;
}

/** 2px accent bar at top of panel — 0→85% in 1s, then 100% + fade on complete. */
export default function PanelProgressBar({ active, complete = false }: PanelProgressBarProps) {
  if (!active && !complete) return null;
  const cls = complete ? 'ix-panel-progress ix-panel-progress--done' : 'ix-panel-progress';
  return <div className={cls} role="progressbar" aria-hidden />;
}
