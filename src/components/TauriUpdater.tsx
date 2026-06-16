




import { useEffect, useState } from 'react';
import { isTauri, checkForUpdate, installPendingUpdate, type UpdateInfo } from '@/lib/tauriUpdater';

export default function TauriUpdater() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    
    const t = setTimeout(async () => {
      const info = await checkForUpdate();
      if (!cancelled && info) setUpdate(info);
    }, 4000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  if (!update || dismissed) return null;

  async function onInstall() {
    setError(false);
    setInstalling(true);
    try {
      await installPendingUpdate((p) => setPct(p));
      
    } catch (e) {
      console.error('[updater] install failed:', e);
      setError(true);
      setInstalling(false);
    }
  }

  const card: React.CSSProperties = {
    position: 'fixed',
    right: 16,
    bottom: 16,
    zIndex: 2147483600,
    width: 340,
    maxWidth: 'calc(100vw - 32px)',
    background: 'var(--color-bg-elevated, #fff)',
    color: 'var(--color-text-primary, #111)',
    border: '1px solid var(--color-border, #e4e4e4)',
    borderRadius: 14,
    boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
    padding: 16,
    fontFamily: 'inherit',
    animation: 'au-updater-in .35s cubic-bezier(.16,1,.3,1)',
  };
  const accent = 'var(--color-accent, #059669)';

  return (
    <div role="status" aria-live="polite" style={card}>
      <style>{`@keyframes au-updater-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: accent }} />
        <strong style={{ fontSize: 14 }}>Actualizare disponibilă</strong>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted, #8a8a8a)' }}>
          v{update.version}
        </span>
      </div>

      <p style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--color-text-secondary, #555)' }}>
        {installing
          ? pct == null
            ? 'Se instalează… aplicația va reporni automat.'
            : pct < 100
              ? `Se descarcă… ${pct}%`
              : 'Se instalează… aplicația va reporni automat.'
          : error
            ? 'Instalarea a eșuat. Verifică conexiunea și încearcă din nou.'
            : update.notes
              ? truncate(update.notes, 180)
              : `O versiune nouă (v${update.version}) este gata de instalat.`}
      </p>

      {installing && (
        <div style={{ height: 6, borderRadius: 99, background: 'var(--color-bg-tertiary, #ececec)', overflow: 'hidden', marginBottom: 12 }}>
          <div
            style={{
              height: '100%',
              width: pct == null ? '100%' : `${pct}%`,
              background: accent,
              borderRadius: 99,
              transition: 'width .2s ease',
              opacity: pct == null ? 0.6 : 1,
            }}
          />
        </div>
      )}

      {!installing && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => setDismissed(true)} style={btn(false)}>
            Mai târziu
          </button>
          <button onClick={onInstall} style={btn(true, accent)}>
            {error ? 'Reîncearcă' : 'Instalează acum'}
          </button>
        </div>
      )}
    </div>
  );
}

function btn(primary: boolean, accent?: string): React.CSSProperties {
  return {
    appearance: 'none',
    border: primary ? 'none' : '1px solid var(--color-border, #e4e4e4)',
    background: primary ? accent : 'transparent',
    color: primary ? '#fff' : 'var(--color-text-secondary, #555)',
    fontSize: 12.5,
    fontWeight: 600,
    padding: '7px 14px',
    borderRadius: 9,
    cursor: 'pointer',
  };
}

function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
}
