import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { Download, Loader2, MonitorSmartphone } from '@/icons';
import { getServerUrl } from '@/config/server';
import { Button } from '@/v2/components/ui/button';
import { Card } from '@/v2/components/ui/card';

interface PublicQuickSupportView {
  code: string;
  company_name: string;
  expires_at: string;
  download_url: string;
  instructions: string[];
}

export default function QuickSupportGuestPage() {
  const [, params] = useRoute('/v2/support/q/:code');
  const code = (params?.code ?? '').trim().toLowerCase();
  const [data, setData] = useState<PublicQuickSupportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) { setError('Cod lipsă'); setLoading(false); return; }
    const base = getServerUrl();
    const url = base ? `${base}/api/support/q/${encodeURIComponent(code)}` : `/api/support/q/${encodeURIComponent(code)}`;
    fetch(url)
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body?.message || 'Link invalid');
        setData(body);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Eroare'))
      .finally(() => setLoading(false));
  }, [code]);

  const downloadHref = () => {
    if (!data) return '#';
    const base = getServerUrl().replace(/\/+$/, '');
    const path = data.download_url.startsWith('/') ? data.download_url : `/${data.download_url}`;
    return base ? `${base}${path}` : path;
  };

  if (loading) {
    return <div className="v2-root flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (error || !data) {
    return <div className="v2-root density-page flex min-h-screen items-center justify-center p-4"><Card className="shadow-none"><div className="p-[var(--density-card-p)] text-destructive">{error}</div></Card></div>;
  }

  return (
    <div className="v2-root density-page flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-none">
        <div className="density-form space-y-[var(--density-gap-section)] p-[var(--density-card-p)]">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5" />
            <h1 className="density-page-title">Suport rapid — {data.company_name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">Cod sesiune: <strong>{data.code}</strong></p>
          <p className="text-sm text-muted-foreground">Expiră: {new Date(data.expires_at).toLocaleString('ro-RO')}</p>
          <Button asChild className="w-full">
            <a href={downloadHref()} download><Download className="mr-2 h-4 w-4" />Descarcă QuickSupport</a>
          </Button>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {data.instructions.map((line, i) => <li key={i}>{line}</li>)}
          </ol>
        </div>
      </Card>
    </div>
  );
}
