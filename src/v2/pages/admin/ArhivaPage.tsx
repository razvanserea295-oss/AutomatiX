import { useState } from 'react';
import { Archive, Copy, Download, ShieldAlert } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { useAuthStore } from '@/store/authStore';
import { normalizeRole } from '@/lib/access';
import { Page, PageHeader, PageBody } from '@/v2/components/app/Page';
import { Button } from '@/v2/components/ui/button';
import { Card } from '@/v2/components/ui/card';
import { Label } from '@/v2/components/ui/label';

interface LinkResult {
  path: string; token: string; expiresAt: string; expiresInMinutes: number;
}

const TTL = [
  { label: '30 min', value: 30 },
  { label: '1 oră', value: 60 },
  { label: '4 ore', value: 240 },
];

export default function ArhivaPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = normalizeRole(user?.role_name) === 'admin';
  const [minutes, setMinutes] = useState(60);
  const [link, setLink] = useState<LinkResult | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isAdmin) {
    return (
      <Page fill>
        <PageHeader title="Arhivă cod sursă" />
        <PageBody>
          <Card className="shadow-none">
            <div className="density-list-item flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Doar administratorii pot accesa arhiva codului sursă.
            </div>
          </Card>
        </PageBody>
      </Page>
    );
  }

  const generate = async () => {
    setBusy(true);
    try {
      setLink(await apiCommand<LinkResult>('create_source_archive_link', { minutes }));
      toast.success('Link generat');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setBusy(false);
    }
  };

  const absoluteUrl = link ? `${window.location.origin}${link.path}` : '';

  const copy = async () => {
    if (!absoluteUrl) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      toast.success('Link copiat');
    } catch {
      toast.error('Copiere eșuată');
    }
  };

  return (
    <Page fill className="max-w-lg">
      <PageHeader title="Arhivă cod sursă" description="Generează link temporar pentru descărcarea codului sursă" />
      <PageBody>
        <Card className="shadow-none">
          <div className="density-form space-y-[var(--density-gap-section)] p-[var(--density-card-p)]">
          <div className="grid gap-2">
            <Label>Valabilitate link</Label>
            <select className="h-9 rounded-md border px-3 text-sm" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
              {TTL.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <Button disabled={busy} onClick={() => void generate()}>
            <Archive className="mr-2 h-4 w-4" />{busy ? 'Se generează…' : 'Generează link'}
          </Button>
          {link && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-2">
              <p className="break-all">{absoluteUrl}</p>
              <p className="text-muted-foreground">Expiră: {new Date(link.expiresAt).toLocaleString('ro-RO')}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void copy()}><Copy className="mr-1 h-3 w-3" />Copiază</Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={absoluteUrl} target="_blank" rel="noreferrer"><Download className="mr-1 h-3 w-3" />Descarcă</a>
                </Button>
              </div>
            </div>
          )}
          </div>
        </Card>
      </PageBody>
    </Page>
  );
}
