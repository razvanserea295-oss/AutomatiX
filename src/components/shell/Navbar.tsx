import { useMemo, useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import type { SidebarItem } from './WorkspacePanel';
import { useLayoutStore } from '@/store/layoutStore';

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

/** Short labels for the icon rail — keeps text readable at narrow width. */
const RAIL_SHORT_LABEL: Record<string, string> = {
  dashboard: 'Acasă',
  'personal-workspace': 'Personal',
  'sales-workspace': 'Vânzări',
  'projects-contracts-workspace': 'Proiecte',
  'engineering-workspace': 'Inginerie',
  'production-workspace': 'Producție',
  'procurement-workspace': 'Aproviz.',
  'finance-workspace': 'Financiar',
  'comunicare-workspace': 'Comunicare',
  'instrumente-workspace': 'Instrumente',
  'sistem-workspace': 'Sistem',
  settings: 'Setări',
};

function railLabel(item: SidebarItem): string {
  return RAIL_SHORT_LABEL[item.id] ?? item.label.split(/[&(/]/)[0].trim().slice(0, 10);
}

function Navbar({ items }: NavbarProps) {
  const navbarCollapsed = useLayoutStore((s) => s.navbarCollapsed);
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
      if (r) setDropdownAnchor({ left: r.right + 8, top: r.top });
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

  // Close flyout when navbar collapses.
  useEffect(() => { if (navbarCollapsed) setOpenDropdown(null); }, [navbarCollapsed]);

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
        className={`group relative flex w-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 transition-smooth duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
          active
            ? 'bg-accent/10 text-content-primary'
            : 'text-content-muted hover:bg-surface-nav-hover hover:text-content-primary'
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="max-w-full truncate text-center text-[9px] font-medium leading-tight tracking-tight">
          {railLabel(item)}
        </span>
        {item.isActive && (
          <span className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-full bg-accent" aria-hidden />
        )}
        {item.badge !== undefined && item.badge > 0 && (
          <span className="absolute right-0.5 top-0.5 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-status-red px-1 text-[8px] font-bold leading-none tabular-nums text-white">
            {item.badge > 99 ? '99' : item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <nav
      className={`shell-rail shell-rail-desktop flex shrink-0 flex-col items-stretch gap-0.5 overflow-y-auto overflow-x-hidden scrollbar-thin bg-surface-nav px-1 py-2 select-none transition-[width] duration-200 ease-in-out ${navbarCollapsed ? 'w-0 px-0' : 'border-r border-line'}`}
    >
      {!navbarCollapsed && topGroups.map(renderRailItem)}
      <div className="flex-1 min-h-[8px]" />
      {!navbarCollapsed && bottomGroups.map(renderRailItem)}

      {!navbarCollapsed && activeGroup && dropdownAnchor && createPortal(
        <div
          ref={dropdownPanelRef}
          role="menu"
          style={{ position: 'fixed', left: dropdownAnchor.left, top: dropdownAnchor.top, zIndex: 9999 }}
          className="min-w-[200px] overflow-hidden rounded-lg border border-line bg-surface-nav p-1 shadow-[var(--elevation-3)] origin-left"
        >
          {activeGroup.children.map(child => {
            const ChildIcon = child.icon;
            return (
              <button
                key={child.id}
                type="button"
                role="menuitem"
                onClick={() => { setOpenDropdown(null); child.onClick?.(); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-pm-sm transition-smooth duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                  child.isActive
                    ? 'bg-accent/10 text-accent'
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
