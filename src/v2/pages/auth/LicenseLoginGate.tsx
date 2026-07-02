import { useState, type FormEvent } from 'react';
import { KeyRound } from '@/icons';
import { getServerUrl } from '@/config/server';
import { parseLicensePayload } from '@/shared/license';
import { Button } from '@/v2/components/ui/button';
import { Label } from '@/v2/components/ui/label';
import { Textarea } from '@/v2/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/v2/components/ui/card';

export default function LicenseLoginGate({ onActivated }: { onActivated?: () => void }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const hint = parseLicensePayload(key.trim())?.company_name ?? null;

  const activate = async (e: FormEvent) => {
    e.preventDefault();
    const k = key.trim();
    if (!k) { setErr('Introdu cheia de licență.'); return; }
    if (!parseLicensePayload(k)) { setErr('Cheia nu pare validă.'); return; }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${getServerUrl()}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: k }),
      });
      const d = await res.json().catch(() => null) as { ok?: boolean; company_name?: string; message?: string } | null;
      if (!res.ok || !d?.ok) throw new Error(d?.message || 'Activare eșuată');
      setOk(`Activat pentru ${d.company_name || 'firma ta'}. Se reîncarcă…`);
      onActivated?.();
      setTimeout(() => window.location.reload(), 900);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Eroare');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="v2-root flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-sm">
        <CardHeader className="text-center">
          <CardTitle>Licență necesară</CardTitle>
          <CardDescription>Activează instanța cu cheia de licență înainte de autentificare.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void activate(e)} className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><KeyRound className="h-4 w-4" />Cheie licență</Label>
              <Textarea value={key} onChange={(e) => setKey(e.target.value)} rows={4} className="font-mono text-xs" />
              {hint && <p className="text-xs text-muted-foreground">Firmă: {hint}</p>}
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            {ok && <p className="text-sm text-green-600">{ok}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Se activează…' : 'Activează licența'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
