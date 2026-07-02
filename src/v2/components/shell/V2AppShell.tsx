import { useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import type { User } from '@/core/types';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import CommandMenu from './CommandMenu';
import RouteProgressBar from '@/v2/components/motion/RouteProgressBar';
import { TooltipProvider } from '@/v2/components/ui/tooltip';

type Props = {
  user: User;
  notificationCount: number;
  onLogout: () => void;
  children: ReactNode;
};

export default function V2AppShell({ user, notificationCount, onLogout, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [loc] = useLocation();

  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={0}>
    <div className="v2-root flex h-screen w-full overflow-hidden bg-background">
      <RouteProgressBar />
      <AppSidebar
        role={user.role_name ?? 'user'}
        customPages={user.custom_pages}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          user={user}
          notificationCount={notificationCount}
          onLogout={onLogout}
          onOpenCommand={() => setCmdOpen(true)}
        />
        <main
          key={loc}
          data-page-scroll
          className="v2-animate-page flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
        >
          {children}
        </main>
      </div>
      <CommandMenu
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        role={user.role_name ?? 'user'}
        customPages={user.custom_pages}
      />
    </div>
    </TooltipProvider>
  );
}
