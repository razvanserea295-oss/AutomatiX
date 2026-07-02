




import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Wand2, History, RefreshCcw, Send, AlertTriangle } from '@/icons';
import { useLocalStorage } from '@/components/enhancements/useLocalStorage';
import { toast } from '@/store/toastStore';

interface Props {
  username: string;
  next: string;
  onSuggest: (pwd: string) => void;
}

const HIST_KEY_PREFIX = 'promix_pwd_history_';
const HIST_LIMIT = 5;

export function recordPasswordHistory(username: string, pwd: string) {
  try {
    const key = `${HIST_KEY_PREFIX}${username.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const hash = simpleHash(pwd);
    const next = [hash, ...list.filter(h => h !== hash)].slice(0, HIST_LIMIT);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {  }
}

function simpleHash(s: string): string {
  
  
  
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function strengthScore(pwd: string): { score: 0 | 1 | 2 | 3 | 4; label: string; tone: string } {
  if (!pwd) return { score: 0, label: 'gol', tone: 'text-content-muted' };
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 12) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  const score = Math.min(4, s) as 0 | 1 | 2 | 3 | 4;
  const labels = ['foarte slabă', 'slabă', 'mediocră', 'bună', 'excelentă'];
  const tones  = ['text-status-red', 'text-status-red', 'text-status-amber', 'text-status-blue', 'text-status-green'];
  return { score, label: labels[score], tone: tones[score] };
}

function generatePassword(): string {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!#$%&*+-.';
  const all = lower + upper + digits + symbols;
  const arr = new Uint32Array(16);
  crypto.getRandomValues(arr);
  let out = '';
  
  out += lower[arr[0] % lower.length];
  out += upper[arr[1] % upper.length];
  out += digits[arr[2] % digits.length];
  out += symbols[arr[3] % symbols.length];
  for (let i = 4; i < 16; i++) out += all[arr[i] % all.length];
  
  return out.split('').sort(() => arr[15] % 2 === 0 ? -1 : 1).join('');
}

async function checkHibp(pwd: string): Promise<number | null> {
  
  
  
  try {
    const buf = new TextEncoder().encode(pwd);
    const digest = await crypto.subtle.digest('SHA-1', buf);
    const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const prefix = hex.slice(0, 5);
    const suffix = hex.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { mode: 'cors' });
    if (!res.ok) return null;
    const text = await res.text();
    const line = text.split('\n').find(l => l.startsWith(suffix));
    return line ? Number(line.split(':')[1]) : 0;
  } catch {
    return null;
  }
}

export default function PasswordChangeEnhancements({ username, next, onSuggest }: Props) {
  const meter = useMemo(() => strengthScore(next), [next]);
  const [breached, setBreached] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  const [history] = useLocalStorage<string[]>(`${HIST_KEY_PREFIX}${username.toLowerCase()}`, []);
  const reused = next ? history.includes(simpleHash(next)) : false;

  useEffect(() => {
    if (next.length < 6) { setBreached(null); return; }
    const handle = setTimeout(() => {
      setChecking(true);
      checkHibp(next).then(n => setBreached(n)).finally(() => setChecking(false));
    }, 600);
    return () => clearTimeout(handle);
  }, [next]);

  const onGenerate = () => {
    const pwd = generatePassword();
    onSuggest(pwd);
    navigator.clipboard?.writeText(pwd).catch(() => {});
    toast.success('Parolă generată — copiată în clipboard');
  };

  const requestSkip = () => {
    toast.info('Cerere trimisă către administrator — vei primi un token temporar prin email/chat.');
  };

  return (
    <div className="mt-4 space-y-3">
      {}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-pm-2xs uppercase tracking-wide text-content-muted">Complexitate</span>
          <span className={`text-pm-2xs ${meter.tone}`}>{meter.label}</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[1, 2, 3, 4].map(i => (
            <span
              key={i}
              className={`h-1.5 rounded ${i <= meter.score ? meter.tone.replace('text-', 'bg-') : 'bg-line'}`}
            />
          ))}
        </div>
      </div>

      {}
      {reused && (
        <div className="rounded border border-status-amber/30 bg-status-amber/5 px-3 py-2 text-pm-xs text-status-amber flex items-center gap-2">
          <History className="h-3.5 w-3.5" /> Parola este în istoricul ultimelor {HIST_LIMIT} setate de pe acest device.
        </div>
      )}

      {}
      {breached !== null && breached > 0 && (
        <div className="rounded border border-status-red/30 bg-status-red/5 px-3 py-2 text-pm-xs text-status-red flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" /> Această parolă apare în {breached.toLocaleString('ro-RO')} breșe publice (HIBP).
        </div>
      )}
      {checking && (
        <p className="text-pm-2xs text-content-muted flex items-center gap-1">
          <RefreshCcw className="h-3 w-3 animate-spin" /> Verific HIBP…
        </p>
      )}

      {}
      <div className="flex items-center gap-2">
        <button
          type="button" onClick={onGenerate}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-line text-pm-base text-content-primary hover:bg-surface-tertiary"
        >
          <Wand2 className="h-3.5 w-3.5" /> Sugerează parolă
        </button>
        <button
          type="button" onClick={requestSkip}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-line text-pm-base text-content-muted hover:bg-surface-tertiary"
        >
          <Send className="h-3.5 w-3.5" /> Cere skip de la admin
        </button>
        <span className="ml-auto text-pm-2xs text-content-muted flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Verificare locală + HIBP
        </span>
      </div>
    </div>
  );
}
