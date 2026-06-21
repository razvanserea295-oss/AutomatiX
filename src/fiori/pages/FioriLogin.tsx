import { useState } from 'react';
import {
  Card, Title, Label, Input, Button, MessageStrip, BusyIndicator,
} from '@ui5/webcomponents-react';
import { useUiModeStore } from '@/store/uiModeStore';
import { useAuthStore } from '@/store/authStore';

// Real UI5 login surface for Fiori mode (the SaaS LoginPage is never mounted
// here). 2FA-protected accounts are routed to the Modern UI, where the full
// challenge flow lives.
export default function FioriLogin() {
  const login = useAuthStore(s => s.login);
  const setMode = useUiModeStore(s => s.setMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!username || !password) { setError('Completează utilizator și parolă.'); return; }
    setBusy(true);
    setError(null);
    try {
      const { requires2FA } = await login(username, password);
      if (requires2FA) {
        setError('Contul folosește verificare în doi pași — autentifică-te din interfața Modern.');
        setMode('saas');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Autentificare eșuată');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      height: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--sapBackgroundColor, #f5f6f7)', padding: '1.5rem',
    }}>
      <Card style={{ width: '100%', maxWidth: '24rem' }}>
        <div style={{ padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <Title level="H3">Automatix</Title>
            <Label>SAP Fiori</Label>
          </div>

          {error && <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <Label for="fiori-user" required>Utilizator</Label>
            <Input
              id="fiori-user"
              value={username}
              onInput={(e) => setUsername((e.target as unknown as HTMLInputElement).value)}
              onKeyDown={(e) => { if ((e as unknown as KeyboardEvent).key === 'Enter') void submit(); }}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <Label for="fiori-pass" required>Parolă</Label>
            <Input
              id="fiori-pass"
              type="Password"
              value={password}
              onInput={(e) => setPassword((e.target as unknown as HTMLInputElement).value)}
              onKeyDown={(e) => { if ((e as unknown as KeyboardEvent).key === 'Enter') void submit(); }}
              style={{ width: '100%' }}
            />
          </div>

          <Button design="Emphasized" disabled={busy} onClick={() => void submit()} style={{ marginTop: '0.5rem' }}>
            {busy ? 'Se autentifică…' : 'Autentificare'}
          </Button>
          {busy && <div style={{ display: 'flex', justifyContent: 'center' }}><BusyIndicator active size="S" /></div>}

          <Button design="Transparent" onClick={() => setMode('saas')}>
            Interfața Modern
          </Button>
        </div>
      </Card>
    </div>
  );
}
