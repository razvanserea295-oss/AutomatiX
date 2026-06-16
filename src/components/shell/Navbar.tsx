import { useMemo, useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import type { SidebarItem } from './WorkspacePanel';

interface NavbarProps {
  items: SidebarItem[];
}











function Navbar({ items }: NavbarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<{ left: number; top: number } | null>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownPanelRef = useRef<HTMLDivElement | null>(null);

  
  
  
  
  
  
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

  
  
  useEffect(() => {
    if (!openDropdown) { setDropdownAnchor(null); return; }
    const measure = () => {
      const r = dropdownButtonRef.current?.getBoundingClientRect();
      if (r) setDropdownAnchor({ left: r.left, top: r.bottom + 2 });
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  
  const activeGroup = openDropdown ? navGroups.find(g => g.key === openDropdown) : null;

  return (
    <nav className="flex items-center gap-1 h-11 shrink-0 px-3 bg-surface-nav border-b border-line select-none overflow-x-auto relative">
      {}
      <div className="flex items-center gap-0.5 flex-1 min-w-0">
        {navGroups.map(group => {
          const item = group.representative;
          const Icon = item.icon;
          const isOpen = openDropdown === group.key;
          
          
          
          
          const isCollapsibleGroup = group.hasGroupName && group.children.length > 1;

          if (isCollapsibleGroup) {
            return (
              <button
                key={group.key}
                ref={isOpen ? dropdownButtonRef : undefined}
                type="button"
                onClick={() => setOpenDropdown(isOpen ? null : group.key)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                title={item.label}
                className={`relative flex items-center gap-1.5 h-8 px-2.5 text-[12px] font-medium transition-colors duration-100 shrink-0 ${
                  item.isActive || isOpen
                    ? 'text-accent bg-accent/8'
                    : 'text-content-secondary hover:text-content-primary hover:bg-surface-nav-hover'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                {item.isActive && (
                  <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-accent" aria-hidden />
                )}
              </button>
            );
          }

          
          return (
            <button
              key={group.key}
              type="button"
              onClick={item.onClick}
              title={item.label}
              className={`relative flex items-center gap-1.5 h-8 px-2.5 text-[12px] font-medium transition-colors duration-100 shrink-0 ${
                item.isActive
                  ? 'text-accent bg-accent/8'
                  : 'text-content-secondary hover:text-content-primary hover:bg-surface-nav-hover'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center h-3.5 min-w-[14px] px-1 rounded-full bg-status-red text-white text-[8px] font-bold leading-none tabular-nums">
                  {item.badge > 99 ? '99' : item.badge}
                </span>
              )}
              {item.isActive && (
                <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-accent" aria-hidden />
              )}
            </button>
          );
        })}
      </div>


      {

}
      {activeGroup && dropdownAnchor && createPortal(
        <div
          ref={dropdownPanelRef}
          role="menu"
          style={{
            position: 'fixed',
            left: dropdownAnchor.left,
            top: dropdownAnchor.top,
            zIndex: 9999,
          }}
          className="min-w-[200px] bg-surface-nav border border-line shadow-lg overflow-hidden"
        >
          {activeGroup.children.map(child => {
            const ChildIcon = child.icon;
            return (
              <button
                key={child.id}
                type="button"
                role="menuitem"
                onClick={() => { setOpenDropdown(null); child.onClick?.(); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors ${
                  child.isActive
                    ? 'text-accent bg-accent/8'
                    : 'text-content-primary hover:bg-surface-nav-hover'
                }`}
              >
                <ChildIcon className="h-3.5 w-3.5 shrink-0 text-content-muted" />
                <span className="flex-1 whitespace-nowrap">{child.label}</span>
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
