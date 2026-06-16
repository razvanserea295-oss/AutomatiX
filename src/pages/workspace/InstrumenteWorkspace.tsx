import { lazy, Suspense, useState, useEffect } from 'react';
import { GraduationCap, Mail, MessageCircle, Bot, Bell, Loader2 } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';

const TutorialPage = lazy(() => import('@/redesign/pages/tutorial/TutorialPage'));
const EmailPage = lazy(() => import('@/redesign/pages/email/EmailPage'));
const ChatPage = lazy(() => import('@/redesign/pages/chat/ChatPage'));
const AIAssistantPage = lazy(() => import('@/redesign/pages/ai/AIAssistantPage'));
const AlertsPage = lazy(() => import('@/redesign/pages/alerts/AlertsPage'));

const TABS: WorkspaceTab[] = [
  { id: 'tutorial', label: 'Tutorial', icon: GraduationCap },
  { id: 'email',    label: 'Email',    icon: Mail },
  { id: 'chat',     label: 'Mesaje',   icon: MessageCircle },
  { id: 'ai',       label: 'AI',       icon: Bot },
  { id: 'alerts',   label: 'Alerte',   icon: Bell },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function InstrumenteWorkspace({ user, onNavigate, initialTab }: Props) {
  const [tab, setTab] = useState(initialTab || 'tutorial');
  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);

  const handleTabChange = (t: string) => {
    setTab(t);
    onNavigate(t);
  };

  return (
    <Page fit>
      <WorkspaceTabs
        tabs={TABS}
        active={tab}
        onChange={handleTabChange}
      />
      <Suspense fallback={<Loading />}>
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          {tab === 'tutorial' && user && <TutorialPage user={user} onNavigate={onNavigate} />}
          {tab === 'email'    && <EmailPage user={user} />}
          {tab === 'chat'     && <ChatPage user={user} />}
          {tab === 'ai'       && <AIAssistantPage user={user} />}
          {tab === 'alerts'   && <AlertsPage user={user} />}
        </div>
      </Suspense>
    </Page>
  );
}

function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
    </div>
  );
}
