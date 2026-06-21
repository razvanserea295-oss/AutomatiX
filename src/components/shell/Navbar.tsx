import { useMemo, useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import type { SidebarItem } from './WorkspacePanel';

interface NavbarProps {
  items: SidebarItem[];
}

// VS Code-style vertical ACTIVITY BAR. Each top-level workspace is an
// icon-only rail button (label shown as a hover tooltip); the settings
// workspace is pinned to the bottom like VS Code's gear. The per-workspace
// sub-navigation lives inside each page (its own left side bar) — exactly the
// VS Code activity-bar + side-bar split. Multi-workspace groups (rare, role
// dependent) open a flyout menu to the RIGHT of the rail.
const SETTINGS_IDS = new Set(['sistem-workspace', 'settings']);

function Navbar({ items }: NavbarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<{ left: number; top: number } | null>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownPanelRef = useRef<HTMLDivElement | null>(null);

  // Collapse items sharing a `group` name into a single rail entry. A group
  // with one member renders as a plain workspace button; with several, as a
  // flyout.
  const navGroups = useMemo(() => {
    const seen = new Set<string>();
    type GroupEntry = { key: string; representative: SidebarItem; children: SidebarItem[]; hasGroupName: boolean };
    const out: GroupEntry[] = [];
    for (const item of items) {
      const groupKey = item.group || item.id;
      const hasGroupName = !!(item.group && item.group.length > 0);
      if (seen.has(groupKey)) continue;
      seen.add(groupKey);
      const children = hasGroupName ? items.filter(it => it.group === item.group) : [];
      const label = hasGroupName ? item.group! : item.label;
      out.push({
        key: groupKey,
        representative: { ...item, label, isActive: hasGroupName ? children.some(c => c.isActive) : item.isActive },
        children,
        hasGroupName,
      });
    }
    return out;
  }, [items]);

  // Flyout is anchored to the RIGHT edge of the rail button.
  useEffect(() => {
    if (!openDropdown) { setDropdownAnchor(null); return; }
    const measure = () => {
      const r = dropdownButtonRef.current?.getBoundingClientRect();
      if (r) setDropdownAnchor({ left: r.right + 6, top: r.top });
    };
    let raf = 0;
    const onMove = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; measure(); });
    };
    measure();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [openDropdown]);

  // Outside-click closes the flyout.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideButton = dropdownButtonRef.current?.contains(target);
      const insidePanel = dropdownPanelRef.current?.contains(target);
      if (!insideButton && !insidePanel) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenDropdown(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const activeGroup = openDropdown ? navGroups.find(g => g.key === openDropdown) : null;

  type Group = (typeof navGroups)[number];
  const isSettings = (g: Group) => SETTINGS_IDS.has(g.representative.id) || SETTINGS_IDS.has(g.key);
  const topGroups = navGroups.filter(g => !isSettings(g));
  const bottomGroups = navGroups.filter(g => isSettings(g));

  const renderRailItem = (group: Group) => {
    const item = group.representative;
    const Icon = item.icon;
    const isOpen = openDropdown === group.key;
    const isCollapsibleGroup = group.hasGroupName && group.children.length > 1;
    const active = item.isActive || isOpen;
    return (
      <button
        key={group.key}
        ref={isOpen ? dropdownButtonRef : undefined}
        type="button"
        onClick={isCollapsibleGroup ? () => setOpenDropdown(isOpen ? null : group.key) : item.onClick}
        title={item.label}
        aria-label={item.label}
        aria-expanded={isCollapsibleGroup ? isOpen : undefined}
        aria-haspopup={isCollapsibleGroup ? 'menu' : undefined}
        className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition-smooth duration-150 active:scale-[0.94] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
          active
            ? 'text-content-primary bg-accent/10'
            : 'text-content-muted hover:text-content-primary hover:bg-surface-nav-hover'
        }`}
      >
        <Icon className="h-[22px] w-[22px] shrink-0" />
        {item.isActive && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r-full bg-accent" aria-hidden />
        )}
        {item.badge !== undefined && item.badge > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-status-red px-1 text-[8px] font-bold leading-none tabular-nums text-white">
            {item.badge > 99 ? '99' : item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <nav className="shell-rail flex flex-col items-center gap-1 w-[52px] shrink-0 py-3 bg-surface-nav border-r border-line select-none overflow-y-auto overflow-x-hidden">
      {topGroups.map(renderRailItem)}
      <div className="flex-1 min-h-[8px]" />
      {bottomGroups.map(renderRailItem)}

      {activeGroup && dropdownAnchor && createPortal(
        <div
          ref={dropdownPanelRef}
          role="menu"
          style={{ position: 'fixed', left: dropdownAnchor.left, top: dropdownAnchor.top, zIndex: 9999 }}
          className="min-w-[200px] bg-surface-nav border border-line shadow-[var(--elevation-3)] overflow-hidden rounded-xl anim-fade-slide-in origin-left p-1"
        >
          {activeGroup.children.map(child => {
            const ChildIcon = child.icon;
            return (
              <button
                key={child.id}
                type="button"
                role="menuitem"
                onClick={() => { setOpenDropdown(null); child.onClick?.(); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-pm-sm text-left transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] rounded-lg ${
                  child.isActive
                    ? 'text-accent bg-accent/8'
                    : 'text-content-primary hover:bg-surface-nav-hover'
                }`}
              >
                <ChildIcon className="h-3.5 w-3.5 shrink-0 text-content-muted" />
                <span className="flex-1 min-w-0 truncate">{child.label}</span>
                {child.badge !== undefined && child.badge > 0 && (
                  <span className="inline-flex items-center justify-center h-3.5 min-w-[14px] px-1 rounded-full bg-status-red text-white text-[8px] font-bold leading-none tabular-nums">
                    {child.badge > 99 ? '99' : child.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </nav>
  );
}

export default memo(Navbar);
