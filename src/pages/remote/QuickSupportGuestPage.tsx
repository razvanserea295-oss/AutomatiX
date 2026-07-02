import { useState, useEffect, useCallback } from 'react';
import { useRoute } from 'wouter';
import {
  Loader2, AlertTriangle, Download, MonitorSmartphone, Copy, Check,
} from '@/icons';
import { getServerUrl } from '@/config/server';
import Button from '@/redesign/ui/Button';

interface PublicQuickSupportView {
  code: string;
  customer_ref: string | null;
  company_name: string;
  expires_at: string;
  download_url: string;
  instructions: string[];
  bundle_available?: boolean;
}

function formatExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ro-RO');
  } catch {
    return iso;
  }
}

export default function QuickSupportGuestPage() {
  const [, params] = useRoute('/support/q/:code');
  const code = (params?.code || '').trim().toLowerCase();
  const [data, setData] = useState<PublicQuickSupportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!code) { setError('Cod lipsă'); setLoading(false); return; }
    setLoading(true);
    const base = getServerUrl();
    const url = base
      ? `${base}/api/support/q/${encodeURIComponent(code)}`
      : `/api/support/q/${encodeURIComponent(code)}`;
    fetch(url, { headers: { 'Cache-Control': 'no-store' } })
      .then((r) => r.json().then((j) => ({ ok: r.ok, body: j })))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body?.message || 'Link invalid');
        setData(body as PublicQuickSupportView);
        setError(null);
      })
      .catch((e: Error) => { setError(e.message); setData(null); })
      .finally(() => setLoading(false));
  }, [code]);

  const downloadHref = useCallback(() => {
    if (!data) return '#';
    const base = getServerUrl();
    const path = data.download_url.startsWith('/') ? data.download_url : `/${data.download_url}`;
    return base ? `${base.replace(/\/+$/, '')}${path}` : path;
  }, [data]);

  const copyLink = () => {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-primary p-6">
        <div className="flex items-center gap-3 text-content-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Se încarcă pagina de suport…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-primary p-6">
        <div className="max-w-md rounded-2xl border border-line bg-surface-secondary p-8 text-center shadow-[var(--elevation-2)]">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-status-amber" />
          <h1 className="text-lg font-semibold text-content-primary">Link indisponibil</h1>
          <p className="mt-2 text-sm text-content-secondary">{error || 'Cod invalid sau expirat.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-surface-primary to-surface-secondary px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <MonitorSmartphone className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">
            Asistență la distanță
          </h1>
          <p className="mt-1 text-sm text-content-secondary">{data.company_name}</p>
          {data.customer_ref && (
            <p className="mt-2 text-pm-xs text-content-muted">Referință: {data.customer_ref}</p>
          )}
          <p className="mt-3 text-pm-2xs text-content-muted">
            Link valabil până la {formatExpiry(data.expires_at)}
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-line bg-surface-secondary/80 p-6 shadow-[var(--elevation-1)] backdrop-blur-sm">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-content-secondary">
            {data.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          {data.bundle_available === false && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-status-amber/40 bg-status-amber/10 px-4 py-3 text-sm text-content-secondary">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-amber" />
              <span>
                Descărcarea nu este disponibilă momentan. Contactați tehnicianul de suport — va trimite instrumentul prin alt canal.
              </span>
            </div>
          )}

          {data.bundle_available !== false ? (
            <a
              href={downloadHref()}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-[var(--color-on-accent)] shadow-[var(--elevation-2)] transition-smooth hover:bg-accent/95"
            >
              <Download className="h-5 w-5" />
              Descarcă Promix-QuickSupport.zip
            </a>
          ) : (
            <div className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-tertiary/60 text-sm text-content-muted">
              Descărcare indisponibilă
            </div>
          )}

          <p className="text-center text-pm-2xs text-content-muted">
            După ce rulați programul, comunicați tehnicianului ID-ul și parola afișate.
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <Button variant="ghost" size="sm" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Link copiat' : 'Copiază link-ul'}
          </Button>
        </div>

        <p className="mt-8 text-center text-pm-2xs text-content-muted">
          Prin continuare, permiteți accesul temporar la ecranul acestui calculator pentru asistență tehnică.
        </p>
      </div>
    </div>
  );
}
