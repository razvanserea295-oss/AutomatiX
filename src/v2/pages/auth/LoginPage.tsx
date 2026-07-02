import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';
import { ShieldCheck } from '@/icons';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/v2/components/ui/card';

type Props = {
  onLogin: (u: string, p: string) => Promise<{ requires2FA: boolean }>;
};

export default function LoginPage({ onLogin }: Props) {
  const pending2FA = useAuthStore((s) => s.pending2FAChallenge);
  const verify2FA = useAuthStore((s) => s.verify2FA);
  const cancel2FA = useAuthStore((s) => s.cancel2FA);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await onLogin(username, password);
      if (result.requires2FA) return;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autentificare eșuată');
    } finally {
      setLoading(false);
    }
  };

  const submit2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFaCode.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      await verify2FA(twoFaCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cod 2FA invalid');
    } finally {
      setLoading(false);
    }
  };

  const backFrom2FA = () => {
    cancel2FA();
    setTwoFaCode('');
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="density-page-title text-center">automatiX</CardTitle>
          <CardDescription>
            {pending2FA ? 'Verificare în doi pași' : 'Autentificare în contul tău'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending2FA ? (
            <form onSubmit={(e) => void submit2FA(e)} className="space-y-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Introdu codul de 6 cifre din aplicația de autentificare.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="twofa" className="sr-only">Cod 2FA</Label>
                <Input
                  id="twofa"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center font-mono tracking-[0.35em]"
                  disabled={loading}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" disabled={loading} onClick={backFrom2FA}>
                  Înapoi
                </Button>
                <Button type="submit" className="flex-1" loading={loading} disabled={twoFaCode.length !== 6}>
                  Verifică
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => void submit(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Utilizator</Label>
                <Input
                  id="user"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass">Parolă</Label>
                <Input
                  id="pass"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" loading={loading}>
                Conectare
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
