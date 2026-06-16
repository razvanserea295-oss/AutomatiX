import { useState, type FormEvent } from 'react';
import { Loader2, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import GearLogo from '@/components/ui/GearLogo';
import PasswordChangeEnhancements, { recordPasswordHistory } from '@/pages/auth/PasswordChangeEnhancements';

interface Props {
  username: string;
  onLogout: () => void;
}



const WEAK_SUBSTRINGS = ['1234', 'admin', 'parola', 'password', 'automatix', 'promix', 'qwerty'];
function checkStrength(pw: string): string | null {
  if (pw.length < 12) return 'Parola trebuie să aibă minim 12 caractere';
  if (pw.length > 128) return 'Parola trebuie să aibă maxim 128 caractere';
  if (!/[a-z]/.test(pw)) return 'Parola trebuie să conțină o literă mică';
  if (!/[A-Z]/.test(pw)) return 'Parola trebuie să conțină o literă mare';
  if (!/[0-9]/.test(pw)) return 'Parola trebuie să conțină o cifră';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Parola trebuie să conțină un simbol (ex: ! ? @ # $ %)';
  const lower = pw.toLowerCase();
  for (const bad of WEAK_SUBSTRINGS) {
    if (lower.includes(bad)) return `Parola nu poate conține „${bad}" — alege ceva mai puțin previzibil`;
  }
  return null;
}

export default function ForcePasswordChangePage({ username, onLogout }: Props) {
  const changePassword = useAuthStore((s) => s.changePassword);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!current) { setError('Introdu parola curentă'); return; }
    const strengthErr = checkStrength(next);
    if (strengthErr) { setError(strengthErr); return; }
    if (next !== confirm) { setError('Cele două parole noi nu coincid'); return; }
    if (next === current) { setError('Parola nouă trebuie să fie diferită de cea curentă'); return; }

    setLoading(true);
    try {
      await changePassword(current, next);
      recordPasswordHistory(username, next);
      
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Schimbarea parolei a eșuat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface-primary p-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface-secondary p-8 shadow-soft-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-accent">
            <GearLogo size={22} className="text-surface-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-content-primary">Automatix</span>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-lg border border-status-amber/30 bg-status-amber/5 p-3.5">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-status-amber" />
          <div className="text-sm">
            <p className="font-medium text-content-primary">Schimbă parola pentru a continua</p>
            <p className="mt-1 text-content-muted">
              Aceasta e prima conectare pe contul <span className="font-mono">{username}</span> —
              parola implicită nu e sigură. Setează una nouă, doar a ta, înainte de a accesa aplicația.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <PasswordField
            id="current"
            label="Parola curentă"
            value={current}
            onChange={setCurrent}
            disabled={loading}
            visible={showPwd}
            onToggle={() => setShowPwd((v) => !v)}
            autoComplete="current-password"
          />
          <PasswordField
            id="next"
            label="Parolă nouă"
            value={next}
            onChange={setNext}
            disabled={loading}
            visible={showPwd}
            autoComplete="new-password"
            hint="Min. 12 caractere, cu literă mare, mică, cifră și simbol"
          />
          <PasswordField
            id="confirm"
            label="Confirmă parola nouă"
            value={confirm}
            onChange={setConfirm}
            disabled={loading}
            visible={showPwd}
            autoComplete="new-password"
          />

          <PasswordChangeEnhancements
            username={username}
            next={next}
            onSuggest={(pwd) => { setNext(pwd); setConfirm(pwd); }}
          />

          {error && (
            <div className="rounded border border-status-red/20 bg-status-red/5 px-3.5 py-2.5">
              <p className="text-xs text-status-red">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded bg-accent text-sm font-medium text-surface-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Actualizează parola'}
          </button>

          <button
            type="button"
            onClick={onLogout}
            disabled={loading}
            className="block w-full text-center text-xs text-content-muted underline-offset-4 hover:text-content-secondary hover:underline"
          >
            Deconectează-te
          </button>
        </form>
      </div>
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  visible: boolean;
  autoComplete: string;
  onToggle?: () => void;
  hint?: string;
}

function PasswordField({ id, label, value, onChange, disabled, visible, onToggle, autoComplete, hint }: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-pm-xs font-medium uppercase tracking-wider text-content-secondary">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          className="h-11 w-full rounded border border-line bg-surface-primary px-3.5 pr-10 text-sm text-content-primary placeholder:text-content-muted/50 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
        />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-pm-2xs text-content-muted">{hint}</p>}
    </div>
  );
}
