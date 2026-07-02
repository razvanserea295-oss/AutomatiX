import { useState, type FormEvent } from 'react';
import { KeyRound, ShieldCheck, Loader2, AlertCircle, CheckCircle2, LogOut, Building2 } from '@/icons';
import GearLogo from '@/components/ui/GearLogo';
import AppBackground from '@/components/ui/AppBackground';
import { apiCommand } from '@/api/commands';
import { useAuthStore } from '@/store/authStore';
import { STORAGE_KEYS, getStorage } from '@/config/localStorage';
import { parseLicensePayload } from '@/shared/license';

/**
 * Per-tenant license activation. Shown when the firm's instance is gated
 * (requires_license). An admin pastes the signed key → import_license binds it
 * to this tenant → the app reloads, now licensed. Non-admins are told to ask one.
 */
export default function LicenseActivationPage({
  isAdmin,
  onLogout,
}: {
  isAdmin: boolean;
  onLogout: () => void | Promise<void>;
}) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const clearLicenseRequirement = useAuthStore((s) => s.clearLicenseRequirement);

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
      const slug = getStorage(STORAGE_KEYS.TENANT_SLUG) || '';
      const res = await apiCommand<{ ok: boolean; company_name?: string }>('import_license', {
        token,
        license_token: k,
        tenant_slug: slug,
      });
      setOk(`Activat pentru ${res.company_name || 'firma ta'}. Se reîncarcă aplicația…`);
      clearLicenseRequirement();
      setTimeout(() => window.location.reload(), 900);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Activare eșuată. Verifică cheia și încearcă din nou.');
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
          <h1 className="text-display-lg font-semibold">Activează Automatix</h1>
          <p className="mt-2 max-w-md text-pm-md text-content-muted">
            Această firmă nu are încă o licență activă. {isAdmin
              ? 'Introdu cheia de licență primită la achiziție pentru a debloca aplicația.'
              : 'Cere unui administrator să introducă cheia de licență.'}
          </p>
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-line bg-surface-primary p-6 shadow-soft-lg">
          {isAdmin ? (
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
                {busy ? 'Se activează…' : 'Activează'}
              </button>
            </form>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border-l-2 border-status-amber bg-status-amber/8 px-4 py-3 text-pm-sm text-content-secondary">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-status-amber" />
              <span>Contul tău nu are drepturi de administrator. Contactează un administrator al firmei pentru a activa licența.</span>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-pm-xs text-content-muted">
            <span className="truncate">{user?.full_name || user?.username}</span>
            <button onClick={() => onLogout()} className="inline-flex items-center gap-1.5 text-content-secondary transition-smooth hover:text-content-primary">
              <LogOut className="h-3.5 w-3.5" /> Deconectare
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-pm-2xs text-content-muted">Automatix · activare licență</p>
      </div>
    </div>
  );
}
