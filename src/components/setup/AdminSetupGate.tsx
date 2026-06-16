import { useEffect } from 'react';
import { useSetupStore } from '@/store/setupStore';
import AdminSetupWizard from './AdminSetupWizard';









export default function AdminSetupGate({ isAdmin }: { isAdmin: boolean }) {
  const checked = useSetupStore(s => s.checked);
  const completed = useSetupStore(s => s.completed);
  const snoozed = useSetupStore(s => s.snoozed);
  const refresh = useSetupStore(s => s.refresh);

  useEffect(() => {
    if (isAdmin && !checked) void refresh();
  }, [isAdmin, checked, refresh]);

  if (!isAdmin) return null;
  if (!checked || completed !== false) return null;
  if (snoozed) return null;

  return <AdminSetupWizard />;
}
