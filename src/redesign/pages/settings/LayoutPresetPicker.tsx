import { useShellLayoutStore, type LayoutPresetKey } from '@/store/shellLayoutStore';

/* ── Mini SVG diagrams — fixed light-palette, purely representational ── */

function SvgStandard() {
  return (
    <svg viewBox="0 0 120 80" width="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="80" fill="#F0F0F2"/>
      {/* Titlebar */}
      <rect width="120" height="9" fill="#1A1B1D"/>
      <circle cx="6" cy="4.5" r="2.5" fill="#4D86FF"/>
      <rect x="38" y="2.5" width="44" height="4" rx="2" fill="rgba(255,255,255,0.12)"/>
      <circle cx="109" cy="4.5" r="3" fill="#333537"/>
      {/* Navbar */}
      <rect y="9" width="120" height="7" fill="#222326"/>
      <rect x="4" y="11" width="18" height="3" rx="1.5" fill="#4D86FF"/>
      <rect x="26" y="11" width="13" height="3" rx="1.5" fill="rgba(255,255,255,0.22)"/>
      <rect x="43" y="11" width="13" height="3" rx="1.5" fill="rgba(255,255,255,0.22)"/>
      <rect x="60" y="11" width="13" height="3" rx="1.5" fill="rgba(255,255,255,0.22)"/>
      {/* Hero */}
      <rect y="16" width="120" height="14" fill="#FFFFFF"/>
      <rect x="4" y="19" width="7" height="7" rx="1.5" fill="rgba(77,134,255,0.18)"/>
      <rect x="5.5" y="20.5" width="4" height="4" rx="0.75" fill="#4D86FF"/>
      <rect x="15" y="20" width="46" height="3" rx="1.5" fill="#1A1B1D"/>
      <rect x="15" y="25" width="28" height="2" rx="1" fill="#AAA"/>
      <rect x="90" y="20.5" width="26" height="6" rx="1.5" fill="#4D86FF"/>
      {/* KPI */}
      {([4, 32, 60, 88] as number[]).map((x, i) => (
        <g key={i}>
          <rect x={x} y="32" width="26" height="9" rx="1.5" fill="#FFF" stroke="#E5E5E8" strokeWidth="0.5"/>
          <rect x={x + 3} y="35" width="10" height="1.5" rx="0.75" fill="#AAA"/>
          <rect x={x + 3} y="38" width="7" height="1.5" rx="0.75" fill="#CCC"/>
        </g>
      ))}
      {/* Content */}
      <rect x="4" y="44" width="112" height="27" rx="2" fill="#FFF" stroke="#E5E5E8" strokeWidth="0.5"/>
      <rect x="8" y="48" width="52" height="2.5" rx="1.25" fill="#1A1B1D"/>
      <rect x="8" y="52.5" width="100" height="1.5" rx="0.75" fill="#E0E0E0"/>
      <rect x="8" y="55.5" width="84" height="1.5" rx="0.75" fill="#E0E0E0"/>
      <rect x="8" y="58.5" width="94" height="1.5" rx="0.75" fill="#E0E0E0"/>
      <rect x="8" y="61.5" width="68" height="1.5" rx="0.75" fill="#E0E0E0"/>
      {/* Status bar */}
      <rect y="74" width="120" height="6" fill="#1A1B1D"/>
      <rect x="4" y="76.5" width="28" height="1" rx="0.5" fill="rgba(255,255,255,0.3)"/>
      <circle cx="113" cy="77" r="1.5" fill="#4CAF50"/>
    </svg>
  );
}

function SvgCompact() {
  return (
    <svg viewBox="0 0 120 80" width="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="80" fill="#F0F0F2"/>
      {/* Titlebar smaller */}
      <rect width="120" height="7" fill="#1A1B1D"/>
      <circle cx="5" cy="3.5" r="2" fill="#4D86FF"/>
      <rect x="38" y="1.5" width="44" height="4" rx="2" fill="rgba(255,255,255,0.12)"/>
      {/* Navbar slim */}
      <rect y="7" width="120" height="5" fill="#222326"/>
      <rect x="4" y="8.5" width="14" height="2" rx="1" fill="#4D86FF"/>
      <rect x="21" y="8.5" width="10" height="2" rx="1" fill="rgba(255,255,255,0.22)"/>
      <rect x="34" y="8.5" width="10" height="2" rx="1" fill="rgba(255,255,255,0.22)"/>
      <rect x="47" y="8.5" width="10" height="2" rx="1" fill="rgba(255,255,255,0.22)"/>
      {/* Hero compact */}
      <rect y="12" width="120" height="7" fill="#FFFFFF"/>
      <rect x="4" y="14.5" width="38" height="2.5" rx="1.25" fill="#1A1B1D"/>
      {/* KPI tight */}
      {([4, 32, 60, 88] as number[]).map((x, i) => (
        <g key={i}>
          <rect x={x} y="21" width="26" height="7" rx="0.5" fill="#FFF" stroke="#E5E5E8" strokeWidth="0.5"/>
          <rect x={x + 3} y="24" width="9" height="1.5" rx="0.75" fill="#AAA"/>
        </g>
      ))}
      {/* Content big */}
      <rect x="4" y="31" width="112" height="45" rx="0.5" fill="#FFF" stroke="#E5E5E8" strokeWidth="0.5"/>
      <rect x="8" y="35" width="52" height="2.5" rx="1.25" fill="#1A1B1D"/>
      {([39, 43, 47, 51, 55, 59, 63, 67, 71] as number[]).map((y, i) => (
        <rect key={i} x="8" y={y} width={[100, 82, 95, 74, 88, 63, 96, 78, 91][i]} height="1.5" rx="0.75" fill="#E0E0E0"/>
      ))}
    </svg>
  );
}

function SvgSpacious() {
  return (
    <svg viewBox="0 0 120 80" width="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="80" fill="#F0F0F2"/>
      {/* Titlebar big */}
      <rect width="120" height="11" fill="#1A1B1D"/>
      <circle cx="7" cy="5.5" r="3" fill="#4D86FF"/>
      <rect x="36" y="3" width="48" height="5" rx="2.5" fill="rgba(255,255,255,0.12)"/>
      <circle cx="111" cy="5.5" r="3.5" fill="#333537"/>
      {/* Navbar big */}
      <rect y="11" width="120" height="9" fill="#222326"/>
      <rect x="4" y="13.5" width="20" height="4" rx="2" fill="#4D86FF"/>
      <rect x="28" y="13.5" width="16" height="4" rx="2" fill="rgba(255,255,255,0.2)"/>
      <rect x="48" y="13.5" width="16" height="4" rx="2" fill="rgba(255,255,255,0.2)"/>
      <rect x="68" y="13.5" width="16" height="4" rx="2" fill="rgba(255,255,255,0.2)"/>
      {/* Hero large */}
      <rect y="20" width="120" height="18" fill="#FFFFFF"/>
      <rect x="4" y="24" width="9" height="9" rx="2" fill="rgba(77,134,255,0.18)"/>
      <rect x="5.5" y="25.5" width="6" height="6" rx="1" fill="#4D86FF"/>
      <rect x="17" y="25" width="52" height="3.5" rx="1.75" fill="#1A1B1D"/>
      <rect x="17" y="30.5" width="36" height="2.5" rx="1.25" fill="#AAA"/>
      <rect x="88" y="24.5" width="28" height="7.5" rx="2" fill="#4D86FF"/>
      {/* KPI spacious */}
      {([4, 43, 82] as number[]).map((x, i) => (
        <g key={i}>
          <rect x={x} y="42" width="35" height="11" rx="4" fill="#FFF" stroke="#E5E5E8" strokeWidth="0.5"/>
          <rect x={x + 3} y="46" width="14" height="2" rx="1" fill="#AAA"/>
          <rect x={x + 3} y="49.5" width="10" height="1.5" rx="0.75" fill="#CCC"/>
        </g>
      ))}
      {/* Content */}
      <rect x="4" y="57" width="112" height="14" rx="4" fill="#FFF" stroke="#E5E5E8" strokeWidth="0.5"/>
      <rect x="8" y="61" width="46" height="2.5" rx="1.25" fill="#1A1B1D"/>
      <rect x="8" y="65.5" width="88" height="1.5" rx="0.75" fill="#E0E0E0"/>
      {/* Status bar */}
      <rect y="74" width="120" height="6" fill="#1A1B1D"/>
      <rect x="4" y="76.5" width="28" height="1" rx="0.5" fill="rgba(255,255,255,0.3)"/>
      <circle cx="113" cy="77" r="1.5" fill="#4CAF50"/>
    </svg>
  );
}

function SvgFocus() {
  return (
    <svg viewBox="0 0 120 80" width="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="80" fill="#F0F0F2"/>
      {/* Tiny navbar only */}
      <rect width="120" height="5" fill="#222326"/>
      <rect x="4" y="1.5" width="14" height="2" rx="1" fill="#4D86FF"/>
      <rect x="22" y="1.5" width="10" height="2" rx="1" fill="rgba(255,255,255,0.25)"/>
      <rect x="36" y="1.5" width="10" height="2" rx="1" fill="rgba(255,255,255,0.25)"/>
      {/* Full content area */}
      <rect x="0" y="5" width="120" height="75" fill="#FFFFFF"/>
      {/* Left accent strip */}
      <rect x="0" y="5" width="3" height="75" fill="#4D86FF"/>
      {/* Dense content lines */}
      <rect x="8" y="11" width="54" height="3" rx="1.5" fill="#1A1B1D"/>
      {([17, 20.5, 24, 27.5, 31, 34.5, 38, 41.5, 45, 48.5, 52, 55.5, 59, 62.5, 66, 69.5, 73] as number[]).map((y, i) => (
        <rect key={i} x="8" y={y} width={[104, 86, 98, 72, 104, 88, 100, 76, 92, 84, 104, 66, 96, 80, 104, 68, 90][i]} height="1.5" rx="0.75" fill="#E0E0E0"/>
      ))}
    </svg>
  );
}

/* ── Preset metadata ── */

const PRESETS: Array<{
  id: LayoutPresetKey;
  label: string;
  desc: string;
  Svg: () => JSX.Element;
}> = [
  { id: 'standard', label: 'Clasic',   desc: 'Echilibrat, elemente complete',  Svg: SvgStandard },
  { id: 'compact',  label: 'Compact',  desc: 'Dens, crom minim',               Svg: SvgCompact  },
  { id: 'spacious', label: 'Aerisit',  desc: 'Spațios, respiră',               Svg: SvgSpacious },
  { id: 'focus',    label: 'Focus',    desc: 'Zero distracții, tot conținut',  Svg: SvgFocus    },
];

/* ── Component ── */

export default function LayoutPresetPicker() {
  const layout   = useShellLayoutStore(s => s.layout);
  const setPreset = useShellLayoutStore(s => s.setPreset);

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {PRESETS.map(({ id, label, desc, Svg }) => {
        const active = layout.layoutPreset === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setPreset(id)}
            className={`relative flex flex-col gap-2 rounded-xl border p-2.5 text-left transition-all duration-150 focus-visible:outline-none ${
              active
                ? 'border-accent bg-accent/8 shadow-[0_0_0_2px_var(--color-accent)]'
                : 'border-line bg-surface-primary hover:border-content-muted/40'
            }`}
          >
            <div className="w-full overflow-hidden rounded-lg border border-line/50">
              <Svg />
            </div>
            <div>
              <p className="text-pm-xs font-semibold text-content-primary leading-tight">{label}</p>
              <p className="text-pm-2xs text-content-muted mt-0.5">{desc}</p>
            </div>
            {active && (
              <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-accent flex items-center justify-center shadow-sm">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
