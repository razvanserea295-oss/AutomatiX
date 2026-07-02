import { lazy, Suspense } from 'react';
import type { User } from '@/core/types';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';

const EmailPage = lazy(() => import('@/redesign/pages/email/EmailPage'));
const ChatPage = lazy(() => import('@/redesign/pages/chat/ChatPage'));
const AlertsPage = lazy(() => import('@/redesign/pages/alerts/AlertsPage'));

interface Props {
  user: User | null;
  initialTab?: string;
}

/** Email, mesaje și alerte — workspace dedicat comunicării. */
export default function ComunicareWorkspace({ user, initialTab }: Props) {
  const tab = initialTab || 'email';

  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      {tab === 'email' && <EmailPage user={user} />}
      {tab === 'chat' && <ChatPage user={user} />}
      {tab === 'alerts' && <AlertsPage user={user} />}
    </Suspense>
  );
}
