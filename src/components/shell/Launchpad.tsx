import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from '@/icons';
import type { SidebarItem } from './WorkspacePanel';
import { getWorkspaceSubpages } from '@/config/workspaceNav';

interface Tile {
  id: string;
  label: string;
  Icon: SidebarItem['icon'];
}
interface Section {
  id: string;
  label: string;
  Icon: SidebarItem['icon'];
  tiles: Tile[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: SidebarItem[];
  role: string;
  currentPage: string;
  activeTabId?: string | null;
  onNavigate: (id: string) => void;
}

/**
 * Launchpad — a full-screen overlay grid of every page, summoned on demand
 * (admin-only alternative to the left sidebar). Type to filter, Enter to open
 * the first match, Esc to dismiss.
 */
export default function Launchpad({ open, onClose, items, role, currentPage, activeTabId, onNavigate }: Props) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const activeId = activeTabId ?? currentPage;

  const sections = useMemo<Section[]>(
    () =>
      items.map((item) => {
        const subs = getWorkspaceSubpages(item.id, role);
        const tiles: Tile[] = subs.length
          ? subs.map((s) => ({ id: s.id, label: s.label, Icon: s.icon }))
          : [{ id: item.id, label: item.label, Icon: item.icon }];
        return { id: item.id, label: item.label, Icon: item.icon, tiles };
      }),
    [items, role],
  );

  const filtered = useMemo<Section[]>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sections;
    return sections
      .map((sec) => {
        if (sec.label.toLowerCase().includes(needle)) return sec;
        return { ...sec, tiles: sec.tiles.filter((t) => t.label.toLowerCase().includes(needle)) };
      })
      .filter((sec) => sec.tiles.length > 0);
  }, [sections, q]);

  const firstId = filtered[0]?.tiles[0]?.id;

  useEffect(() => {
    if (!open) return;
    setQ('');
    const t = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'Enter' && firstId) { e.preventDefault(); onNavigate(firstId); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', onKey); };
    // firstId intentionally read fresh via closure recreation on each open/query change
  }, [open, firstId, onClose, onNavigate]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Launchpad — navigare"
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/65 p-4 backdrop-blur-md md:p-8"
      onClick={onClose}
    >
      <div
        className="anim-scale-in flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface-page/98 shadow-[var(--elevation-3,0_24px_60px_rgba(0,0,0,0.4))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <div className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-line bg-surface-secondary px-3 text-content-secondary">
            <Search className="h-4 w-4 shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Caută o pagină…"
              className="min-w-0 flex-1 bg-transparent text-pm-md text-content-primary placeholder:text-content-muted focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-content-muted transition-smooth duration-150 hover:bg-surface-nav-hover hover:text-content-primary active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 md:px-6">
          {filtered.length === 0 && (
            <p className="py-16 text-center text-pm-md text-content-muted">Nicio pagină pentru „{q}”.</p>
          )}
          <div className="flex flex-col gap-6">
            {filtered.map((sec) => (
              <section key={sec.id}>
                <div className="mb-3 flex items-center gap-2 text-content-muted">
                  <sec.Icon className="h-4 w-4" />
                  <h3 className="text-pm-2xs font-bold uppercase tracking-[0.12em]">{sec.label}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {sec.tiles.map((t) => {
                    const active = activeId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onNavigate(t.id)}
                        className={`group flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-smooth duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                          active
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]'
                            : 'border-line bg-surface-primary hover:border-[var(--color-accent)]/35 hover:bg-surface-tertiary/50'
                        }`}
                      >
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-xl transition-smooth duration-150 ${
                            active ? 'bg-[var(--color-accent)] text-white' : 'bg-surface-secondary text-content-secondary group-hover:text-content-primary'
                          }`}
                        >
                          <t.Icon className="h-5.5 w-5.5" />
                        </span>
                        <span className={`min-w-0 max-w-full truncate text-pm-sm font-medium ${active ? 'text-[var(--color-accent)]' : 'text-content-primary'}`}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
