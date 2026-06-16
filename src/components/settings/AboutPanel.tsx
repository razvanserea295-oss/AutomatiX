import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ExternalLink, ClipboardCheck, Clipboard, AlertTriangle, CheckCircle2, Loader2, Upload, Package } from 'lucide-react';
import licenses from '@/assets/licenses.json';
import type { User } from '@/core/types';
import { getServerUrl, isServerMode } from '@/config/server';
import { getPromixToken } from '@/lib/session';
import { normalizeRole } from '@/lib/access';
import { toast } from '@/store/toastStore';

type UpdaterStatus = 'pending' | 'checking' | 'up-to-date' | 'available' | 'unreachable' | 'disabled';

interface UpdaterStatusInfo {
  status: UpdaterStatus;
  error: string | null;
  url: string | null;
}

interface Pkg {
  ecosystem: string;
  name: string;
  version: string;
  license: string;
  author?: string;
  homepage?: string;
}

interface SystemInfo {
  app: { name: string; version: string; packaged: boolean; locale: string };
  runtime: { electron: string | null; chrome: string | null; node: string | null; v8: string | null };
  os: {
    platform: string; arch: string; release: string; type: string;
    hostname: string; username: string;
    total_memory_mb: number; free_memory_mb: number;
    cpu_count: number; cpu_model: string | null; uptime_sec: number;
  };
  paths: { userData: string; db: string; backups: string; logs: string; exe: string; temp: string };
  db: {
    path: string; size_bytes: number | null; backup_count: number;
    last_backup: { name: string; bytes: number; mtime: string } | null;
  };
}

interface AppInfo {
  sys: SystemInfo | null;
  logPath: string;
  aiUrl: string;
  aiHealth: { status?: string; version?: string; model_path?: string; auth_required?: boolean } | null;
  serverUrl: string;
  serverHealth: { status?: string; version?: string; mode?: string } | null;
}

function formatBytes(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}z ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function renderUpdaterStatus(u: UpdaterStatusInfo | null): JSX.Element {
  if (!u) return <span className="text-content-muted">…</span>;
  switch (u.status) {
    case 'pending':
    case 'checking':
      return (
        <span className="inline-flex items-center gap-1.5 text-content-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Se verifică…
        </span>
      );
    case 'available':
      return <span className="text-status-green">Versiune nouă disponibilă</span>;
    case 'up-to-date':
      return (
        <span className="inline-flex items-center gap-1.5 text-status-green">
          <CheckCircle2 className="h-3.5 w-3.5" />
          La zi
        </span>
      );
    case 'unreachable':
      return (
        <span className="inline-flex items-center gap-1.5 text-status-amber">
          <AlertTriangle className="h-3.5 w-3.5" />
          Server inaccesibil
        </span>
      );
    case 'disabled':
      return <span className="text-content-muted">Dezactivate</span>;
  }
}

const ECOSYSTEM_LABEL: Record<string, string> = {
  font: 'Fonturi',
  model: 'Modele AI',
  icons: 'Iconițe',
  npm: 'Librării npm',
  cargo: 'Librării Rust',
};

interface AboutPanelProps { user?: User | null }







function ReleasePublisher() {
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setVersion('');
    setNotes('');
    setFile(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = async () => {
    if (!file) { toast.error('Selectează fișierul .exe / .msi'); return; }
    if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/.test(version.trim())) {
      toast.error('Versiune invalidă (ex: 1.2.1)'); return;
    }
    if (!/\.(exe|msi)$/i.test(file.name)) {
      toast.error('Acceptat doar .exe sau .msi'); return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const url = `${getServerUrl().replace(/\/+$/, '')}/api/admin/upload-release`;
      const token = getPromixToken();
      const notesB64 = notes.trim()
        ? btoa(unescape(encodeURIComponent(notes.trim())))
        : '';

      
      
      
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.setRequestHeader('X-Release-Filename', file.name);
        xhr.setRequestHeader('X-Release-Version', version.trim());
        if (notesB64) xhr.setRequestHeader('X-Release-Notes-B64', notesB64);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else {
            try {
              const j = JSON.parse(xhr.responseText) as { message?: string };
              reject(new Error(j.message || `HTTP ${xhr.status}`));
            } catch { reject(new Error(`HTTP ${xhr.status}`)); }
          }
        };
        xhr.onerror = () => reject(new Error('network error'));
        xhr.send(file);
      });

      toast.success(`Versiunea ${version.trim()} publicată — clienții vor descărca automat.`);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload eșuat');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="bg-surface-secondary rounded-lg border border-line p-5">
      <h2 className="text-base font-semibold text-content-primary mb-1 flex items-center gap-2">
        <Package className="h-4 w-4 text-accent" />
        Publicare versiune nouă
      </h2>
      <p className="text-pm-xs text-content-muted mb-4">
        Încarcă un installer (.exe / .msi). Server-ul îl stochează în <code className="font-mono">updates/</code> și
        regenerează <code className="font-mono">latest.yml</code> — toți clienții conectați descarcă automat la următorul ciclu de verificare (30 min)
        și instalează tăcut la repornirea aplicației. Notele apar în modal-ul de patch notes la primul login după update.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-pm-2xs font-semibold uppercase tracking-wide text-content-muted mb-1">
            Versiune
          </label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.2.1"
            disabled={uploading}
            className="w-40 rounded border border-line bg-surface-primary px-3 py-2 text-sm font-mono text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent/60"
          />
        </div>

        <div>
          <label className="block text-pm-2xs font-semibold uppercase tracking-wide text-content-muted mb-1">
            Note de versiune (markdown — apar în modal-ul utilizatorilor)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={'### Added\n- Funcționalitate nouă X\n\n### Fixed\n- Bug Y'}
            rows={6}
            disabled={uploading}
            className="w-full rounded border border-line bg-surface-primary px-3 py-2 text-sm font-mono text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent/60 resize-y"
          />
        </div>

        <div>
          <label className="block text-pm-2xs font-semibold uppercase tracking-wide text-content-muted mb-1">
            Installer (.exe / .msi)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".exe,.msi"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={uploading}
            className="block w-full text-sm text-content-secondary file:mr-3 file:rounded file:border-0 file:bg-surface-tertiary file:px-3 file:py-1.5 file:text-pm-xs file:font-semibold file:text-content-primary hover:file:bg-surface-elevated file:cursor-pointer"
          />
          {file && (
            <p className="mt-1 text-pm-xs text-content-muted font-mono">
              {file.name} · {formatBytes(file.size)}
            </p>
          )}
        </div>

        {uploading && (
          <div>
            <div className="h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-pm-xs text-content-muted text-right tabular-nums">{progress}%</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={reset}
            disabled={uploading || (!file && !version && !notes)}
            className="h-8 px-3 rounded border border-line text-pm-xs font-semibold text-content-secondary hover:bg-surface-tertiary disabled:opacity-40"
          >
            Resetare
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={uploading || !file || !version}
            className="h-8 px-4 rounded bg-accent text-on-accent text-pm-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? 'Se încarcă…' : 'Publică versiune'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function AboutPanel({ user }: AboutPanelProps = {}) {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [updater, setUpdater] = useState<UpdaterStatusInfo | null>(null);

  useEffect(() => {
    (async () => {
      if (!('electron' in window)) return;
      try {
        const sys = await window.electron.invoke('system_info').catch(() => null) as SystemInfo | null;
        const logPath = await window.electron.invoke('log_get_path').catch(() => '') as string;

        const aiUrl = (localStorage.getItem('promix_ai_url') || 'http://127.0.0.1:8100').replace(/\/+$/, '');
        const aiHealth = await fetch(`${aiUrl}/health`, { signal: AbortSignal.timeout(2500) })
          .then(r => r.json())
          .catch(() => null);

        const serverUrl = (localStorage.getItem('promix_server_url') || '').replace(/\/+$/, '');
        const serverHealth = serverUrl
          ? await fetch(`${serverUrl}/api/health`, { signal: AbortSignal.timeout(2500) }).then(r => r.json()).catch(() => null)
          : null;

        setInfo({ sys, logPath, aiUrl, aiHealth, serverUrl, serverHealth });
      } catch {  }
    })();
  }, []);

  
  useEffect(() => {
    if (!('electron' in window)) return;
    let cancelled = false;

    const fetchStatus = () => {
      window.electron.invoke('updater_get_status')
        .then((s) => { if (!cancelled) setUpdater(s as UpdaterStatusInfo); })
        .catch(() => {  });
    };

    fetchStatus();
    
    const t = setTimeout(fetchStatus, 10_000);

    if (typeof window.electron.onUpdateUnreachable === 'function') {
      window.electron.onUpdateUnreachable(() => fetchStatus());
    }
    if (typeof window.electron.onUpdateAvailable === 'function') {
      window.electron.onUpdateAvailable(() => fetchStatus());
    }

    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = licenses.packages as Pkg[];
    if (!q) return list;
    return list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.license.toLowerCase().includes(q) ||
      p.ecosystem.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const by: Record<string, Pkg[]> = {};
    for (const p of filtered) {
      (by[p.ecosystem] ??= []).push(p);
    }
    return by;
  }, [filtered]);

  const handleCopy = () => {
    const text = (licenses.packages as Pkg[])
      .map(p => `- ${p.name} ${p.version} (${p.license || 'unknown'})${p.homepage ? ` — ${p.homepage}` : ''}`)
      .join('\n');
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-3xl space-y-6 p-6">
      {}
      <section className="bg-surface-secondary rounded-lg border border-line p-5">
        <h2 className="text-base font-semibold text-content-primary mb-3">Despre aplicație</h2>

        {updater?.status === 'unreachable' && (
          <div className="mb-4 flex items-start gap-2.5 rounded border border-status-amber/30 bg-status-amber/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-amber" />
            <div className="text-pm-xs leading-relaxed">
              <p className="font-medium text-content-primary">Server actualizări inaccesibil</p>
              <p className="mt-0.5 text-content-muted">
                Aplicația nu se poate conecta la {updater.url ?? 'serverul de actualizări'} pentru a verifică
                dacă există versiuni noi. Versiunea instalată va rămâne {info?.sys?.app.version ?? '…'} până când
                serverul devine accesibil sau setezi un alt URL prin variabila <code className="font-mono">PROMIX_UPDATE_URL</code>.
              </p>
              {updater.error && (
                <p className="mt-1 font-mono text-pm-2xs text-content-muted opacity-75">{updater.error}</p>
              )}
            </div>
          </div>
        )}

        <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
          <dt className="text-content-muted">Aplicație</dt>
          <dd className="text-content-primary font-mono">
            {info?.sys?.app.name ?? '…'} {info?.sys?.app.version ?? ''}
            {info?.sys?.app.packaged === false && <span className="ml-2 text-pm-2xs text-status-amber">(dev)</span>}
          </dd>

          <dt className="text-content-muted">Actualizări</dt>
          <dd>{renderUpdaterStatus(updater)}</dd>

          <dt className="text-content-muted">Mod</dt>
          <dd className="text-content-primary">
            {info?.serverUrl
              ? <>Server <span className="font-mono text-pm-xs text-content-muted">({info.serverUrl})</span></>
              : <>Local <span className="text-pm-xs text-content-muted">(IPC, fără server)</span></>}
          </dd>

          {info?.serverHealth && (
            <>
              <dt className="text-content-muted">Server</dt>
              <dd className="text-content-primary">
                <span className="text-status-green">●</span>{' '}
                <span className="font-mono text-pm-xs">
                  {info.serverHealth.status} · v{info.serverHealth.version || '?'} · {info.serverHealth.mode}
                </span>
              </dd>
            </>
          )}
        </dl>
      </section>

      {

}
      {normalizeRole(user?.role_name) === 'admin' && isServerMode() && (
        <ReleasePublisher />
      )}

      {}
      <section className="bg-surface-secondary rounded-lg border border-line p-5">
        <h2 className="text-base font-semibold text-content-primary mb-3">Runtime</h2>
        <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
          <dt className="text-content-muted">Electron</dt>
          <dd className="text-content-primary font-mono">{info?.sys?.runtime.electron ?? '—'}</dd>

          <dt className="text-content-muted">Chromium</dt>
          <dd className="text-content-primary font-mono">{info?.sys?.runtime.chrome ?? '—'}</dd>

          <dt className="text-content-muted">Node.js</dt>
          <dd className="text-content-primary font-mono">{info?.sys?.runtime.node ?? '—'}</dd>

          <dt className="text-content-muted">V8</dt>
          <dd className="text-content-primary font-mono">{info?.sys?.runtime.v8 ?? '—'}</dd>

          <dt className="text-content-muted">Locale</dt>
          <dd className="text-content-primary font-mono">{info?.sys?.app.locale ?? '—'}</dd>
        </dl>
      </section>

      {}
      <section className="bg-surface-secondary rounded-lg border border-line p-5">
        <h2 className="text-base font-semibold text-content-primary mb-3">Sistem</h2>
        <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
          <dt className="text-content-muted">OS</dt>
          <dd className="text-content-primary font-mono">
            {info?.sys ? `${info.sys.os.type} ${info.sys.os.release} (${info.sys.os.platform}/${info.sys.os.arch})` : '—'}
          </dd>

          <dt className="text-content-muted">Hostname</dt>
          <dd className="text-content-primary font-mono">
            {info?.sys ? `${info.sys.os.hostname} (${info.sys.os.username})` : '—'}
          </dd>

          <dt className="text-content-muted">CPU</dt>
          <dd className="text-content-primary font-mono text-pm-xs">
            {info?.sys ? `${info.sys.os.cpu_count}× ${info.sys.os.cpu_model ?? '—'}` : '—'}
          </dd>

          <dt className="text-content-muted">Memorie</dt>
          <dd className="text-content-primary font-mono">
            {info?.sys
              ? `${formatBytes(info.sys.os.free_memory_mb * 1024 * 1024)} liberi din ${formatBytes(info.sys.os.total_memory_mb * 1024 * 1024)}`
              : '—'}
          </dd>

          <dt className="text-content-muted">Uptime sistem</dt>
          <dd className="text-content-primary font-mono">{info?.sys ? formatUptime(info.sys.os.uptime_sec) : '—'}</dd>
        </dl>
      </section>

      {}
      <section className="bg-surface-secondary rounded-lg border border-line p-5">
        <h2 className="text-base font-semibold text-content-primary mb-3">Bază de date</h2>
        <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
          <dt className="text-content-muted">Cale</dt>
          <dd className="text-content-primary font-mono text-pm-xs break-all">{info?.sys?.db.path ?? '—'}</dd>

          <dt className="text-content-muted">Dimensiune</dt>
          <dd className="text-content-primary font-mono">{formatBytes(info?.sys?.db.size_bytes)}</dd>

          <dt className="text-content-muted">Backup-uri</dt>
          <dd className="text-content-primary">
            {info?.sys ? `${info.sys.db.backup_count} arhive` : '—'}
          </dd>

          {info?.sys?.db.last_backup && (
            <>
              <dt className="text-content-muted">Ultimul backup</dt>
              <dd className="text-content-primary font-mono text-pm-xs break-all">
                {info.sys.db.last_backup.name} · {formatBytes(info.sys.db.last_backup.bytes)} · {new Date(info.sys.db.last_backup.mtime).toLocaleString('ro-RO')}
              </dd>
            </>
          )}

          <dt className="text-content-muted">Folder backup-uri</dt>
          <dd className="text-content-primary font-mono text-pm-xs break-all">{info?.sys?.paths.backups ?? '—'}</dd>
        </dl>
      </section>

      {}
      <section className="bg-surface-secondary rounded-lg border border-line p-5">
        <h2 className="text-base font-semibold text-content-primary mb-3">Serviciu AI</h2>
        <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
          <dt className="text-content-muted">URL</dt>
          <dd className="text-content-primary font-mono text-pm-xs break-all">{info?.aiUrl ?? '—'}</dd>

          <dt className="text-content-muted">Status</dt>
          <dd className="text-content-primary">
            {info?.aiHealth?.status === 'ok'
              ? <span className="text-status-green">● Online · v{info.aiHealth.version || '?'}</span>
              : <span className="text-status-red">● Indisponibil</span>}
          </dd>

          {info?.aiHealth?.model_path && (
            <>
              <dt className="text-content-muted">Model</dt>
              <dd className="text-content-primary font-mono text-pm-xs break-all">{info.aiHealth.model_path}</dd>
            </>
          )}

          <dt className="text-content-muted">Autentificare</dt>
          <dd className="text-content-primary">
            {info?.aiHealth?.auth_required
              ? <span className="text-status-green">Activă (bearer token)</span>
              : <span className="text-status-amber">Dezactivată</span>}
          </dd>
        </dl>
      </section>

      {}
      <section className="bg-surface-secondary rounded-lg border border-line p-5">
        <h2 className="text-base font-semibold text-content-primary mb-3">Căi</h2>
        <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
          <dt className="text-content-muted">UserData</dt>
          <dd className="text-content-primary font-mono text-pm-xs break-all">{info?.sys?.paths.userData ?? '—'}</dd>

          <dt className="text-content-muted">Executabil</dt>
          <dd className="text-content-primary font-mono text-pm-xs break-all">{info?.sys?.paths.exe ?? '—'}</dd>

          <dt className="text-content-muted">Jurnale</dt>
          <dd className="text-content-primary font-mono text-pm-xs break-all">{info?.logPath || info?.sys?.paths.logs || '—'}</dd>

          <dt className="text-content-muted">Temp</dt>
          <dd className="text-content-primary font-mono text-pm-xs break-all">{info?.sys?.paths.temp ?? '—'}</dd>
        </dl>
      </section>

      {}
      <section className="bg-surface-secondary rounded-lg border border-line p-5">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="text-base font-semibold text-content-primary">Licențe software open-source</h2>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-pm-xs text-content-muted hover:text-content-primary transition-colors"
          >
            {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-status-green" /> : <Clipboard className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiat' : 'Copiază lista'}</span>
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Caută după nume, licență, ecosistem…"
            className="h-9 w-full rounded border border-line bg-surface-primary pl-8 pr-3 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <p className="text-pm-xs text-content-muted mb-3">
          {licenses.total} pachete ({filtered.length} afișate). Generat la {new Date(licenses.generated_at).toLocaleString('ro-RO')}.
        </p>

        <div className="space-y-4">
          {Object.entries(grouped).map(([eco, pkgs]) => (
            <div key={eco}>
              <h3 className="text-pm-xs font-semibold uppercase tracking-wider text-content-muted mb-2">
                {ECOSYSTEM_LABEL[eco] ?? eco} · {pkgs.length}
              </h3>
              <ul className="space-y-1">
                {pkgs.slice(0, 200).map(p => (
                  <li key={`${eco}:${p.name}:${p.version}`} className="flex items-baseline justify-between gap-3 text-pm-xs">
                    <div className="min-w-0 flex-1">
                      <span className="text-content-primary font-medium">{p.name}</span>
                      {p.version && <span className="text-content-muted ml-1.5">{p.version}</span>}
                    </div>
                    <span className="text-content-muted font-mono shrink-0">{p.license || '—'}</span>
                    {p.homepage && p.homepage.startsWith('http') && (
                      <a
                        href={p.homepage}
                        target="_blank"
                        rel="noreferrer"
                        className="text-content-muted hover:text-accent shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </li>
                ))}
                {pkgs.length > 200 && (
                  <li className="text-pm-xs text-content-muted italic">
                    …și încă {pkgs.length - 200}. Folosește căutarea ca să îngustezi lista.
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
