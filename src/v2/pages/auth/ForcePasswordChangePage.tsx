import { useState, type FormEvent } from 'react';
import { ShieldAlert } from '@/icons';
import { useAuthStore } from '@/store/authStore';
import { recordPasswordHistory } from '@/pages/auth/PasswordChangeEnhancements';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/v2/components/ui/card';

const WEAK = ['1234', 'admin', 'parola', 'password', 'automatix', 'promix', 'qwerty'];

function checkStrength(pw: string): string | null {
  if (pw.length < 12) return 'Minim 12 caractere';
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
    return 'Include litere mari/mici, cifră și simbol';
  }
  const lower = pw.toLowerCase();
  for (const bad of WEAK) {
    if (lower.includes(bad)) return `Evită „${bad}" în parolă`;
  }
  return null;
}

export default function ForcePasswordChangePage({
  username,
  onLogout,
}: {
  username: string;
  onLogout: () => void;
}) {
  const changePassword = useAuthStore((s) => s.changePassword);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!current) { setError('Introdu parola curentă'); return; }
    const err = checkStrength(next);
    if (err) { setError(err); return; }
    if (next !== confirm) { setError('Parolele nu coincid'); return; }
    if (next === current) { setError('Parola nouă trebuie să fie diferită'); return; }
    setLoading(true);
    setError(null);
    try {
      await changePassword(current, next);
      recordPasswordHistory(username, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="v2-root flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" />Schimbă parola</CardTitle>
          <CardDescription>
            Prima conectare pe <strong>{username}</strong> — setează o parolă sigură înainte de a continua.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <div className="space-y-2"><Label>Parola curentă</Label><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
            <div className="space-y-2"><Label>Parolă nouă</Label><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} /></div>
            <div className="space-y-2"><Label>Confirmă parola</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Se salvează…' : 'Salvează parola'}</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={onLogout}>Deconectare</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
