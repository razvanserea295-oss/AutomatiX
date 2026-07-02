import { useState, type FormEvent } from 'react';
import { KeyRound, ShieldCheck, Loader2, AlertCircle, CheckCircle2, Building2 } from '@/icons';
import GearLogo from '@/components/ui/GearLogo';
import AppBackground from '@/components/ui/AppBackground';
import { getServerUrl } from '@/config/server';
import { parseLicensePayload } from '@/shared/license';

/**
 * Pre-login license gate. Shown INSTEAD of the login form when this instance is
 * gated (PROMIX_LICENSE_GATE) and not yet licensed — so a copy of the app
 * obtained from any source cannot be used (not even logged into) without a valid
 * license key. No session exists yet, so it activates through the public
 * `/api/license/activate` endpoint, which only accepts a valid signed key and
 * only while the instance is still unlicensed. On success the app reloads,
 * licensed, and the normal login screen appears.
 */
export default function LicenseLoginGate({ onActivated }: { onActivated?: () => void }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const hint = parseLicensePayload(key.trim())?.company_name ?? null;

  async function activate(e: FormEvent) {
    e.preventDefault();
    const k = key.trim();
    if (!k) { setErr('Introdu cheia de licență.'); return; }
    if (!parseLicensePayload(k)) { setErr('Cheia nu pare validă. Copiaz-o integral, fără spații lipsă.'); return; }
    setBusy(true); setErr(null); setOk(null);
    try {
      const res = await fetch(`${getServerUrl()}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: k }),
      });
      const d = await res.json().catch(() => null) as { ok?: boolean; company_name?: string; error?: string; message?: string } | null;
      if (res.ok && d?.ok) {
        setOk(`Activat pentru ${d.company_name || 'firma ta'}. Se reîncarcă…`);
        if (onActivated) onActivated();
        setTimeout(() => window.location.reload(), 900);
        return;
      }
      setErr(
        d?.error === 'revoked' ? 'Această licență a fost revocată. Contactează furnizorul.'
        : d?.error === 'already_licensed' ? 'Instanța este deja activată. Reîncarcă pagina.'
        : d?.error === 'nokey' ? 'Serverul nu are cheia publică de licență configurată.'
        : d?.error === 'store' ? (d?.message || 'Instanța nu e migrată complet — repornește serverul.')
        : 'Cheie de licență invalidă (semnătură greșită).',
      );
    } catch {
      setErr('Eroare de rețea. Verifică conexiunea și încearcă din nou.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-page text-content-primary">
      <AppBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 py-14">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-tertiary text-content-primary ring-1 ring-line/30">
            <GearLogo size={32} />
          </span>
          <h1 className="text-display-lg font-semibold">Licență necesară</h1>
          <p className="mt-2 max-w-md text-pm-md text-content-muted">
            Această copie a aplicației nu este activată. Introdu cheia de licență primită la achiziție
            pentru a debloca autentificarea.
          </p>
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-line bg-surface-primary p-6 shadow-soft-lg">
          <form onSubmit={activate} className="flex flex-col gap-3">
            <label htmlFor="lic-key" className="flex items-center gap-2 text-pm-sm font-semibold text-content-secondary">
              <KeyRound className="h-4 w-4" /> Cheie de licență
            </label>
            <textarea
              id="lic-key"
              value={key}
              onChange={(e) => { setKey(e.target.value); if (err) setErr(null); }}
              placeholder="AX1.…"
              spellCheck={false}
              rows={4}
              autoFocus
              className="w-full resize-y rounded-xl border border-line bg-surface-secondary/50 px-3.5 py-3 font-mono text-pm-xs text-content-primary outline-none transition-smooth focus:border-accent focus-visible:shadow-[var(--ring-soft)]"
            />

            {hint && !err && !ok && (
              <div className="flex items-center gap-2 text-pm-xs text-content-muted">
                <Building2 className="h-3.5 w-3.5 shrink-0" /> Pare o cheie pentru <strong>{hint}</strong>
              </div>
            )}
            {err && (
              <div className="flex items-start gap-2 rounded-lg border-l-2 border-status-red bg-status-red/8 px-3 py-2 text-pm-xs text-content-secondary">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-red" /> <span>{err}</span>
              </div>
            )}
            {ok && (
              <div className="flex items-start gap-2 rounded-lg border-l-2 border-status-green bg-status-green/8 px-3 py-2 text-pm-xs text-content-secondary">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-green" /> <span>{ok}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-pm-md font-semibold text-[var(--color-on-accent)] shadow-[var(--elevation-2)] transition-smooth duration-150 hover:bg-accent/95 active:scale-[0.99] disabled:opacity-60 focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
              {busy ? 'Se activează…' : 'Activează și continuă'}
            </button>
          </form>

          <p className="mt-5 border-t border-line pt-4 text-pm-xs text-content-muted">
            Nu ai o cheie? Contactează furnizorul pentru a obține o licență validă pentru firma ta.
          </p>
        </div>

        <p className="mt-8 text-center text-pm-2xs text-content-muted">Automatix · activare licență</p>
      </div>
    </div>
  );
}
