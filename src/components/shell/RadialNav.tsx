import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowLeft, X } from '@/icons';
import type { SidebarItem } from './WorkspacePanel';
import { getWorkspaceSubpages, type WorkspaceSubpage } from '@/config/workspaceNav';

interface Props {
  open: boolean;
  onClose: () => void;
  items: SidebarItem[];
  role: string;
  currentPage: string;
  activeTabId?: string | null;
  onNavigate: (id: string) => void;
}

interface Node {
  id: string;
  label: string;
  Icon: SidebarItem['icon'];
  /** Subpages — when present, clicking drills in instead of navigating. */
  subs: WorkspaceSubpage[];
}

const RADIUS = 168;
const BTN = 76;

/**
 * Radial (pie) menu — an admin-only alternative to the sidebar. Workspaces fan
 * out around a central hub; selecting one with subpages drills into a second
 * ring. Click the hub (or Esc) to go back / dismiss.
 */
export default function RadialNav({ open, onClose, items, role, currentPage, activeTabId, onNavigate }: Props) {
  const [drill, setDrill] = useState<Node | null>(null);
  const activeId = activeTabId ?? currentPage;

  const roots = useMemo<Node[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        label: item.label,
        Icon: item.icon,
        subs: getWorkspaceSubpages(item.id, role),
      })),
    [items, role],
  );

  useEffect(() => {
    if (!open) { setDrill(null); return; }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setDrill((d) => { if (d) return null; onClose(); return null; });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const ring: { id: string; label: string; Icon: SidebarItem['icon']; onClick: () => void }[] = drill
    ? drill.subs.map((s) => ({ id: s.id, label: s.label, Icon: s.icon, onClick: () => onNavigate(s.id) }))
    : roots.map((n) => ({
        id: n.id,
        label: n.label,
        Icon: n.Icon,
        onClick: () => (n.subs.length ? setDrill(n) : onNavigate(n.id)),
      }));

  const n = ring.length;
  const HubIcon = drill ? ArrowLeft : X;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Meniu radial — navigare"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="anim-scale-in relative"
        style={{ width: (RADIUS + BTN) * 2, height: (RADIUS + BTN) * 2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {drill && (
          <p className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap text-pm-sm font-semibold text-white/85">
            {drill.label}
          </p>
        )}

        {ring.map((node, i) => {
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
          const x = Math.cos(angle) * RADIUS;
          const y = Math.sin(angle) * RADIUS;
          const active = activeId === node.id;
          return (
            <button
              key={node.id}
              type="button"
              onClick={node.onClick}
              title={node.label}
              className={`radial-item absolute flex flex-col items-center justify-center gap-1 rounded-2xl border p-1 text-center focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                  : 'border-line bg-surface-primary text-content-secondary hover:border-[var(--color-accent)]/60 hover:bg-surface-tertiary hover:text-content-primary'
              }`}
              style={{
                width: BTN,
                height: BTN,
                left: '50%',
                top: '50%',
                '--rx': `${x}px`,
                '--ry': `${y}px`,
                animationDelay: `${i * 0.022}s`,
              } as CSSProperties}
            >
              <node.Icon className="h-5 w-5 shrink-0" />
              <span className="max-w-[68px] truncate text-[10px] font-medium leading-tight">{node.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => (drill ? setDrill(null) : onClose())}
          aria-label={drill ? 'Înapoi' : 'Închide'}
          className="radial-hub absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border border-line bg-surface-primary text-content-primary shadow-[var(--elevation-2)] transition-colors duration-150 hover:border-[var(--color-accent)]/60 hover:text-content-primary focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
        >
          <HubIcon className="h-6 w-6" />
          <span className="text-[10px] font-medium">{drill ? 'Înapoi' : 'Închide'}</span>
        </button>
      </div>
    </div>
  );
}
