import { useParams, Link } from 'wouter';
import { apiCommand } from '@/api/commands';
import { useAsync } from '@/v2/hooks/useAsync';
import type { SalesLead } from '@/store/salesStore';
import { Button } from '@/v2/components/ui/button';
import { Card } from '@/v2/components/ui/card';
import { Page, PageHeader, PageBody } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { formatNumber } from '@/lib/format';

export default function LeadPage() {
  const params = useParams<{ id: string }>();
  const leadId = Number(params.id);

  const { data: lead, loading, error, reload } = useAsync(
    () => apiCommand<SalesLead>('get_sales_lead', { id: leadId }),
    [leadId],
  );

  return (
    <Page fill>
      <PageHeader
        title={lead?.client_name || 'Lead'}
        description="Detalii lead comercial"
        actions={<Link href="/v2/sales-hub"><Button variant="outline" size="sm">Înapoi la pipeline</Button></Link>}
      />
      <PageBody>
        <AsyncContent loading={loading} error={error} onRetry={() => void reload()}>
          {lead && (
            <Card className="shadow-none">
              <div className="density-form-grid density-form-grid-3 p-[var(--density-card-p)]">
                <div><p className="density-meta text-muted-foreground">Status</p><StatusBadge status={lead.status} /></div>
                <div><p className="density-meta text-muted-foreground">Valoare estimată</p><p className="font-medium tabular-nums">{formatNumber(lead.estimated_value)} RON</p></div>
                <div><p className="density-meta text-muted-foreground">Contact</p><p>{lead.contact_person || '—'}</p></div>
                <div><p className="density-meta text-muted-foreground">Email</p><p>{lead.contact_email || '—'}</p></div>
                <div><p className="density-meta text-muted-foreground">Telefon</p><p>{lead.contact_phone || '—'}</p></div>
                <div><p className="density-meta text-muted-foreground">Interes produs</p><p>{lead.product_interest || '—'}</p></div>
                <div className="md:col-span-3"><p className="density-meta text-muted-foreground">Note</p><p className="whitespace-pre-wrap text-[length:var(--density-fs-body)]">{lead.notes || '—'}</p></div>
              </div>
            </Card>
          )}
        </AsyncContent>
      </PageBody>
    </Page>
  );
}
