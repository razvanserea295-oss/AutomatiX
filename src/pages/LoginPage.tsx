import { useState, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { Loader2, Server, Wifi, WifiOff, Eye, EyeOff, ShieldCheck, User, Lock } from 'lucide-react';
import { getServerUrl, setServerUrl, isServerReachable } from '@/config/server';
import { STORAGE_KEYS, getStorage, setStorage, removeStorage } from '@/config/localStorage';
import GearLogo from '@/components/ui/GearLogo';
import AppBackground from '@/components/ui/AppBackground';
import LoginEnhancements, { reportFailedAttempt, clearFailedAttempts, recordSession } from '@/pages/LoginEnhancements';
import { useAuthStore } from '@/store/authStore';

interface LoginPageProps {
  




  onLogin: (username: string, password: string) => Promise<{ requires2FA: boolean }>;
}












export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState(() => getStorage(STORAGE_KEYS.REMEMBER_USERNAME));
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => getStorage(STORAGE_KEYS.REMEMBER_ME) === '1');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [serverUrl, setServerUrlLocal] = useState(getServerUrl());
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [showServer, setShowServer] = useState(false);
  
  
  const [demoMode, setDemoMode] = useState(false);
  useEffect(() => {
    fetch(`${getServerUrl()}/api/health`).then(r => r.json()).then(h => setDemoMode(!!h?.demo)).catch(() => {});
  }, []);

  
  
  
  const _w = window as unknown as { electron?: unknown; location?: Location };
  const isWebBrowser =
    typeof window !== 'undefined' &&
    !('electron' in _w) &&
    _w.location &&
    (_w.location.protocol === 'http:' || _w.location.protocol === 'https:');

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    if (serverUrl) {
      isServerReachable(serverUrl).then(ok => { setServerOk(ok); if (!ok && !isWebBrowser) setShowServer(true); });
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleServerSave = async () => {
    const trimmed = serverUrl.trim().replace(/\/+$/, '');
    setServerUrlLocal(trimmed);
    setServerUrl(trimmed);
    if (trimmed) {
      const ok = await isServerReachable(trimmed);
      setServerOk(ok);
      setError(ok ? null : 'Server inaccesibil');
    }
  };

  
  
  const pending2FA = useAuthStore(s => s.pending2FAChallenge);
  const verify2FA  = useAuthStore(s => s.verify2FA);
  const cancel2FA  = useAuthStore(s => s.cancel2FA);
  const [twoFaCode, setTwoFaCode] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    
    
    
    
    {
      
      
      
      const env = (import.meta as { env?: Record<string, string> }).env ?? {};
      const triggerUser = (env.VITE_DEMO_TRIGGER_USER || 'demo').trim().toLowerCase();
      const triggerPass = env.VITE_DEMO_TRIGGER_PASS || 'demodemo';
      if (!demoMode && username.trim().toLowerCase() === triggerUser && password === triggerPass) {
        const base = env.VITE_DEMO_URL || `${window.location.protocol}//${window.location.hostname}:3600`;
        window.location.href = `${base.replace(/\/+$/, '')}/?demo=auto`;
        return;
      }
    }
    setError(null);
    setLoading(true);
    try {
      const result = await onLogin(username, password);
      if (result.requires2FA) {
        
        setLoading(false);
        return;
      }
      clearFailedAttempts();
      recordSession(username);
      
      if (rememberMe) {
        setStorage(STORAGE_KEYS.REMEMBER_USERNAME, username);
        setStorage(STORAGE_KEYS.REMEMBER_ME, '1');
        
        if ('electron' in window) {
          try { await window.electron.invoke('creds_save', { username, password }); } catch {  }
        }
      } else {
        removeStorage(STORAGE_KEYS.REMEMBER_USERNAME);
        removeStorage(STORAGE_KEYS.REMEMBER_ME);
        if ('electron' in window) {
          try { await window.electron.invoke('creds_clear'); } catch {  }
        }
      }
    }
    catch (err: unknown) {
      reportFailedAttempt(username);
      setError(err instanceof Error ? err.message : 'Autentificare eșuată');
    }
    finally { setLoading(false); }
  };

  
  const handleDemoLogin = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const result = await onLogin('demo', 'demodemo');
      if (result.requires2FA) { setLoading(false); return; }
      clearFailedAttempts();
      recordSession('demo');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Autentificare eșuată');
    } finally {
      setLoading(false);
    }
  };

  
  
  useEffect(() => {
    if (demoMode && new URLSearchParams(window.location.search).get('demo') === 'auto') void handleDemoLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode]);

  const handle2FASubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!/^\d{6}$/.test(twoFaCode)) {
      setError('Codul trebuie să aibă 6 cifre');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verify2FA(twoFaCode);
      clearFailedAttempts();
      recordSession(username);
      if (rememberMe) {
        setStorage(STORAGE_KEYS.REMEMBER_USERNAME, username);
        setStorage(STORAGE_KEYS.REMEMBER_ME, '1');
        
        
        
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cod 2FA invalid');
      setTwoFaCode('');
    } finally {
      setLoading(false);
    }
  };

  const handle2FACancel = () => {
    cancel2FA();
    setTwoFaCode('');
    setPassword('');
    setError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && !loading) void handleSubmit(e);
  };

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-surface-page px-4 py-10">
      {}
      <AppBackground />

      <div
        className={[
          'relative z-10 w-full max-w-[400px] transition-all ease-[cubic-bezier(0.32,0.72,0,1)]',
          'motion-safe:duration-700',
          mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-[0.97]',
        ].join(' ')}
      >
        {}
        <div
          className={[
            'mb-8 flex flex-col items-center text-center transition-all ease-out',
            'motion-safe:delay-150 motion-safe:duration-700',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
          ].join(' ')}
        >
          <span
            className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-line/60 bg-surface-primary/80 backdrop-blur-xl shadow-[var(--elevation-3)]"
          >
            <GearLogo size={36} />
          </span>
          <h1 className="text-pm-2xl font-semibold leading-tight tracking-[-0.02em] text-content-primary">
            Automatix
          </h1>
          <p className="mt-1 text-pm-sm font-normal text-content-muted">
            Conectează-te pentru a continua
          </p>
        </div>

        {}
        <div className="glass-floating rounded-3xl border border-line/70 p-8 enter-scale" style={{ animationDelay: '120ms' }}>
          {pending2FA ? (
            
            <div className="anim-fade-slide-in">
              <div className="mb-5 flex flex-col items-center text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/25">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <h2 className="text-pm-lg font-semibold text-content-primary">Verificare în doi pași</h2>
                <p className="mt-1 max-w-[260px] text-pm-xs leading-relaxed text-content-muted">
                  Deschide aplicația de autentificare și introdu codul curent de 6 cifre.
                </p>
              </div>

              <form onSubmit={handle2FASubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="login-2fa-code" className="sr-only">Cod 2FA</label>
                  <input
                    id="login-2fa-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={loading}
                    placeholder="000000"
                    autoFocus
                    aria-invalid={!!error}
                    className="h-12 w-full rounded-xl border border-line/70 bg-surface-secondary/80 text-center font-mono text-pm-xl tracking-[0.45em] text-content-primary placeholder:text-content-muted/40 transition-all duration-200 focus:outline-none focus:border-accent focus:bg-surface-primary focus:shadow-[var(--ring-soft)] disabled:opacity-50"
                  />
                </div>

                <InlineError error={error} />

                <div className="flex items-center gap-3">
                  <button type="button" onClick={handle2FACancel} disabled={loading}
                    className="h-11 flex-1 rounded-xl border border-line/70 bg-surface-secondary/50 px-4 text-pm-sm font-medium text-content-secondary transition-smooth duration-150 hover:bg-surface-tertiary hover:border-line active:scale-[0.98] focus:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-50">
                    Înapoi
                  </button>
                  <PrimaryButton loading={loading} disabled={loading || twoFaCode.length !== 6} label="Verifică" loadingLabel="Se verifică…" />
                </div>
              </form>
            </div>
          ) : (
            
            <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate className="space-y-5">
              {}
              {demoMode && (
                <div className="space-y-2 rounded-xl border border-accent/40 bg-accent-muted/50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-pm-2xs font-bold uppercase tracking-wide text-[var(--color-on-accent)]">Demo</span>
                    <span className="text-pm-xs text-content-secondary">Date fictive de prezentare — nimic real.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-pm-sm font-semibold text-[var(--color-on-accent)] transition-smooth duration-150 hover:opacity-90 active:scale-[0.98] focus:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-50"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Intră în demo
                  </button>
                  <p className="text-center text-pm-2xs text-content-muted">sau manual — utilizator <strong>demo</strong> · parolă <strong>demodemo</strong></p>
                </div>
              )}
              {
}
              <div className="overflow-hidden rounded-xl border border-line/70 bg-surface-secondary/60 transition-all duration-200 focus-within:border-accent/70 focus-within:shadow-[0_0_0_4px_var(--color-accent-muted)]">
                {}
                <div className="relative flex items-center">
                  <User aria-hidden className="pointer-events-none absolute left-3 h-4 w-4 text-content-muted/70" />
                  <label htmlFor="login-username" className="sr-only">Utilizator</label>
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    autoComplete="username"
                    autoFocus
                    placeholder="Utilizator"
                    className="h-12 w-full bg-transparent pl-10 pr-3 text-pm-md text-content-primary placeholder:text-content-muted/55 focus:outline-none disabled:opacity-50"
                  />
                </div>
                {}
                <div aria-hidden className="mx-3 h-px bg-line/60" />
                {}
                <div className="relative flex items-center">
                  <Lock aria-hidden className="pointer-events-none absolute left-3 h-4 w-4 text-content-muted/70" />
                  <label htmlFor="login-password" className="sr-only">Parolă</label>
                  <input
                    id="login-password"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                    placeholder="Parolă"
                    aria-invalid={!!error}
                    className="h-12 w-full bg-transparent pl-10 pr-12 text-pm-md text-content-primary placeholder:text-content-muted/55 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-content-muted/70 transition-smooth duration-150 hover:bg-surface-tertiary/70 hover:text-content-primary active:scale-95 focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
                    tabIndex={-1}
                    aria-label={showPwd ? 'Ascunde parola' : 'Afișează parola'}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {}
              <label className="flex cursor-pointer select-none items-center justify-between">
                <span className="text-pm-sm text-content-secondary">Ține-mă logat</span>
                <span className="relative inline-flex">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer h-[26px] w-11 cursor-pointer appearance-none rounded-full bg-surface-tertiary transition-colors duration-200 checked:bg-accent focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
                    role="switch"
                    aria-checked={rememberMe}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-surface-primary shadow-[var(--elevation-2)] transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] peer-checked:translate-x-[18px]"
                  />
                </span>
              </label>

              <InlineError error={error} />

              {}
              <PrimaryButton loading={loading} disabled={loading} label="Conectează-te" loadingLabel="Se conectează…" />

              {}
              <div className="!mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowServer((v) => !v)}
                  className="rounded-md px-1 py-0.5 text-pm-xs text-accent/90 transition-colors duration-150 hover:text-accent hover:underline underline-offset-2 focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
                >
                  Probleme la conectare?
                </button>
                {isWebBrowser && getStorage(STORAGE_KEYS.TENANT_SLUG) && (
                  <>
                    <span className="mx-2 text-content-muted/40">·</span>
                    <button
                      type="button"
                      onClick={() => { window.localStorage.removeItem(STORAGE_KEYS.TENANT_SLUG); window.location.reload(); }}
                      className="rounded-md px-1 py-0.5 text-pm-xs text-content-muted transition-colors duration-150 hover:text-content-secondary hover:underline underline-offset-2 focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
                    >
                      Schimbă firma
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>

        {}
        <div className="mt-3 rounded-2xl border border-line/50 bg-surface-primary/40 px-5 py-3 backdrop-blur-xl">
          <LoginEnhancements username={username} onPickServer={(u) => setServerUrlLocal(u)} />
        </div>

        {}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowServer(!showServer)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line/50 bg-surface-primary/40 px-3 py-1 text-pm-2xs text-content-muted backdrop-blur-xl transition-smooth duration-150 hover:border-line hover:text-content-secondary active:scale-[0.98] focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
          >
            {serverOk === false ? (
              <WifiOff className="h-3 w-3 text-status-red" />
            ) : serverOk === true ? (
              <Wifi className="h-3 w-3 text-status-green" />
            ) : (
              <Server className="h-3 w-3" />
            )}
            <span className={`min-w-0 max-w-[260px] truncate ${serverOk === false ? 'text-status-red' : serverOk === true ? 'text-status-green' : ''}`}>
              {serverOk === false ? 'Server inaccesibil' : serverUrl ? serverUrl : 'Configurează server'}
            </span>
          </button>
          {showServer && (
            <div className="mx-auto mt-3 max-w-[340px] space-y-2 anim-fade-slide-in">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => isWebBrowser ? undefined : setServerUrlLocal(e.target.value)}
                readOnly={isWebBrowser}
                placeholder="http://192.168.1.12:3500"
                title={isWebBrowser ? 'În browser, URL-ul este fixat la adresa de unde s-a încărcat pagina.' : undefined}
                className={`h-10 w-full rounded-xl border border-line/70 bg-surface-secondary/60 px-3 text-pm-xs text-content-primary placeholder:text-content-muted/50 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:border-accent/70 focus:shadow-[0_0_0_4px_var(--color-accent-muted)] ${isWebBrowser ? 'cursor-not-allowed opacity-70' : ''}`}
              />
              <button
                type="button"
                onClick={handleServerSave}
                className="h-10 w-full rounded-xl border border-line/70 bg-surface-secondary/50 text-pm-xs font-medium text-content-primary transition-smooth duration-150 hover:bg-surface-tertiary hover:border-line active:scale-[0.98] focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
              >
                Testează conexiunea
              </button>
            </div>
          )}
        </div>

        {}
        <p className="mt-7 text-center text-pm-2xs text-content-muted/80">
          <span className="tabular-nums">v1.1.4</span> · Promix Technologies
        </p>
      </div>
    </div>
  );
}


function InlineError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div role="alert" aria-live="assertive" className="anim-fade-slide-in text-center">
      <p className="text-pm-xs font-medium text-status-red">{error}</p>
    </div>
  );
}


function PrimaryButton({
  loading, disabled, label, loadingLabel,
}: {
  loading: boolean; disabled: boolean; label: string; loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={[
        'flex h-11 w-full flex-1 items-center justify-center gap-2 rounded-xl',
        'bg-accent text-pm-md font-semibold text-[var(--color-on-accent)]',
        'shadow-[0_2px_12px_var(--color-accent-muted)]',
        'transition-all duration-150 ease-out',
        'hover:brightness-[1.07] active:scale-[0.98] active:brightness-95',
        'focus:outline-none focus-visible:shadow-[var(--ring-soft)]',
        'disabled:pointer-events-none disabled:opacity-55 disabled:saturate-[0.8] disabled:shadow-none',
      ].join(' ')}
    >
      {loading ? (
        <><Loader2 className="h-4 w-4 animate-spin" /><span>{loadingLabel}</span></>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}
