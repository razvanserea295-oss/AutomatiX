import { useId } from 'react';

interface GearLogoProps {
  size?: number;
  className?: string;
  /** Brighten the mark for dark backgrounds (boot/splash, dark sidebars). */
  onDark?: boolean;
  /** Animate the nodes lighting up (used by the boot/splash screens). */
  animated?: boolean;
}

/**
 * Automatix brand mark — a hexagon enclosing three connected nodes
 * (the "automation flow" motif). Gradient runs navy → blue → cyan.
 *
 * This is the single source of truth for the in-app logo: the sidebar,
 * titlebar, login, setup wizard and boot loader all render it.
 */
export default function GearLogo({ size = 48, className = '', onDark = false, animated = false }: GearLogoProps) {
  const id = useId().replace(/:/g, '');
  const gid = `axg-${id}`;
  // On dark surfaces the deep navy end would disappear — lift both stops.
  const c0 = onDark ? '#5B9CFF' : '#14306E';
  const c1 = onDark ? '#27D3FF' : '#16C7FF';
  const cMid = onDark ? '#3FB0FF' : '#2F7CF0';

  return (
    <svg
      role="img"
      aria-label="Automatix"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`block ${animated ? 'axlogo-animated' : ''} ${className}`}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c0} />
          <stop offset="0.55" stopColor={cMid} />
          <stop offset="1" stopColor={c1} />
        </linearGradient>
      </defs>

      {/* Hexagon shell (pointy-top) */}
      <path
        className="axlogo-hex"
        d="M50 8 L86.4 29 L86.4 71 L50 92 L13.6 71 L13.6 29 Z"
        stroke={`url(#${gid})`}
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />

      {/* Connector line behind the nodes */}
      <path
        className="axlogo-link"
        d="M29 50 H71"
        stroke={`url(#${gid})`}
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Left node — hollow ring */}
      <circle className="axlogo-node axlogo-node-1" cx="29" cy="50" r="7" stroke={`url(#${gid})`} strokeWidth="5" fill="none" />
      {/* Middle node */}
      <circle className="axlogo-node axlogo-node-2" cx="50" cy="50" r="4.5" fill={`url(#${gid})`} />
      {/* Right node */}
      <circle className="axlogo-node axlogo-node-3" cx="71" cy="50" r="6" fill={`url(#${gid})`} />
    </svg>
  );
}
