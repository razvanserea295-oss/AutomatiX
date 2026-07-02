import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { CSSProperties } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  buildTitleBarMenus,
  type TitleBarActionContext,
  type TitleBarMenuGroup,
  type TitleBarMenuId,
  type TitleBarMenuItem,
} from './titleBarMenus';

const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties;

interface TitleBarMenuProps {
  actions: TitleBarActionContext;
}

function activateItem(item: TitleBarMenuItem, close: () => void): void {
  if (item.disabled || item.separator || !item.action) return;
  close();
  item.action();
}

export default function TitleBarMenu({ actions }: TitleBarMenuProps) {
  const menus = buildTitleBarMenus(actions);
  const [openId, setOpenId] = useState<TitleBarMenuId | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const menuLabelId = useId();

  const close = useCallback(() => {
    setOpenId(null);
    setFocusIndex(0);
  }, []);

  const openMenu = useCallback((id: TitleBarMenuId) => {
    setOpenId(id);
    setFocusIndex(0);
  }, []);

  const activeGroup: TitleBarMenuGroup | undefined = openId
    ? menus.find((m) => m.id === openId)
    : undefined;

  const actionableItems = activeGroup?.items.filter((i) => !i.separator && i.action) ?? [];

  useEffect(() => {
    if (!openId) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (barRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [openId, close]);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (!actionableItems.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIndex((i) => (i + 1) % actionableItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIndex((i) => (i - 1 + actionableItems.length) % actionableItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = actionableItems[focusIndex];
        if (item) activateItem(item, close);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId, actionableItems, focusIndex, close]);

  const onMenuKeyDown = (e: KeyboardEvent<HTMLButtonElement>, menu: TitleBarMenuGroup, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = menus[(index + 1) % menus.length];
      if (next) openMenu(next.id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = menus[(index - 1 + menus.length) % menus.length];
      if (prev) openMenu(prev.id);
    } else if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu(menu.id);
    } else if (e.key === 'Escape') {
      close();
    }
  };

  return (
    <div ref={barRef} style={noDrag} className="titlebar-menu-bar hidden md:flex" role="menubar" aria-label="Meniu principal">
      {menus.map((menu, index) => {
        const isOpen = openId === menu.id;
        return (
          <div key={menu.id} className="relative">
            <button
              type="button"
              role="menuitem"
              aria-haspopup="true"
              aria-expanded={isOpen}
              aria-controls={isOpen ? menuLabelId : undefined}
              className={`titlebar-menu-trigger ${isOpen ? 'is-open' : ''}`}
              onClick={() => (isOpen ? close() : openMenu(menu.id))}
              onMouseEnter={() => { if (openId) openMenu(menu.id); }}
              onKeyDown={(e) => onMenuKeyDown(e, menu, index)}
            >
              {menu.label}
            </button>

            {isOpen && (
              <div
                ref={panelRef}
                id={menuLabelId}
                role="menu"
                aria-label={menu.label}
                className={`titlebar-menu-panel ${reducedMotion ? '' : 'titlebar-menu-panel--motion'}`}
              >
                {menu.items.map((item) => {
                  if (item.separator) {
                    return <div key={item.id} role="separator" className="titlebar-menu-sep" />;
                  }
                  const actionableIdx = actionableItems.indexOf(item);
                  const focused = actionableIdx === focusIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      className={`titlebar-menu-item ${focused ? 'is-focused' : ''}`}
                      onMouseEnter={() => { if (actionableIdx >= 0) setFocusIndex(actionableIdx); }}
                      onClick={() => activateItem(item, close)}
                    >
                      <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                      {item.shortcut && (
                        <kbd className="titlebar-menu-kbd">{item.shortcut}</kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
