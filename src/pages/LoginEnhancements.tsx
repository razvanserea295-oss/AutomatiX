





import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Search, Lock, Fingerprint, History, Mail, Loader2, X, AlertTriangle } from '@/icons';
import { useLocalStorage } from '@/components/enhancements/useLocalStorage';
import { setServerUrl } from '@/config/server';
import { toast } from '@/store/toastStore';

interface SessionRecord { id: string; username: string; ts: string; device: string }

const FAIL_KEY = 'promix_login_fails_v1';
const SESSIONS_KEY = 'promix_login_sessions_v1';






const MAX_FAILS = 5;
const LOCK_MINUTES = 5;

interface FailState { count: number; lockedUntil: number | null }

export function reportFailedAttempt(username: string) {
  try {
    const raw = localStorage.getItem(FAIL_KEY);
    const state: FailState = raw ? JSON.parse(raw) : { count: 0, lockedUntil: null };
    state.count = (state.count || 0) + 1;
    if (state.count >= MAX_FAILS) {
      state.lockedUntil = Date.now() + LOCK_MINUTES * 60 * 1000;
    }
    localStorage.setItem(FAIL_KEY, JSON.stringify(state));
    void username;
  } catch {  }
}

export function clearFailedAttempts() {
  localStorage.removeItem(FAIL_KEY);
}

export function recordSession(username: string) {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    const list: SessionRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift({
      id: `${Date.now()}`,
      username,
      ts: new Date().toISOString(),
      device: navigator.userAgent.split(')')[0].split('(')[1] || 'unknown',
    });
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {  }
}



function LockoutBadge() {
  const [state, setState] = useState<FailState>(() => {
    try {
      const raw = localStorage.getItem(FAIL_KEY);
      return raw ? JSON.parse(raw) : { count: 0, lockedUntil: null };
    } catch { return { count: 0, lockedUntil: null }; }
  });

  useEffect(() => {
    const t = setInterval(() => {
      try {
        const raw = localStorage.getItem(FAIL_KEY);
        setState(raw ? JSON.parse(raw) : { count: 0, lockedUntil: null });
      } catch {  }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  if (!state.count || state.count < 2) return null;
  const lockedSec = state.lockedUntil ? Math.max(0, Math.ceil((state.lockedUntil - Date.now()) / 1000)) : 0;

  if (lockedSec > 0) {
    return (
      <div className="anim-fade-slide-in flex items-center gap-2 rounded-xl border border-status-red/30 bg-status-red/5 px-3 py-2 text-pm-xs text-status-red">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1">Cont blocat temporar — încearcă din nou în {Math.ceil(lockedSec / 60)} min.</span>
      </div>
    );
  }
  return (
    <div className="anim-fade-slide-in flex items-center gap-2 rounded-xl border border-status-amber/30 bg-status-amber/5 px-3 py-2 text-pm-xs text-status-amber">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1">{state.count}/{MAX_FAILS} încercări nereușite — după {MAX_FAILS} contul se blochează {LOCK_MINUTES} min.</span>
    </div>
  );
}







function TotpField({ username }: { username: string }) {
  const [code, setCode] = useState('');
  const [enabled] = useLocalStorage<Record<string, boolean>>('promix_2fa_users_v1', {});
  const isOn = !!username && !!enabled[username.toLowerCase()];
  if (!isOn) return null;

  return (
    <div className="anim-fade-slide-in">
      <label className="block text-pm-xs font-medium text-content-secondary mb-2 uppercase tracking-wider">
        Cod 2FA (6 cifre)
      </label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder="123 456"
        className="h-11 w-full rounded-xl border border-line bg-surface-primary px-4 text-pm-md tracking-[0.4em] text-content-primary tabular-nums transition-smooth duration-150 focus:outline-none focus:border-accent/70 focus:shadow-[var(--ring-soft)]"
        autoComplete="one-time-code"
        name="totp"
      />
      <p className="text-pm-2xs text-content-muted mt-1">Cod din aplicația ta de autentificare.</p>
    </div>
  );
}








// NOTE: SsoButtons kept for future SSO implementation - currently unused (deleted to fix TS error)
// function _SsoButtons() { ... }






const LAN_GUESSES = [
  'http://localhost:8080',
  'http://localhost:3500',
  'http://127.0.0.1:8080',
  'http://192.168.1.10:8080',
  'http://192.168.1.100:8080',
  'http://192.168.2.123:8080',
];

function LanDiscovery({ onPick }: { onPick: (url: string) => void }) {
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<string[]>([]);

  const scan = async () => {
    setScanning(true);
    setFound([]);
    const hits: string[] = [];
    await Promise.all(LAN_GUESSES.map(async (url) => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 1200);
        const res = await fetch(`${url}/health`, { signal: ctrl.signal, mode: 'cors' });
        clearTimeout(t);
        if (res.ok) hits.push(url);
      } catch {  }
    }));
    setFound(hits);
    setScanning(false);
    if (hits.length === 0) toast.warning('Nu s-a găsit niciun server în rețea.');
  };

  return (
    <div>
      <button
        type="button"
        onClick={scan}
        disabled={scanning}
        className="inline-flex items-center gap-1.5 rounded-lg text-pm-2xs text-content-muted transition-smooth duration-150 hover:text-content-secondary active:scale-[0.98] focus:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-50"
      >
        {scanning ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" /> : <Search className="h-3 w-3 shrink-0" />}
        {scanning ? 'Caut servere…' : 'Detectează automat în rețea'}
      </button>
      {found.length > 0 && (
        <ul className="anim-fade-slide-in mt-2 space-y-1">
          {found.map(u => (
            <li key={u}>
              <button
                type="button"
                onClick={() => onPick(u)}
                className="max-w-full truncate rounded-lg text-pm-2xs font-mono text-status-green transition-smooth duration-150 hover:underline focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
              >{u}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}













export function BiometricButton() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('PublicKeyCredential' in window)) return;
    
    
    if (window.innerWidth >= 768 || !window.isSecureContext) return;
    const probe = (PublicKeyCredential as unknown as {
      isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
    }).isUserVerifyingPlatformAuthenticatorAvailable;
    probe?.()
      .then((ok: boolean) => setAvailable(!!ok))
      .catch(() => setAvailable(false));
  }, []);

  if (!available) return null;
  return (
    <button
      type="button"
      onClick={() => toast.info('Autentificare biometrică — necesită activare în setări (necesită cont legat).')}
      className="inline-flex w-full items-center justify-center gap-2 h-9 rounded-xl border border-line bg-surface-primary text-pm-base text-content-primary transition-smooth duration-150 hover:bg-surface-tertiary hover:border-line active:scale-[0.98] focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
    >
      <Fingerprint className="h-3.5 w-3.5 shrink-0" /> Autentificare biometrică
    </button>
  );
}





function SessionsPanel({ onClose }: { onClose: () => void }) {
  const [sessions, setSessions] = useLocalStorage<SessionRecord[]>(SESSIONS_KEY, []);

  return (
    <div className="anim-fade-in absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/50">
      <div className="anim-scale-in w-full max-w-md bg-surface-elevated border border-line rounded-2xl shadow-[var(--elevation-4)] overflow-hidden">
        <header className="flex items-center justify-between px-4 h-12 border-b border-line">
          <h2 className="min-w-0 text-pm-md font-semibold text-content-primary flex items-center gap-2">
            <History className="h-4 w-4 shrink-0" /> <span className="truncate">Sesiuni recente</span>
          </h2>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-content-muted transition-smooth duration-150 hover:bg-surface-tertiary hover:text-content-primary active:scale-95 focus:outline-none focus-visible:shadow-[var(--ring-soft)]">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="p-3 max-h-[60vh] overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="text-pm-xs text-content-muted text-center py-6">Nicio sesiune înregistrată.</p>
          ) : (
            <ul className="divide-y divide-line/40">
              {sessions.map(s => (
                <li key={s.id} className="py-2 flex items-start gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-content-muted mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-pm-base text-content-primary truncate">{s.username}</p>
                    <p className="text-pm-2xs text-content-muted">{new Date(s.ts).toLocaleString('ro-RO')}</p>
                    <p className="text-pm-2xs text-content-muted/70 font-mono truncate">{s.device}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="flex items-center justify-end gap-2 px-3 h-11 border-t border-line">
          <button
            type="button"
            onClick={() => setSessions([])}
            className="rounded-lg text-pm-xs text-status-red transition-smooth duration-150 hover:underline active:scale-[0.98] focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
          >
            Șterge istoricul local
          </button>
        </footer>
      </div>
    </div>
  );
}






function ResetPasswordPanel({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Adresă de email invalidă');
      return;
    }
    setSent(true);
    toast.success('Cerere trimisă — verifică email-ul (când serverul e configurat).');
    setTimeout(onClose, 1500);
  };

  return (
    <div className="anim-fade-in absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/50">
      <form
        onSubmit={submit}
        className="anim-scale-in w-full max-w-sm bg-surface-elevated border border-line rounded-2xl shadow-[var(--elevation-4)] p-4"
      >
        <header className="flex items-center justify-between mb-3">
          <h2 className="min-w-0 text-pm-md font-semibold text-content-primary flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0" /> <span className="truncate">Resetare parolă</span>
          </h2>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-content-muted transition-smooth duration-150 hover:bg-surface-tertiary hover:text-content-primary active:scale-95 focus:outline-none focus-visible:shadow-[var(--ring-soft)]">
            <X className="h-4 w-4" />
          </button>
        </header>
        <p className="text-pm-xs text-content-muted mb-3">
          Vom trimite un link de resetare către adresa contului.
        </p>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="email@firma.ro" autoComplete="email"
          disabled={sent}
          className="h-10 w-full rounded-xl border border-line bg-surface-primary px-3 text-pm-base text-content-primary placeholder:text-content-muted/50 transition-smooth duration-150 focus:outline-none focus:border-accent/70 focus:shadow-[var(--ring-soft)] disabled:opacity-50"
        />
        <button
          type="submit" disabled={sent}
          className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-accent text-pm-base font-medium text-[var(--color-on-accent)] transition-smooth duration-150 hover:opacity-90 active:scale-[0.98] focus:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-50"
        >
          {sent ? 'Cerere trimisă' : 'Trimite link de resetare'}
        </button>
      </form>
    </div>
  );
}





interface Props { username: string; onPickServer?: (url: string) => void }

export default function LoginEnhancements({ username, onPickServer }: Props) {
  const [showSessions, setShowSessions] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const pick = (u: string) => {
    setServerUrl(u);
    onPickServer?.(u);
    toast.success(`Server selectat: ${u}`);
  };

  
  
  
  
  
  const links = useMemo(() => ([
    { id: 'sessions', label: 'Sesiunile mele', icon: History,    onClick: () => setShowSessions(true) },
  ]), []);

  return (
    <div className="space-y-3">
      <LockoutBadge />
      <TotpField username={username} />

      <div className="flex items-center justify-between text-pm-2xs">
        {links.map(l => {
          const Icon = l.icon;
          return (
            <button
              key={l.id}
              type="button"
              onClick={l.onClick}
              className="inline-flex items-center gap-1 rounded-lg text-content-muted transition-smooth duration-150 hover:text-content-primary active:scale-[0.98] focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
            >
              <Icon className="h-3 w-3 shrink-0" /> {l.label}
            </button>
          );
        })}
      </div>

      <div className="pt-1">
        <LanDiscovery onPick={pick} />
      </div>

      {showSessions && <SessionsPanel onClose={() => setShowSessions(false)} />}
      {showReset && <ResetPasswordPanel onClose={() => setShowReset(false)} />}
    </div>
  );
}
