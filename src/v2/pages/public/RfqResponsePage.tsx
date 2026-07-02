import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { CheckCircle, Loader2 } from '@/icons';
import { toast } from 'sonner';
import { getServerUrl } from '@/config/server';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Card } from '@/v2/components/ui/card';

interface RfqItem { id: number; description: string; quantity: number; unit: string }
interface RfqView {
  rfq: { rfq_number: string; title: string; items: RfqItem[] };
  invitation: { supplier_name: string | null; status: string };
}

export default function RfqResponsePage() {
  const [, params] = useRoute('/v2/rfq/:token');
  const token = params?.token ?? '';
  const [data, setData] = useState<RfqView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setError('Token lipsă'); setLoading(false); return; }
    const base = getServerUrl();
    const url = base ? `${base}/api/rfq/${token}` : `/api/rfq/${token}`;
    fetch(url)
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body.message || 'RFQ invalid');
        setData(body);
        const init: Record<number, string> = {};
        for (const it of body.rfq.items) init[it.id] = '';
        setPrices(init);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Eroare'))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    if (!data) return;
    setSubmitting(true);
    const base = getServerUrl();
    const url = base ? `${base}/api/rfq/${token}/submit` : `/api/rfq/${token}/submit`;
    try {
      const items = data.rfq.items.map((it) => ({
        item_id: it.id,
        unit_price: Number(prices[it.id]) || 0,
        available_quantity: it.quantity,
        notes: '',
      }));
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, currency: 'RON' }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.message || 'Trimitere eșuată');
      setDone(true);
      toast.success('Ofertă trimisă');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="v2-root flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (error) {
    return <div className="v2-root density-page flex min-h-screen items-center justify-center p-4"><Card className="shadow-none"><div className="p-[var(--density-card-p)] text-destructive">{error}</div></Card></div>;
  }
  if (done) {
    return (
      <div className="v2-root density-page flex min-h-screen items-center justify-center p-4">
        <Card className="shadow-none text-center"><div className="space-y-2 p-[var(--density-card-p)]"><CheckCircle className="mx-auto h-8 w-8 text-green-600" /><p>Mulțumim — răspunsul a fost înregistrat.</p></div></Card>
      </div>
    );
  }

  return (
    <div className="v2-root density-page min-h-screen bg-background p-4">
      <div className="mx-auto max-w-xl space-y-[var(--density-gap-section)]">
        <div>
          <h1 className="density-page-title">{data?.rfq.title}</h1>
          <p className="density-meta text-muted-foreground">{data?.rfq.rfq_number} · {data?.invitation.supplier_name}</p>
        </div>
        <Card className="shadow-none">
          <div className="density-form space-y-[var(--density-gap-section)] p-[var(--density-card-p)]">
            {data?.rfq.items.map((it) => (
              <div key={it.id} className="grid gap-2 border-b pb-4 last:border-0">
                <p className="font-medium">{it.description}</p>
                <p className="text-sm text-muted-foreground">{it.quantity} {it.unit}</p>
                <div className="grid gap-1.5 max-w-xs">
                  <Label>Preț unitar (RON)</Label>
                  <Input value={prices[it.id] ?? ''} onChange={(e) => setPrices((p) => ({ ...p, [it.id]: e.target.value }))} />
                </div>
              </div>
            ))}
            <Button disabled={submitting} onClick={() => void submit()}>Trimite oferta</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
