import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { getServerUrl } from '@/config/server';
import { formatDateRo } from '@/lib/format';
import { Card } from '@/v2/components/ui/card';
import { Skeleton } from '@/v2/components/ui/skeleton';
import StatusBadge from '@/v2/components/app/StatusBadge';

interface PortalView {
  project: {
    name: string; status: string; client_name: string | null; deadline: string | null;
    description: string | null;
  };
  contracts: { contract_code: string; title: string; status: string }[];
  invoices: { invoice_number: string; status: string; total: number; currency: string }[];
}

export default function CustomerPortalPage() {
  const [, params] = useRoute('/v2/portal/:token');
  const token = params?.token ?? '';
  const [data, setData] = useState<PortalView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError('Token lipsă'); setLoading(false); return; }
    const base = getServerUrl();
    const url = base ? `${base}/api/portal/${token}` : `/api/portal/${token}`;
    fetch(url, { headers: { 'Cache-Control': 'no-store' } })
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body.message || 'Portal indisponibil');
        setData(body);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Eroare'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="v2-root density-page min-h-screen space-y-2 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="v2-root density-page flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-none"><div className="p-[var(--density-card-p)] text-sm text-destructive">{error || 'Eroare'}</div></Card>
      </div>
    );
  }

  return (
    <div className="v2-root density-page min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-[var(--density-gap-section)]">
        <div>
          <h1 className="density-page-title">{data.project.name}</h1>
          <p className="density-meta text-muted-foreground">{data.project.client_name}</p>
          <div className="mt-1"><StatusBadge status={data.project.status} /></div>
        </div>
        {data.project.description && <p className="text-[length:var(--density-fs-body)]">{data.project.description}</p>}
        {data.project.deadline && <p className="density-meta text-muted-foreground">Termen: {formatDateRo(data.project.deadline)}</p>}

        <Card className="shadow-none">
          <div className="space-y-2 p-[var(--density-card-p)]">
            <h2 className="density-page-title">Contracte</h2>
            {data.contracts.length === 0 ? <p className="density-meta text-muted-foreground">—</p> : data.contracts.map((c, i) => (
              <p key={i} className="text-[length:var(--density-fs-body)]">{c.contract_code} · {c.title}</p>
            ))}
          </div>
        </Card>

        <Card className="shadow-none">
          <div className="space-y-2 p-[var(--density-card-p)]">
            <h2 className="density-page-title">Facturi</h2>
            {data.invoices.length === 0 ? <p className="density-meta text-muted-foreground">—</p> : data.invoices.map((inv, i) => (
              <p key={i} className="text-[length:var(--density-fs-body)] tabular-nums">{inv.invoice_number} · {inv.total} {inv.currency}</p>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
