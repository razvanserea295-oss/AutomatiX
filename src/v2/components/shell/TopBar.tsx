import { useLocation } from 'wouter';
import { Bell, LogOut, Search } from '@/icons';
import { Button } from '@/v2/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/v2/components/ui/tooltip';
import Avatar from '@/v2/components/motion/Avatar';
import { titleForV2Path } from '@/v2/app/nav';
import type { User as AppUser } from '@/core/types';
import { getRoleDisplayLabel } from '@/lib/roleWorkspace';
import { SidebarMobile } from '@/v2/components/shell/AppSidebar';

type Props = {
  user: AppUser;
  notificationCount: number;
  onLogout: () => void;
  onOpenCommand: () => void;
};

export default function TopBar({ user, notificationCount, onLogout, onOpenCommand }: Props) {
  const [loc] = useLocation();
  const title = titleForV2Path(loc);

  return (
    <header
      className="v2-animate-shell flex shrink-0 items-center gap-2 border-b bg-card px-2"
      style={{ height: 'var(--density-toolbar-h)' }}
    >
      <SidebarMobile role={user.role_name ?? 'user'} customPages={user.custom_pages} />

      {/* Breadcrumb context — shows page name only on mobile where sidebar is hidden */}
      <div className="flex min-w-0 flex-1 items-center gap-1 lg:hidden">
        <span className="truncate text-[length:var(--density-fs-body)] font-medium text-foreground/80">{title}</span>
      </div>
      <div className="hidden lg:flex lg:flex-1" />

      <Button
        variant="ghost"
        size="sm"
        className="hidden gap-1.5 rounded-md border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted sm:flex"
        onClick={onOpenCommand}
      >
        <Search style={{ width: 'var(--density-icon)', height: 'var(--density-icon)' }} />
        <span className="text-[length:var(--density-fs-meta)]">Căutare rapidă</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background/60 px-1.5 font-mono text-[length:var(--density-fs-meta)] font-medium sm:flex">
          Ctrl K
        </kbd>
      </Button>

      <Button variant="ghost" size="icon" className="relative" asChild>
        <a href="#/v2/alerts" aria-label="Alerte">
          <Bell style={{ width: 'var(--density-icon)', height: 'var(--density-icon)' }} />
          {notificationCount > 0 && (
            <span className="v2-animate-pop absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[length:var(--density-fs-badge)] font-bold text-primary-foreground">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </a>
      </Button>

      <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default">
              <Avatar
                size="sm"
                alt={user.full_name || user.username}
                fallback={(user.full_name || user.username || '?').slice(0, 2)}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">{user.full_name || user.username} · {getRoleDisplayLabel(user.role_name)}</TooltipContent>
        </Tooltip>
        <div className="hidden text-[length:var(--density-fs-meta)] leading-tight sm:block">
          <div className="font-medium text-foreground">{user.full_name || user.username}</div>
          <div className="text-muted-foreground">{getRoleDisplayLabel(user.role_name)}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Deconectare" className="text-muted-foreground hover:text-destructive">
          <LogOut style={{ width: 'var(--density-icon)', height: 'var(--density-icon)' }} />
        </Button>
      </div>
    </header>
  );
}
