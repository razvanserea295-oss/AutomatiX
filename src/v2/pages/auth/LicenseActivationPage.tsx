import { useState, type FormEvent } from 'react';
import { KeyRound } from '@/icons';
import { apiCommand } from '@/api/commands';
import { useAuthStore } from '@/store/authStore';
import { STORAGE_KEYS, getStorage } from '@/config/localStorage';
import { parseLicensePayload } from '@/shared/license';
import { Button } from '@/v2/components/ui/button';
import { Label } from '@/v2/components/ui/label';
import { Textarea } from '@/v2/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/v2/components/ui/card';

export default function LicenseActivationPage({
  isAdmin,
  onLogout,
}: {
  isAdmin: boolean;
  onLogout: () => void | Promise<void>;
}) {
  const token = useAuthStore((s) => s.token);
  const clearLicenseRequirement = useAuthStore((s) => s.clearLicenseRequirement);
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
      const res = await apiCommand<{ ok: boolean; company_name?: string }>('import_license', {
        token,
        license_token: k,
        tenant_slug: getStorage(STORAGE_KEYS.TENANT_SLUG) || '',
      });
      setOk(`Activat pentru ${res.company_name || 'firma ta'}. Se reîncarcă…`);
      clearLicenseRequirement();
      setTimeout(() => window.location.reload(), 900);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Activare eșuată');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="v2-root flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-sm">
        <CardHeader className="text-center">
          <CardTitle>Activează Automatix</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Introdu cheia de licență primită la achiziție.'
              : 'Cere unui administrator să activeze licența.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <form onSubmit={(e) => void activate(e)} className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><KeyRound className="h-4 w-4" />Cheie licență</Label>
                <Textarea value={key} onChange={(e) => setKey(e.target.value)} rows={4} className="font-mono text-xs" />
                {hint && <p className="text-xs text-muted-foreground">Firmă detectată: {hint}</p>}
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              {ok && <p className="text-sm text-green-600">{ok}</p>}
              <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Se activează…' : 'Activează'}</Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground text-center">Doar administratorii pot introduce cheia de licență.</p>
          )}
          <Button type="button" variant="ghost" className="w-full mt-4" onClick={() => void onLogout()}>Deconectare</Button>
        </CardContent>
      </Card>
    </div>
  );
}
