import { useEffect, useState } from 'react';
import { Download, Loader2 } from '@/icons';
import { getServerUrl } from '@/config/server';
import { authorizeInstallerDownload, installerDownloadErrorMessage, triggerInstallerFileDownload } from '@/lib/installerDownload';
import { Page, PageHeader, PageBody } from '@/v2/components/app/Page';
import { Button } from '@/v2/components/ui/button';
import { Card } from '@/v2/components/ui/card';

interface LatestInfo {
  available: boolean;
  version: string | null;
  url: string | null;
  size: number | null;
}

function formatSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(0)} MB`;
}

export default function DownloadAppPage() {
  const [info, setInfo] = useState<LatestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const base = getServerUrl();

  useEffect(() => {
    let alive = true;
    fetch(`${base}/api/download/latest`)
      .then((r) => r.json())
      .then((d: LatestInfo) => { if (alive) setInfo(d); })
      .catch(() => { if (alive) setInfo({ available: false, version: null, url: null, size: null }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [base]);

  const canDownload = !!info?.url && info.available;

  async function startDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const result = await authorizeInstallerDownload();
      if (result.ok) triggerInstallerFileDownload(result.url);
      else setDownloadError(installerDownloadErrorMessage(result.error));
    } catch {
      setDownloadError('Eroare de rețea la pornirea descărcării.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Page fill className="max-w-xl">
      <PageHeader title="Descarcă aplicația" description="Client desktop Automatix pentru Windows" />
      <PageBody>
        <Card className="shadow-none">
          <div className="density-form space-y-[var(--density-gap-section)] p-[var(--density-card-p)]">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Se verifică versiunea…</div>
          ) : (
            <>
              <p className="text-sm">Versiune disponibilă: <strong>{info?.version || '—'}</strong></p>
              <p className="text-sm text-muted-foreground">Dimensiune: {formatSize(info?.size ?? null)}</p>
              {canDownload ? (
                <>
                  <Button type="button" onClick={startDownload} disabled={downloading}>
                    {downloading
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Se pregătește descărcarea…</>
                      : <><Download className="mr-2 h-4 w-4" />Descarcă installer</>}
                  </Button>
                  {downloadError && <p className="text-sm text-destructive">{downloadError}</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Nicio versiune publicată pe server.</p>
              )}
            </>
          )}
          </div>
        </Card>
      </PageBody>
    </Page>
  );
}
