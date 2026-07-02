import { useEffect, useState } from 'react';
import { Download, Loader2 } from '@/icons';
import { getServerUrl } from '@/config/server';
import { getStorage, STORAGE_KEYS } from '@/config/localStorage';
import { authorizeInstallerDownload, installerDownloadErrorMessage, triggerInstallerFileDownload } from '@/lib/installerDownload';
import { Button } from '@/v2/components/ui/button';
import { Card } from '@/v2/components/ui/card';

interface LatestInfo {
  available: boolean; version: string | null; url: string | null; size: number | null;
}

export default function DownloadPage() {
  const [info, setInfo] = useState<LatestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const base = getServerUrl();
  const hasSession = !!getStorage(STORAGE_KEYS.TOKEN);

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
      const result = await authorizeInstallerDownload(licenseKey || undefined);
      if (result.ok) triggerInstallerFileDownload(result.url);
      else setDownloadError(installerDownloadErrorMessage(result.error));
    } catch {
      setDownloadError('Eroare de rețea la pornirea descărcării.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="v2-root density-page flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-none">
        <div className="space-y-3 p-[var(--density-card-p)] text-center">
          <h1 className="density-page-title">Automatix</h1>
          <p className="density-meta text-muted-foreground">Descarcă aplicația desktop</p>
          {loading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          ) : canDownload ? (
            <div className="space-y-3 text-left">
              {!hasSession && (
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={2}
                  spellCheck={false}
                  placeholder="Cheie de licență (AX1.…)"
                  value={licenseKey}
                  onChange={(e) => { setLicenseKey(e.target.value); if (downloadError) setDownloadError(null); }}
                />
              )}
              <Button
                type="button"
                className="w-full"
                onClick={startDownload}
                disabled={downloading || (!hasSession && !licenseKey.trim())}
              >
                {downloading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Se pregătește descărcarea…</>
                  : <><Download className="mr-2 h-4 w-4" />v{info.version}</>}
              </Button>
              {downloadError && <p className="text-sm text-destructive">{downloadError}</p>}
            </div>
          ) : (
            <p className="density-meta text-muted-foreground">Versiune indisponibilă.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
