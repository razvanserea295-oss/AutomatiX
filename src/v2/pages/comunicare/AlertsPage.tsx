import { useEffect } from 'react';
import { useAlertStore } from '@/store/alertStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/v2/components/ui/button';
import { Card } from '@/v2/components/ui/card';
import { Page, PageHeader, PageBody } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';

export default function AlertsPage() {
  const alerts = useAlertStore((s) => s.alerts);
  const loading = useAlertStore((s) => s.loading);
  const fetch = useAlertStore((s) => s.generateAndFetch);
  const acknowledge = useAlertStore((s) => s.acknowledgeAlert);
  const user = useAuthStore((s) => s.user);

  useEffect(() => { void fetch(); }, [fetch]);

  return (
    <Page fill>
      <PageHeader title="Alerte" description="Notificări și avertismente sistem" />
      <PageBody>
        <AsyncContent loading={loading && !alerts?.length} error={null} empty={!alerts?.length}>
          <div className="space-y-1">
            {(alerts ?? []).map((a) => (
              <Card key={a.id} className="shadow-none">
                <div className="density-list-item flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[length:var(--density-fs-body)]">{a.title}</p>
                    <p className="density-meta truncate text-muted-foreground">{a.message}</p>
                  </div>
                  {!a.acknowledged && user && (
                    <Button size="sm" variant="outline" onClick={() => void acknowledge(a.id, user.id)}>
                      Confirmă
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </AsyncContent>
      </PageBody>
    </Page>
  );
}
