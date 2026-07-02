import { useEffect, useState } from 'react';
import { Download, Monitor, ShieldCheck, Cpu, HardDrive, CheckCircle2, Loader2, AlertCircle, Apple, Terminal } from '@/icons';
import GearLogo from '@/components/ui/GearLogo';
import AppBackground from '@/components/ui/AppBackground';
import { getServerUrl } from '@/config/server';
import { authorizeInstallerDownload, installerDownloadErrorMessage, triggerInstallerFileDownload } from '@/lib/installerDownload';
import { getStorage, STORAGE_KEYS } from '@/config/localStorage';

interface LatestInfo {
  available: boolean;
  version: string | null;
  file: string | null;
  url: string | null;
  size: number | null;
}

type OS = 'windows' | 'mac' | 'linux' | 'other';

function detectOS(): OS {
  const ua = (navigator.userAgent || navigator.platform || '').toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('linux') || ua.includes('x11')) return 'linux';
  return 'other';
}

function formatSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(0)} MB`;
}






export default function DownloadPage() {
  const [info, setInfo] = useState<LatestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [os] = useState<OS>(() => detectOS());
  const base = getServerUrl();

  useEffect(() => {
    let alive = true;
    fetch(`${base}/api/download/latest`)
      .then((r) => r.json())
      .then((d: LatestInfo) => { if (alive) setInfo(d); })
      .catch(() => { if (alive) setInfo({ available: false, version: null, file: null, url: null, size: null }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [base]);

  const downloadUrl = info?.url ? `${base}${info.url}` : null;
  const version = info?.version || '1.1.4';
  const hasSession = !!getStorage(STORAGE_KEYS.TOKEN);

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
    <div className="relative min-h-screen overflow-hidden bg-surface-page text-content-primary">
      <AppBackground />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center px-5 py-14">
        {}
        <div className="mb-10 flex flex-col items-center text-center anim-slide-up">
          <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-tertiary text-content-primary ring-1 ring-line/30">
            <GearLogo size={32} />
          </span>
          <h1 className="text-display-lg font-semibold text-content-primary">
            Descarcă Automatix
          </h1>
          <p className="mt-2 max-w-md text-pm-md text-content-muted">
            Aplicația desktop pentru Windows — management industrial integrat, mereu la îndemână.
          </p>
        </div>

        {}
        <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface-primary p-6 shadow-soft-lg anim-slide-up">

          {os !== 'windows' && os !== 'other' && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border-l-2 border-status-amber bg-status-amber/8 px-4 py-3 anim-fade-slide-in">
              {os === 'mac' ? <Apple className="mt-0.5 h-4 w-4 shrink-0 text-status-amber" /> : <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-status-amber" />}
              <p className="min-w-0 text-pm-xs text-content-secondary">
                Ai detectat <strong>{os === 'mac' ? 'macOS' : 'Linux'}</strong>. Versiunea pentru sistemul tău este în
                curs de pregătire — momentan e disponibilă doar versiunea pentru Windows.
              </p>
            </div>
          )}

          {}
          <div className="flex flex-col items-center gap-3">
            {loading ? (
              <div className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-surface-tertiary/60 text-content-muted">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                <span className="text-pm-sm">Se verifică versiunea…</span>
              </div>
            ) : downloadUrl ? (
              <div className="flex w-full flex-col gap-3">
                {!hasSession && (
                  <textarea
                    className="w-full rounded-xl border border-line bg-surface-secondary px-3 py-2 text-pm-sm text-content-primary"
                    rows={2}
                    spellCheck={false}
                    placeholder="Cheie de licență (AX1.…)"
                    value={licenseKey}
                    onChange={(e) => { setLicenseKey(e.target.value); if (downloadError) setDownloadError(null); }}
                  />
                )}
                <button
                  type="button"
                  onClick={startDownload}
                  disabled={downloading || (!hasSession && !licenseKey.trim())}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-accent text-pm-lg font-semibold text-[var(--color-on-accent)] shadow-[var(--elevation-2)] transition-smooth duration-150 hover:bg-accent/95 hover:shadow-[var(--elevation-3)] active:scale-[0.99] focus:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:opacity-70"
                >
                  {downloading
                    ? <><Loader2 className="h-5 w-5 shrink-0 animate-spin" /><span className="truncate">Se pregătește descărcarea…</span></>
                    : <><Download className="h-5 w-5 shrink-0" /><span className="truncate">Descarcă pentru Windows (.exe)</span></>}
                </button>
                {downloadError && (
                  <div className="flex items-start gap-2 rounded-xl border-l-2 border-status-red bg-status-red/8 px-4 py-3 text-pm-xs text-content-secondary">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-red" />
                    <span>{downloadError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-tertiary/40 text-content-muted">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span className="text-pm-sm">Installer indisponibil momentan. Revino curând.</span>
              </div>
            )}

            <div className="flex items-center gap-4 text-pm-xs text-content-muted">
              <span className="inline-flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5 shrink-0" /> Windows 10/11 · 64-bit</span>
              <span className="tabular-nums">v{version}</span>
              <span className="tabular-nums">{formatSize(info?.size ?? null)}</span>
            </div>
          </div>

          {}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Req icon={<Monitor className="h-4 w-4" />} title="Sistem" value="Windows 10 / 11 (64-bit)" />
            <Req icon={<Cpu className="h-4 w-4" />} title="Procesor" value="x64, 2 nuclee+" />
            <Req icon={<HardDrive className="h-4 w-4" />} title="Spațiu" value="~500 MB liber" />
          </div>
        </div>

        {}
        <div className="mt-8 w-full max-w-xl">
          <h2 className="mb-4 flex items-center gap-2 text-pm-sm font-semibold text-content-secondary">
            <ShieldCheck className="h-4 w-4 text-accent" /> Instalare în 3 pași
          </h2>
          <ol className="space-y-3">
            <Step n={1} title="Descarcă installer-ul" text="Apasă butonul de mai sus pentru a salva fișierul .exe." />
            <Step n={2} title="Rulează fișierul" text="Deschide Automatix-Setup și urmează pașii. Windows poate cere confirmarea instalării." />
            <Step n={3} title="Conectează-te" text="Pornește Automatix din meniul Start și autentifică-te cu contul tău." />
          </ol>
        </div>

        <p className="mt-10 text-center text-pm-2xs text-content-muted">
          <span className="tabular-nums">v{version}</span> · Automatix Software
        </p>
      </div>
    </div>
  );
}

function Req({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface-secondary/40 px-4 py-3 backdrop-blur-sm">
      <div className="mb-1 flex items-center gap-1.5 text-content-muted"><span className="shrink-0">{icon}</span><span className="truncate text-pm-2xs font-semibold uppercase tracking-wide">{title}</span></div>
      <div className="truncate text-pm-sm text-content-primary">{value}</div>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="flex gap-3 rounded-xl border border-line bg-surface-primary/55 p-4 backdrop-blur-sm transition-smooth duration-150 hover:border-line hover:bg-surface-primary/75">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-pm-sm font-bold text-accent">{n}</span>
      <div className="min-w-0">
        <div className="text-pm-sm font-semibold text-content-primary">{title}</div>
        <div className="mt-0.5 flex items-start gap-1.5 text-pm-xs text-content-muted">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-green/70" />
          <span className="min-w-0">{text}</span>
        </div>
      </div>
    </li>
  );
}
