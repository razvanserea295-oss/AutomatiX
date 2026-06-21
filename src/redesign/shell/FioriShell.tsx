import { useState, type ReactNode } from 'react';
import {
  ShellBar, ShellBarItem, SideNavigation, SideNavigationItem, SideNavigationSubItem,
  Avatar, Input, Button,
} from '@ui5/webcomponents-react';
import menuIcon from '@ui5/webcomponents-icons/dist/menu2.js';
import homeIcon from '@ui5/webcomponents-icons/dist/home.js';
import listIcon from '@ui5/webcomponents-icons/dist/list.js';
import supplierIcon from '@ui5/webcomponents-icons/dist/supplier.js';
import moneyIcon from '@ui5/webcomponents-icons/dist/money-bills.js';
import wrenchIcon from '@ui5/webcomponents-icons/dist/wrench.js';
import settingsIcon from '@ui5/webcomponents-icons/dist/action-settings.js';
import employeeIcon from '@ui5/webcomponents-icons/dist/employee.js';
import personIcon from '@ui5/webcomponents-icons/dist/person-placeholder.js';
import logIcon from '@ui5/webcomponents-icons/dist/log.js';
import paletteIcon from '@ui5/webcomponents-icons/dist/palette.js';
import monitorIcon from '@ui5/webcomponents-icons/dist/sys-monitor.js';
import projectIcon from '@ui5/webcomponents-icons/dist/project-definition-triangle-2.js';
import salesIcon from '@ui5/webcomponents-icons/dist/lead.js';
import factoryIcon from '@ui5/webcomponents-icons/dist/factory.js';
import { useThemeStore } from '@/store/themeStore';
import { useUiModeStore } from '@/store/uiModeStore';

// Authentic Fiori app shell — ShellBar (header) + 2-tier SideNavigation (left).
// Replaces the custom Titlebar/WorkspacePanel chrome whenever the Fiori UI mode
// is active. The page body is given the exact remaining height with overflow
// hidden, so ONLY the page's inner list/table (a Fiori DynamicPage) scrolls —
// never the whole page.
export interface FioriSubItem { id: string; text: string; selected?: boolean }
export interface FioriNavItem { id: string; text: string; selected?: boolean; subItems?: FioriSubItem[] }

const ICON_BY_ID: Record<string, string> = {
  dashboard: homeIcon,
  'manager-control': employeeIcon,
  'personal-workspace': personIcon,
  'sales-workspace': salesIcon,
  'projects-contracts-workspace': projectIcon,
  'engineering-workspace': wrenchIcon,
  'production-workspace': factoryIcon,
  'procurement-workspace': supplierIcon,
  'finance-workspace': moneyIcon,
  'instrumente-workspace': wrenchIcon,
  'sistem-workspace': settingsIcon, settings: settingsIcon,
};

interface Props {
  pageTitle: string;
  selectedId?: string;
  navItems?: FioriNavItem[];
  onNavigate?: (id: string) => void;
  onLogout?: () => void;
  onNotificationsClick?: () => void;
  onSearch?: () => void;
  userInitials?: string;
  notificationsCount?: number;
  children: ReactNode;
}

export default function FioriShell({
  pageTitle, selectedId = '', navItems = [], onNavigate, onLogout,
  onNotificationsClick, onSearch, userInitials = 'RS', notificationsCount = 0, children,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const toggleTheme = useThemeStore(s => s.toggleTheme);
  const setUiMode = useUiModeStore(s => s.setMode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <ShellBar
        primaryTitle="Automatix"
        secondaryTitle={pageTitle}
        showSearchField
        searchField={<Input placeholder="Caută pagini, acțiuni…" onClick={() => onSearch?.()} />}
        showNotifications
        notificationsCount={notificationsCount > 0 ? String(notificationsCount) : undefined}
        profile={<Avatar initials={userInitials} />}
        startButton={<Button icon={menuIcon} tooltip="Comută navigarea" onClick={() => setCollapsed(c => !c)} />}
        onNotificationsClick={() => onNotificationsClick?.()}
        onSearchButtonClick={() => onSearch?.()}
      >
        <ShellBarItem icon={homeIcon} text="Acasă" onClick={() => onNavigate?.('dashboard')} />
        <ShellBarItem icon={paletteIcon} text="Comută tema" onClick={() => toggleTheme()} />
        <ShellBarItem icon={monitorIcon} text="Interfața Modern" onClick={() => setUiMode('saas')} />
        <ShellBarItem icon={logIcon} text="Deconectare" onClick={() => onLogout?.()} />
      </ShellBar>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SideNavigation
          collapsed={collapsed}
          style={{ height: '100%' }}
          onSelectionChange={(e) => {
            const id = (e.detail.item as HTMLElement | undefined)?.dataset?.id;
            if (id) onNavigate?.(id);
          }}
        >
          {navItems.map(it => {
            const subs = it.subItems ?? [];
            const active = it.selected ?? it.id === selectedId;
            return (
              <SideNavigationItem
                key={it.id}
                text={it.text}
                icon={ICON_BY_ID[it.id] ?? listIcon}
                selected={active && subs.length === 0}
                expanded={active && subs.length > 0}
                data-id={it.id}
              >
                {subs.map(s => (
                  <SideNavigationSubItem key={s.id} text={s.text} selected={s.selected} data-id={s.id} />
                ))}
              </SideNavigationItem>
            );
          })}
        </SideNavigation>

        <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
