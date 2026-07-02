import { useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { Plus } from '@/icons';
import { useSalesStore, type SalesLead } from '@/store/salesStore';
import { formatNumber } from '@/lib/format';
import { Button } from '@/v2/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/v2/components/ui/card';
import { Page, PageHeader, PageBody, PageKpis } from '@/v2/components/app/Page';
import { KPICard } from '@/v2/analytics';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';

const STAGES = ['nou', 'calificat', 'oferta', 'negociere', 'convertit'] as const;

export default function PipelinePage() {
  const leads = useSalesStore((s) => s.leads);
  const loading = useSalesStore((s) => s.loading);
  const fetchLeads = useSalesStore((s) => s.fetchLeads);

  useEffect(() => { void fetchLeads(); }, [fetchLeads]);

  const byStage = useMemo(() => {
    const map: Record<string, SalesLead[]> = {};
    for (const s of STAGES) map[s] = [];
    for (const l of leads) {
      const key = STAGES.includes(l.status as typeof STAGES[number]) ? l.status : 'nou';
      map[key].push(l);
    }
    return map;
  }, [leads]);

  const kpis = useMemo(() => STAGES.map((s) => ({ stage: s, count: byStage[s].length })), [byStage]);

  return (
    <Page fill>
      <PageHeader
        title="Vânzări"
        description="Pipeline comercial — numerele de mai jos provin din aceleași lead-uri afișate"
        actions={<Button size="sm" variant="outline"><Plus className="mr-2 h-4 w-4" />Lead nou</Button>}
      />

      <PageBody>
        <PageKpis>
          {kpis.map((k) => (
            <KPICard key={k.stage} label={k.stage} value={k.count} />
          ))}
        </PageKpis>

        <AsyncContent loading={loading && leads.length === 0} error={null} empty={leads.length === 0}>
          <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto pb-1">
            {STAGES.map((stage) => (
              <div key={stage} className="min-w-[220px] flex-1 space-y-1">
                <div className="density-toolbar flex items-center justify-between px-1">
                  <h3 className="density-meta font-semibold capitalize">{stage}</h3>
                  <span className="density-meta text-muted-foreground">{byStage[stage].length}</span>
                </div>
                {byStage[stage].map((lead) => (
                  <Link key={lead.id} href={`/v2/sales-hub/${lead.id}`}>
                    <Card className="cursor-pointer shadow-none transition hover:border-primary/40">
                      <CardHeader className="space-y-1 p-[var(--density-card-p)] pb-1">
                        <CardTitle className="text-[length:var(--density-fs-body)] font-medium leading-snug">{lead.client_name}</CardTitle>
                        <StatusBadge status={lead.status} />
                      </CardHeader>
                      <CardContent className="space-y-0.5 p-[var(--density-card-p)] pt-0 density-meta text-muted-foreground">
                        <p className="truncate">{lead.product_interest || '—'}</p>
                        <p className="font-medium text-foreground tabular-nums">{formatNumber(lead.estimated_value)} RON</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </AsyncContent>
      </PageBody>
    </Page>
  );
}
