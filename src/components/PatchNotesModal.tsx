








import { useEffect, useState } from 'react';
import { Sparkles, X, Loader2 } from '@/icons';
import { getServerUrl, isServerMode } from '@/config/server';

const SHOWN_KEY = 'automatix_patchnotes_seen_version';

interface IpcInvoke { invoke(channel: string, ...args: unknown[]): Promise<unknown>; }
function getElectronIpc(): IpcInvoke | null {
  return typeof window !== 'undefined' && 'electron' in window
    ? (window as unknown as { electron: IpcInvoke }).electron
    : null;
}

async function getAppVersion(): Promise<string | null> {
  const ipc = getElectronIpc();
  if (!ipc) return null;
  try { return (await ipc.invoke('app_get_version')) as string; }
  catch { return null; }
}

async function fetchReleaseNotes(version: string): Promise<string | null> {
  
  
  
  const base = getServerUrl().replace(/\/+$/, '');
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/release-notes/${encodeURIComponent(version)}`);
    if (!res.ok) return null;
    const j = (await res.json()) as { markdown?: string };
    return j.markdown ?? null;
  } catch { return null; }
}






function renderMarkdown(md: string): React.ReactNode {
  const lines = md.split('\n');
  const out: React.ReactNode[] = [];
  let bullets: React.ReactNode[] = [];
  const flushBullets = () => {
    if (bullets.length === 0) return;
    out.push(<ul key={`u${out.length}`} className="list-disc pl-5 space-y-1 my-2">{bullets}</ul>);
    bullets = [];
  };
  const renderInline = (s: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let rest = s;
    let key = 0;
    const re = /(\*\*[^*]+\*\*|`[^`]+`)/;
    while (rest.length) {
      const m = rest.match(re);
      if (!m || m.index === undefined) { parts.push(rest); break; }
      if (m.index > 0) parts.push(rest.slice(0, m.index));
      const tok = m[0];
      if (tok.startsWith('**')) parts.push(<strong key={`b${key++}`}>{tok.slice(2, -2)}</strong>);
      else parts.push(<code key={`c${key++}`} className="font-mono text-pm-2xs px-1 py-0.5 bg-surface-tertiary rounded">{tok.slice(1, -1)}</code>);
      rest = rest.slice(m.index + tok.length);
    }
    return parts;
  };
  for (const line of lines) {
    if (line.startsWith('### ')) {
      flushBullets();
      out.push(<h3 key={`h${out.length}`} className="text-pm-eyebrow text-accent mt-4 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith('- ')) {
      bullets.push(<li key={`l${bullets.length}`} className="text-pm-sm text-content-secondary">{renderInline(line.slice(2))}</li>);
    } else if (line.trim()) {
      flushBullets();
      out.push(<p key={`p${out.length}`} className="text-pm-sm text-content-secondary my-1.5">{renderInline(line)}</p>);
    }
  }
  flushBullets();
  return out;
}

export default function PatchNotesModal() {
  const [version, setVersion] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      
      const ipc = getElectronIpc();
      if (!ipc) { setLoading(false); return; }

      const v = await getAppVersion();
      if (!v || cancelled) { setLoading(false); return; }

      const seen = localStorage.getItem(SHOWN_KEY);
      if (seen === v) { setLoading(false); return; }  

      
      
      
      if (!isServerMode()) {
        
        localStorage.setItem(SHOWN_KEY, v);
        setLoading(false);
        return;
      }

      const md = await fetchReleaseNotes(v);
      if (cancelled) return;
      if (md) {
        setVersion(v);
        setMarkdown(md);
        setOpen(true);
      } else {
        
        localStorage.setItem(SHOWN_KEY, v);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = () => {
    if (version) localStorage.setItem(SHOWN_KEY, version);
    setOpen(false);
  };

  if (loading || !open || !markdown || !version) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Note de versiune"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[85vh] flex flex-col bg-surface-elevated border border-line shadow-soft-lg overflow-hidden"
      >
        <header className="flex items-center gap-3 px-5 py-4 border-b border-line shrink-0">
          <Sparkles className="h-4 w-4 text-accent" />
          <div className="flex-1 min-w-0">
            <p className="text-pm-eyebrow text-content-muted">Versiune nouă instalată</p>
            <h2 className="text-pm-md font-semibold text-content-primary truncate">automatiX {version}</h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Închide"
            className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {renderMarkdown(markdown)}
        </div>

        <footer className="flex justify-end px-5 py-3 border-t border-line shrink-0">
          <button
            type="button"
            onClick={dismiss}
            className="h-8 px-4 bg-accent text-on-accent text-pm-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Am înțeles
          </button>
        </footer>
      </div>
    </div>
  );
}

export function _PatchNotesLoading() {
  return (
    <div className="fixed bottom-4 right-4 z-[99] flex items-center gap-2 text-pm-2xs text-content-muted">
      <Loader2 className="h-3 w-3 animate-spin" />
    </div>
  );
}
