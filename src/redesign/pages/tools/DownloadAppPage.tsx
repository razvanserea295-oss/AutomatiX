import { useEffect, useState } from 'react';
import {
  Download, Monitor, Apple, Terminal, Cpu, HardDrive, ShieldCheck,
  CheckCircle2, Loader2, AlertCircle, Clock,
} from '@/icons';
import { getServerUrl } from '@/config/server';
import { authorizeInstallerDownload, installerDownloadErrorMessage, triggerInstallerFileDownload } from '@/lib/installerDownload';
import { PageChrome, DashboardLayout, Panel } from '@/app-ui';

interface LatestInfo {
  available: boolean;
  platform?: Platform;
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

type Platform = 'windows' | 'mac' | 'linux';
const OS_META: Record<Platform, { label: string; Icon: typeof Monitor; note: string; ext: string }> = {
  windows: { label: 'Windows', Icon: Monitor,  note: 'Windows 10 / 11 · 64-bit',            ext: '.exe' },
  mac:     { label: 'macOS',   Icon: Apple,    note: 'macOS 12+ · Apple Silicon / Intel',  ext: '.dmg' },
  linux:   { label: 'Linux',   Icon: Terminal, note: 'AppImage · x64',                      ext: '.AppImage' },
};

const ALL_PLATFORMS: Platform[] = ['windows', 'mac', 'linux'];

export default function DownloadAppPage() {
  const [infos, setInfos] = useState<Record<Platform, LatestInfo | null>>({
    windows: null, mac: null, linux: null,
  });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<Platform | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [os] = useState<OS>(() => detectOS());
  const base = getServerUrl();

  useEffect(() => {
    let alive = true;
    // Probe every platform so each tile reflects what's actually published.
    Promise.all(
      ALL_PLATFORMS.map((p) =>
        fetch(`${base}/api/download/latest?platform=${p}`)
          .then((r) => r.json() as Promise<LatestInfo>)
          .then((d) => [p, d] as const)
          .catch(() => [p, { available: false, version: null, file: null, url: null, size: null }] as const),
      ),
    )
      .then((pairs) => {
        if (!alive) return;
        const next: Record<Platform, LatestInfo | null> = { windows: null, mac: null, linux: null };
        for (const [p, d] of pairs) next[p] = d;
        setInfos(next);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [base]);

  const isAvailable = (p: Platform): boolean => !!infos[p]?.available;
  const detected: Platform = os === 'other' ? 'windows' : os;
  const detectedMeta = OS_META[detected];
  const detectedInfo = infos[detected];
  const detectedAvailable = isAvailable(detected);
  const DetectedIcon = detectedMeta.Icon;

  // When the detected OS has no build yet, fall back to the first available one.
  const fallbackPlatform = ALL_PLATFORMS.find(isAvailable) ?? null;
  const anyAvailable = fallbackPlatform !== null;
  const shownInfo = detectedInfo?.available ? detectedInfo : (fallbackPlatform ? infos[fallbackPlatform] : null);
  const version = shownInfo?.version || '1.1.7';

  async function startDownload(platform: Platform) {
    setDownloading(platform);
    setDownloadError(null);
    try {
      const result = await authorizeInstallerDownload(undefined, platform);
      if (result.ok) triggerInstallerFileDownload(result.url);
      else setDownloadError(installerDownloadErrorMessage(result.error));
    } catch {
      setDownloadError('Eroare de rețea la pornirea descărcării.');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <DashboardLayout
        chrome={
          <PageChrome
            actions={(() => {
              const target = detectedAvailable ? detected : fallbackPlatform;
              if (loading || !target) return undefined;
              return (
                <button
                  type="button"
                  onClick={() => startDownload(target)}
                  disabled={downloading !== null}
                >
                  {downloading !== null ? (
                    <><Loader2 className="h-4 w-4 shrink-0 animate-spin" /><span>Se pregătește…</span></>
                  ) : (
                    <><Download className="h-4 w-4 shrink-0" /><span>Descarcă ({OS_META[target].ext})</span></>
                  )}
                </button>
              );
            })()}
          />
        }
      >
      <Panel fill scroll padding="none" bodyClassName="!p-0">
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        {/* Detected platform — primary CTA */}
        <div className="rounded-2xl border border-line bg-surface-primary p-6 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface-tertiary text-content-primary">
              <DetectedIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Sistemul tău</p>
              <p className="text-pm-md font-semibold text-content-primary">{detectedMeta.label}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-surface-tertiary/60 text-content-muted">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              <span className="text-pm-sm">Se verifică versiunea…</span>
            </div>
          ) : detectedAvailable ? (
            <button
              type="button"
              onClick={() => startDownload(detected)}
              disabled={downloading !== null}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-accent text-pm-lg font-semibold text-[var(--color-on-accent)] shadow-[var(--elevation-2)] transition-smooth duration-150 hover:bg-accent/95 hover:shadow-[var(--elevation-3)] active:scale-[0.99] focus:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:opacity-70"
            >
              {downloading !== null
                ? <><Loader2 className="h-5 w-5 shrink-0 animate-spin" /><span className="truncate">Se pregătește descărcarea…</span></>
                : <><Download className="h-5 w-5 shrink-0" /><span className="truncate">Descarcă pentru {detectedMeta.label} ({detectedMeta.ext})</span></>}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border-l-2 border-status-amber bg-status-amber/8 px-4 py-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-status-amber" />
                <p className="min-w-0 text-pm-xs text-content-secondary">
                  Versiunea pentru <strong>{detectedMeta.label}</strong> este în pregătire.
                  {fallbackPlatform && <> Momentan e disponibilă varianta pentru <strong>{OS_META[fallbackPlatform].label}</strong>.</>}
                </p>
              </div>
              {fallbackPlatform && (
                <button
                  type="button"
                  onClick={() => startDownload(fallbackPlatform)}
                  disabled={downloading !== null}
                  className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-surface-secondary text-pm-sm font-semibold text-content-primary transition-smooth duration-150 hover:bg-surface-tertiary active:scale-[0.99] focus:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:opacity-70"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {downloading !== null
                      ? 'Se pregătește descărcarea…'
                      : `Descarcă totuși versiunea ${OS_META[fallbackPlatform].label} (${OS_META[fallbackPlatform].ext})`}
                  </span>
                </button>
              )}
            </div>
          )}

          {!loading && !anyAvailable && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-tertiary/40 px-4 py-3 text-pm-sm text-content-muted">
              <AlertCircle className="h-4 w-4 shrink-0" /> Installer indisponibil momentan. Revino curând.
            </div>
          )}

          {downloadError && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border-l-2 border-status-red bg-status-red/8 px-4 py-3 text-pm-xs text-content-secondary">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-red" />
              <span>{downloadError}</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-pm-xs text-content-muted">
            <span className="inline-flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5 shrink-0" /> {detectedMeta.note}</span>
            <span className="tabular-nums">v{version}</span>
            <span className="tabular-nums">{formatSize(shownInfo?.size ?? null)}</span>
          </div>
        </div>

        {/* All platforms */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(Object.keys(OS_META) as Platform[]).map((p) => {
            const meta = OS_META[p];
            const Icon = meta.Icon;
            const here = p === detected;
            const ok = isAvailable(p);
            return (
              <div
                key={p}
                className={`relative rounded-xl border p-4 transition-smooth duration-150 ${
                  here ? 'border-accent bg-accent/5' : 'border-line bg-surface-secondary/40'
                }`}
              >
                {here && (
                  <span className="absolute right-3 top-3 rounded-full bg-accent/15 px-2 py-0.5 text-pm-2xs font-semibold text-accent">
                    Detectat
                  </span>
                )}
                <Icon className={`h-5 w-5 ${here ? 'text-accent' : 'text-content-muted'}`} />
                <p className="mt-2 text-pm-sm font-semibold text-content-primary">{meta.label}</p>
                <p className="mt-0.5 text-pm-2xs text-content-muted">{meta.note}</p>
                <span
                  className={`mt-2 inline-flex items-center gap-1 text-pm-2xs font-semibold ${
                    ok ? 'text-status-green' : 'text-content-muted'
                  }`}
                >
                  {ok ? <><CheckCircle2 className="h-3 w-3" /> Disponibil</> : <><Clock className="h-3 w-3" /> În curând</>}
                </span>
              </div>
            );
          })}
        </div>

        {/* System requirements */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Req icon={<Monitor className="h-4 w-4" />} title="Sistem" value={detectedMeta.note} />
          <Req icon={<Cpu className="h-4 w-4" />} title="Procesor" value="x64, 2 nuclee+" />
          <Req icon={<HardDrive className="h-4 w-4" />} title="Spațiu" value="~500 MB liber" />
        </div>

        {/* Install steps */}
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-pm-sm font-semibold text-content-secondary">
            <ShieldCheck className="h-4 w-4 text-accent" /> Instalare în 3 pași
          </h2>
          <ol className="space-y-3">
            <Step n={1} title="Descarcă installer-ul" text="Apasă butonul de mai sus pentru a salva fișierul." />
            <Step n={2} title="Rulează fișierul" text="Deschide installer-ul și urmează pașii. Sistemul poate cere confirmarea instalării." />
            <Step n={3} title="Conectează-te" text="Pornește Automatix și autentifică-te cu contul tău." />
          </ol>
        </div>
      </div>
    </div>
      </Panel>
    </DashboardLayout>
  );
}

function Req({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface-secondary/40 px-4 py-3">
      <div className="mb-1 flex items-center gap-1.5 text-content-muted">
        <span className="shrink-0">{icon}</span>
        <span className="truncate text-pm-2xs font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <div className="truncate text-pm-sm text-content-primary">{value}</div>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="flex gap-3 rounded-xl border border-line bg-surface-primary/55 p-4 transition-smooth duration-150 hover:bg-surface-primary/75">
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
