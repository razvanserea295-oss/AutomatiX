import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from '@/icons';
import { connect } from '@bite-ninja/rustdesk-client-web';
import { apiCommand } from '@/api/commands';
import { getStorage, STORAGE_KEYS } from '@/config/localStorage';

interface ViewerConfig {
  id_server: string;
  relay_server: string;
  key: string;
  web_ws_url: string | null;
  connect_host?: string;
}

type ViewerPhase = 'config' | 'connecting' | 'streaming' | 'error' | 'unsupported';

interface Props {
  rustdeskId: string;
  password: string;
  technicianName?: string;
  technicianId?: string;
}

function viewerWsHost(config: ViewerConfig | null): string | null {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return window.location.hostname;
  }
  const fromConfig = (config?.connect_host || config?.id_server || '')
    .replace(/^wss?:\/\//, '')
    .replace(/:.*$/, '')
    .replace(/\/.*$/, '')
    .trim();
  return fromConfig || null;
}

/**
 * Ecran remote RustDesk integrat în Automatix (canvas în pagină).
 * Necesită relay self-hosted + PROMIX_RUSTDESK_ID_SERVER și PROMIX_RUSTDESK_KEY în .env.
 */
export default function RustDeskWebViewer({
  rustdeskId,
  password,
  technicianName = 'Automatix',
  technicianId = 'support',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const connectionRef = useRef<Awaited<ReturnType<typeof connect>> | null>(null);
  const [config, setConfig] = useState<ViewerConfig | null>(null);
  const [phase, setPhase] = useState<ViewerPhase>('config');
  const [statusLine, setStatusLine] = useState('Se încarcă configurația…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiCommand<ViewerConfig>('get_remote_viewer_config')
      .then((c) => { if (alive) setConfig(c); })
      .catch(() => { if (alive) setConfig(null); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rustdeskId || !password) return;

    const host = viewerWsHost(config);
    if (!config?.key || !host) {
      setPhase('unsupported');
      setError(null);
      return;
    }

    let cancelled = false;
    let ready = false;
    let conn: Awaited<ReturnType<typeof connect>> | null = null;
    const tenantSlug = getStorage(STORAGE_KEYS.TENANT_SLUG);
    const wsHint = tenantSlug
      ? `wss://${host}/t/${tenantSlug}/ws/id`
      : `wss://${host}/ws/id`;

    setPhase('connecting');
    setStatusLine(`Conectare la ${wsHint}…`);
    setError(null);

    const timeout = window.setTimeout(() => {
      if (!cancelled && !ready) {
        setPhase('error');
        setError(
          'Conexiunea a expirat. Verificați că clientul rulează Promix-QuickSupport (cu relay configurat), '
          + 'că ID-ul și parola sunt corecte, și că relay-ul RustDesk rulează pe server.',
        );
        try { conn?.close(); } catch { /* ignore */ }
      }
    }, 45_000);

    const onError = (err: Error) => {
      if (cancelled || ready) return;
      setPhase('error');
      setError(err.message || 'Conexiune eșuată');
    };

    (async () => {
      try {
        conn = await connect({
          host,
          key: config.key,
          remoteId: rustdeskId.replace(/\s+/g, ''),
          remotePassword: password,
          name: technicianName,
          userId: technicianId,
          canvas,
        });
        if (cancelled) {
          conn.close();
          return;
        }
        connectionRef.current = conn;

        conn.on('ready', () => {
          if (cancelled) return;
          ready = true;
          window.clearTimeout(timeout);
          setPhase('streaming');
          setStatusLine('');
        });
        conn.on('error', onError);
        conn.on('close', () => {
          if (!cancelled && !ready) {
            setPhase('error');
            setError('Conexiunea s-a închis înainte de afișarea ecranului.');
          }
        });

        if (conn.status === 'ready') {
          ready = true;
          window.clearTimeout(timeout);
          setPhase('streaming');
        }
      } catch (e) {
        if (!cancelled) {
          window.clearTimeout(timeout);
          setPhase('error');
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      try { conn?.close(); } catch { /* ignore */ }
      connectionRef.current = null;
    };
  }, [config, rustdeskId, password, technicianName, technicianId]);

  if (phase === 'config' || (phase === 'connecting' && !error)) {
    return (
      <div className="flex h-[min(70vh,540px)] min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-line bg-surface-tertiary/40">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-pm-sm text-content-muted">{statusLine || 'Se conectează la ecranul remote…'}</p>
        <p className="max-w-md text-center text-pm-2xs text-content-muted">
          Prima conexiune poate dura până la 30 secunde (relay + parolă).
        </p>
      </div>
    );
  }

  if (phase === 'unsupported') {
    return (
      <div className="rounded-xl border border-status-amber/30 bg-status-amber/8 p-4 text-sm text-content-secondary">
        <p className="font-semibold text-content-primary">Viewer în Automatix indisponibil</p>
        <p className="mt-2">
          Configurați pe server variabilele{' '}
          <code className="text-pm-xs">PROMIX_RUSTDESK_ID_SERVER</code> și{' '}
          <code className="text-pm-xs">PROMIX_RUSTDESK_KEY</code>, sau folosiți butonul
          „Fereastră RustDesk” dacă aveți aplicația desktop instalată.
        </p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-status-red/30 bg-status-red/8 p-4 text-sm text-status-red">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Conexiune eșuată</p>
          <p className="mt-1">{error || 'Verificați ID-ul, parola și că relay-ul RustDesk rulează.'}</p>
          <p className="mt-2 text-pm-xs text-content-secondary">
            Clientul trebuie să fi descărcat <strong>Promix-QuickSupport.zip</strong> (exe + config relay),
            nu RustDesk generic. Pe desktop, modul „Fereastră RustDesk” este mai stabil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-black shadow-[var(--elevation-2)]">
      {phase === 'connecting' && (
        <div className="flex items-center justify-center gap-2 border-b border-line/40 bg-surface-tertiary/80 px-3 py-2 text-pm-xs text-content-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Se așteaptă primul cadru video…
        </div>
      )}
      <canvas ref={canvasRef} className="h-[min(70vh,540px)] w-full min-h-[320px]" />
    </div>
  );
}
