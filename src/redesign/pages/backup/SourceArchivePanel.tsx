import { useState, useEffect, useRef } from 'react';
import { Archive, Copy, Check, Download, ShieldAlert, Loader2, Upload, RotateCw, AlertTriangle } from '@/icons';
import Card, { CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { apiCommand } from '@/api/commands';
import { getServerUrl } from '@/config/server';
import { STORAGE_KEYS, getStorage } from '@/config/localStorage';
import type { User } from '@/core/types';

interface LinkResult {
  path: string;
  token: string;
  expiresAt: string;
  expiresInMinutes: number;
}

interface UpdateResult {
  ok?: boolean;
  applied?: number;
  skipped?: number;
  backup?: string;
  restarting?: boolean;
  message?: string;
  log?: string[];
}

interface Props {
  user: User | null;
}

const TTL_OPTIONS = [
  { label: '30 minute', value: 30 },
  { label: '1 oră', value: 60 },
  { label: '4 ore', value: 240 },
];

export default function SourceArchivePanel({ user }: Props) {
  const isAdmin = (user?.role_name || '').toLowerCase() === 'admin';

  // ── download link state ──
  const [minutes, setMinutes] = useState(60);
  const [link, setLink] = useState<LinkResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── upload / update state ──
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>('');
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [updErr, setUpdErr] = useState<string | null>(null);

  // ── restart state ──
  const [restartAllowed, setRestartAllowed] = useState(false);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    apiCommand<{ allowed: boolean }>('app_restart_allowed')
      .then((r) => setRestartAllowed(!!r.allowed))
      .catch(() => setRestartAllowed(false));
  }, [isAdmin]);

  const absoluteUrl = link ? `${window.location.origin}${link.path}` : '';

  async function generate() {
    setBusy(true); setError(null); setCopied(false);
    try {
      setLink(await apiCommand<LinkResult>('create_source_archive_link', { minutes }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nu am putut genera linkul.');
    } finally { setBusy(false); }
  }

  async function copy() {
    if (!absoluteUrl) return;
    try { await navigator.clipboard.writeText(absoluteUrl); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setError('Copierea în clipboard a eșuat — selectează manual linkul.'); }
  }

  function pickFile(f: File | null) {
    setResult(null); setUpdErr(null); setProgress(0); setPhase('');
    if (f && !/\.zip$/i.test(f.name)) { setUpdErr('Acceptat doar fișier .zip.'); setFile(null); return; }
    setFile(f);
  }

  async function uploadUpdate() {
    if (!file) return;
    if (!window.confirm(
      'ACTUALIZEZI APLICAȚIA DE PRODUCȚIE cu fișierele din acest zip.\n\n' +
      'Se face backup automat, apoi rebuild; dacă build-ul eșuează se revine automat (rollback). ' +
      'La succes, serverul repornește.\n\nContinui?'
    )) return;

    setUploading(true); setProgress(0); setResult(null); setUpdErr(null);
    setPhase('Se încarcă arhiva…');
    try {
      const url = `${getServerUrl().replace(/\/+$/, '')}/api/source-archive/upload`;
      const token = getStorage(STORAGE_KEYS.TOKEN);
      const res = await new Promise<UpdateResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const p = Math.round((e.loaded / e.total) * 100);
            setProgress(p);
            if (p >= 100) setPhase('Backup + build pe server (poate dura ~30s)…');
          }
        };
        xhr.onload = () => {
          let j: UpdateResult = {};
          try { j = JSON.parse(xhr.responseText) as UpdateResult; } catch { /* noop */ }
          if (xhr.status >= 200 && xhr.status < 300) resolve(j);
          else reject(Object.assign(new Error(j.message || `HTTP ${xhr.status}`), { log: j.log }));
        };
        xhr.onerror = () => reject(new Error('Eroare de rețea în timpul upload-ului.'));
        xhr.send(file);
      });
      setResult(res);
      setPhase(res.restarting ? 'Update aplicat — serverul repornește…' : 'Update aplicat.');
    } catch (e) {
      const err = e as Error & { log?: string[] };
      setUpdErr(err.message || 'Update eșuat.');
      if (err.log) setResult({ log: err.log, message: err.message });
    } finally {
      setUploading(false);
    }
  }

  async function restartServer() {
    if (!window.confirm('Repornești serverul de producție acum?')) return;
    setRestarting(true);
    try {
      await apiCommand('app_restart');
      setPhase('Restart inițiat — serverul revine în câteva secunde.');
    } catch (e) {
      setUpdErr(e instanceof Error ? e.message : 'Restart eșuat.');
    } finally {
      window.setTimeout(() => setRestarting(false), 4000);
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-pm-md text-content-muted">
        Doar administratorii pot gestiona arhiva codului sursă.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 md:p-6">
      {/* ── DOWNLOAD ── */}
      <Card padding="md" className="anim-slide-up">
        <CardBody padding="lg" className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex items-center justify-center rounded-lg bg-accent-muted p-2 text-accent"><Archive className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 className="text-pm-lg font-semibold text-content-primary">Descarcă arhiva codului sursă</h2>
              <p className="mt-1 text-pm-md text-content-secondary">
                Generează un link temporar pentru a descărca tot codul sursă de pe orice device. Arhiva <strong>nu</strong> include
                <code> node_modules</code>, baza de date, build-urile sau secretele.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-pm-md text-content-secondary" htmlFor="ttl">Valabilitate link:</label>
            <select id="ttl" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}
              className="h-9 rounded-xl border border-line bg-surface-secondary px-3 text-pm-md text-content-primary transition-smooth duration-150 hover:border-line/80 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">
              {TTL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <Button variant="primary" onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              Generează link
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-status-red/12 px-3 py-2 text-pm-md text-status-red anim-fade-slide-in">
              <ShieldAlert className="h-4 w-4 shrink-0" /> <span className="min-w-0">{error}</span>
            </div>
          )}

          {link && (
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-secondary p-4 anim-fade-slide-in">
              <div className="text-pm-eyebrow uppercase text-content-muted">
                Link valabil ~{link.expiresInMinutes} min (până la {new Date(link.expiresAt).toLocaleString('ro-RO')})
              </div>
              <code className="block break-all rounded-lg bg-surface-primary px-3 py-2 text-pm-sm text-content-primary">{absoluteUrl}</code>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={copy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copiat' : 'Copiază link'}
                </Button>
                <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                  <Button variant="primary" size="sm"><Download className="h-4 w-4" /> Descarcă acum</Button>
                </a>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── UPLOAD / UPDATE ── */}
      <Card padding="md" className="anim-slide-up">
        <CardBody padding="lg" className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex items-center justify-center rounded-lg bg-status-amber/12 p-2 text-status-amber"><Upload className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 className="text-pm-lg font-semibold text-content-primary">Încarcă modificările și actualizează aplicația</h2>
              <p className="mt-1 text-pm-md text-content-secondary">
                Încarcă zip-ul cu codul sursă modificat (același format ca arhiva descărcată). Serverul face <strong>backup</strong>,
                suprascrie sursa (fără <code>data</code>/secrete), <strong>rebuild</strong> (tsc + vite) și — la succes — <strong>repornește</strong>.
                Dacă build-ul eșuează, se face <strong>rollback automat</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-status-amber/12 px-3 py-2 text-pm-sm text-status-amber">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="min-w-0">Operațiune asupra producției. Nu se rulează <code>npm install</code> — dacă ai adăugat un pachet nou, build-ul va eșua (și va face rollback).</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileRef} type="file" accept=".zip" className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] || null)} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4" /> Alege zip…
            </Button>
            {file && <span className="min-w-0 truncate text-pm-md text-content-primary">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>}
            <Button variant="danger" onClick={uploadUpdate} disabled={!file || uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Încarcă și actualizează
            </Button>
          </div>

          {uploading && (
            <div className="flex flex-col gap-1 anim-fade-slide-in">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
                <div className="h-full rounded-full bg-accent transition-smooth duration-150" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-pm-sm text-content-muted tabular-nums">{phase || `${progress}%`}</span>
            </div>
          )}

          {updErr && (
            <div className="flex items-center gap-2 rounded-xl bg-status-red/12 px-3 py-2 text-pm-md text-status-red anim-fade-slide-in">
              <ShieldAlert className="h-4 w-4 shrink-0" /> <span className="min-w-0">{updErr}</span>
            </div>
          )}

          {result?.ok && (
            <div className="rounded-xl bg-status-green/12 px-3 py-2 text-pm-md text-status-green anim-fade-slide-in">
              ✓ {result.applied} fișiere aplicate. Backup: <code>{result.backup}</code>. {result.restarting && 'Serverul repornește — reîncarcă pagina în ~10s.'}
            </div>
          )}

          {result?.log && result.log.length > 0 && (
            <pre className="max-h-56 overflow-auto rounded-xl bg-surface-secondary p-3 text-pm-sm text-content-muted whitespace-pre-wrap anim-fade-slide-in">
{result.log.join('\n')}
            </pre>
          )}
        </CardBody>
      </Card>

      {/* ── RESTART (restricted user) ── */}
      {restartAllowed && (
        <Card padding="md" className="anim-slide-up">
          <CardBody padding="lg" className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-pm-lg font-semibold text-content-primary">Repornire server</h2>
              <p className="mt-1 text-pm-md text-content-secondary">Repornește serverul de producție (fără UAC). Disponibil doar pentru contul tău.</p>
            </div>
            <Button variant="secondary" onClick={restartServer} disabled={restarting}>
              {restarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
              Repornește serverul
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
