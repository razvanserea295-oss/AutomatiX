import { Link, useLocation } from 'wouter';
import { Menu, PanelLeftClose, PanelLeft, Zap, Settings } from '@/icons';
import { cn } from '@/v2/lib/cn';
import { V2_NAV, type V2NavGroup } from '@/v2/app/nav';
import { canAccessPage, type AppPage } from '@/lib/access';
import { normalizeRole } from '@/lib/access';
import { ScrollArea } from '@/v2/components/ui/scroll-area';
import { Button } from '@/v2/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/v2/components/ui/sheet';

type Props = {
  role: string;
  customPages?: string | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

function filterGroups(groups: V2NavGroup[], role: string, customPages?: string | null): V2NavGroup[] {
  const r = normalizeRole(role);
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (g.id === 'sistem' && item.id === 'users' && r !== 'admin') return false;
        if (g.id === 'sistem' && item.id === 'sessions' && r !== 'admin') return false;
        if (item.id === 'arhiva' && r !== 'admin') return false;
        if (item.id === 'licente' && r !== 'admin') return false;
        if (item.id === 'remote-support' && r !== 'admin' && r !== 'manager') return false;
        if (item.page && !canAccessPage(role, item.page as AppPage, customPages)) return false;
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);
}

function NavContent({ groups, collapsed }: { groups: V2NavGroup[]; collapsed: boolean }) {
  const [loc] = useLocation();

  return (
    <ScrollArea className="flex-1 px-1.5 py-2 nav-density">
      <nav className="space-y-3">
        {groups.map((group) => (
          <div key={group.id}>
            {!collapsed && (
              <p className="v2-nav-section-label mb-0.5 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <ul className="space-y-px">
              {group.items.map((item) => {
                const active = loc === item.path || (item.path !== '/v2' && loc.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link href={item.path}>
                      <a
                        data-active={active ? 'true' : 'false'}
                        className={cn(
                          'v2-nav-item flex items-center gap-2 rounded-md px-2 font-medium text-[length:var(--density-fs-nav)]',
                          active
                            ? 'bg-[var(--color-nav-active-bg)] text-primary'
                            : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                          collapsed && 'justify-center px-1.5',
                        )}
                        style={{ minHeight: 'var(--density-nav-item-h)' }}
                        title={collapsed ? item.label : undefined}
                      >
                        {!collapsed && <span className="v2-nav-indicator" aria-hidden />}
                        <Icon className="shrink-0" style={{ width: 'var(--density-icon)', height: 'var(--density-icon)' }} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </a>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}

function SidebarBottom({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn(
      'shrink-0 border-t px-1.5 py-2',
      collapsed ? 'flex justify-center' : '',
    )}>
      {collapsed ? (
        <Link href="/v2/settings">
          <a className="v2-nav-item flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Setări"
            style={{ minHeight: 'var(--density-nav-item-h)', width: 'var(--density-nav-item-h)' }}>
            <Settings style={{ width: 'var(--density-icon)', height: 'var(--density-icon)' }} />
          </a>
        </Link>
      ) : (
        <Link href="/v2/settings">
          <a className="v2-nav-item flex items-center gap-2 rounded-md px-2 text-[length:var(--density-fs-nav)] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            style={{ minHeight: 'var(--density-nav-item-h)' }}>
            <span className="v2-nav-indicator" aria-hidden />
            <Settings className="shrink-0" style={{ width: 'var(--density-icon)', height: 'var(--density-icon)' }} />
            <span className="truncate">Setări</span>
          </a>
        </Link>
      )}
    </div>
  );
}

export function SidebarMobile({ role, customPages }: { role: string; customPages?: string | null }) {
  const groups = filterGroups(V2_NAV, role, customPages);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu style={{ width: 'var(--density-icon)', height: 'var(--density-icon)' }} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col p-0">
        <div
          className="flex items-center gap-2 border-b px-3"
          style={{ height: 'var(--density-toolbar-h)' }}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-semibold tracking-tight text-[length:var(--density-fs-section)]">automatiX</span>
        </div>
        <NavContent groups={groups} collapsed={false} />
        <SidebarBottom collapsed={false} />
      </SheetContent>
    </Sheet>
  );
}

export default function AppSidebar({ role, customPages, collapsed, onToggleCollapsed }: Props) {
  const groups = filterGroups(V2_NAV, role, customPages);

  return (
    <aside
      className={cn(
        'v2-animate-shell hidden h-full shrink-0 flex-col border-r bg-card transition-[width] lg:flex',
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
      )}
    >
      <div
        className={cn('flex items-center border-b px-1.5', collapsed ? 'justify-center' : 'justify-between gap-1')}
        style={{ height: 'var(--density-toolbar-h)' }}
      >
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="truncate text-[length:var(--density-fs-section)] font-semibold tracking-tight">
              automatiX
            </span>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onToggleCollapsed}>
          {collapsed ? (
            <PanelLeft style={{ width: 'var(--density-icon)', height: 'var(--density-icon)' }} />
          ) : (
            <PanelLeftClose style={{ width: 'var(--density-icon)', height: 'var(--density-icon)' }} />
          )}
        </Button>
      </div>
      <NavContent groups={groups} collapsed={collapsed} />
      <SidebarBottom collapsed={collapsed} />
    </aside>
  );
}
