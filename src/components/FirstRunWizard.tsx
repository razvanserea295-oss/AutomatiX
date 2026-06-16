import { useState } from 'react';
import { Server, Wifi, WifiOff, Shield, ArrowRight, Check, Loader2 } from 'lucide-react';
import GearLogo from '@/components/ui/GearLogo';
import { testServerConnection, setServerUrl } from '@/config/server';
import { setStorage } from '@/config/localStorage';

type Step = 'welcome' | 'server' | 'telemetry' | 'done';

interface Props {
  onFinish: () => void;
}








export default function FirstRunWizard({ onFinish }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [serverChoice, setServerChoice] = useState<'local' | 'remote'>('local');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [telemetry, setTelemetry] = useState(false);

  const finish = () => {
    
    if (serverChoice === 'remote' && remoteUrl.trim()) {
      setServerUrl(remoteUrl.trim());
    } else {
      setServerUrl('');
    }
    setStorage('promix_telemetry_consent', telemetry ? 'granted' : 'denied');
    setStorage('promix_first_run', '1');
    onFinish();
  };

  const testConnection = async () => {
    if (!remoteUrl.trim()) return;
    setTestState('testing');
    const res = await testServerConnection(remoteUrl.trim());
    setTestState(res.ok ? 'ok' : 'fail');
    setTestMessage(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center aurora-backdrop">
      <div className="aurora-backdrop-orb" aria-hidden />

      <div className="relative z-10 max-w-xl w-full mx-6 bg-surface-secondary border border-line rounded-2xl shadow-soft-lg overflow-hidden">
        {}
        <ProgressRail step={step} />

        <div className="p-8">
          {step === 'welcome' && <WelcomeStep onNext={() => setStep('server')} />}

          {step === 'server' && (
            <ServerStep
              choice={serverChoice}
              onChoiceChange={setServerChoice}
              remoteUrl={remoteUrl}
              onRemoteUrlChange={setRemoteUrl}
              testState={testState}
              testMessage={testMessage}
              onTest={testConnection}
              onNext={() => setStep('telemetry')}
              onBack={() => setStep('welcome')}
            />
          )}

          {step === 'telemetry' && (
            <TelemetryStep
              enabled={telemetry}
              onToggle={setTelemetry}
              onNext={() => { setStep('done'); setTimeout(finish, 600); }}
              onBack={() => setStep('server')}
            />
          )}

          {step === 'done' && <DoneStep />}
        </div>
      </div>
    </div>
  );
}

function ProgressRail({ step }: { step: Step }) {
  const order: Step[] = ['welcome', 'server', 'telemetry', 'done'];
  const idx = order.indexOf(step);
  return (
    <div className="flex h-0.5 bg-surface-tertiary/40">
      {order.map((s, i) => (
        <div
          key={s}
          className={`flex-1 transition-colors duration-300 ${i <= idx ? 'bg-accent' : 'bg-transparent'}`}
        />
      ))}
    </div>
  );
}

function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center text-accent shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-bold text-content-primary tracking-tight">{title}</h2>
        <p className="text-sm text-content-secondary mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function FooterNav({
  onBack, onNext, nextLabel = 'Continuă', nextDisabled = false,
}: { onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean }) {
  return (
    <div className="mt-8 flex items-center justify-between">
      {onBack ? (
        <button
          onClick={onBack}
          className="text-pm-xs text-content-muted hover:text-content-primary transition-colors"
        >
          Înapoi
        </button>
      ) : <span />}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-accent text-surface-primary font-medium text-sm hover:bg-accent/90 disabled:opacity-50 transition-colors"
      >
        {nextLabel}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}



function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center">
          <GearLogo size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-content-primary tracking-tight">Bun venit în Automatix</h1>
          <p className="text-sm text-content-secondary mt-0.5">Hai să configurăm aplicația în 30 de secunde.</p>
        </div>
      </div>
      <p className="text-sm text-content-secondary leading-relaxed">
        Vom configura conexiunea la server, tema vizuală și câteva preferințe.
        Toate setările pot fi schimbate ulterior din <span className="text-content-primary font-semibold">Setări</span>.
      </p>
      <FooterNav onNext={onNext} nextLabel="Să începem" />
    </div>
  );
}

function ServerStep({
  choice, onChoiceChange, remoteUrl, onRemoteUrlChange,
  testState, testMessage, onTest, onNext, onBack,
}: {
  choice: 'local' | 'remote';
  onChoiceChange: (c: 'local' | 'remote') => void;
  remoteUrl: string;
  onRemoteUrlChange: (v: string) => void;
  testState: 'idle' | 'testing' | 'ok' | 'fail';
  testMessage: string;
  onTest: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canProceed = choice === 'local' || (choice === 'remote' && testState === 'ok');

  return (
    <div>
      <StepHeader
        icon={<Server className="w-5 h-5" />}
        title="Cum se conectează aplicația?"
        subtitle="Folosește baza locală sau conectează-te la un server existent."
      />

      <div className="space-y-2" role="radiogroup" aria-label="Tip conexiune">
        {
}
        <div
          role="radio"
          tabIndex={0}
          aria-checked={choice === 'local'}
          onClick={() => onChoiceChange('local')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChoiceChange('local'); } }}
          className={`w-full text-left rounded-lg border-2 p-4 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
            choice === 'local'
              ? 'border-accent bg-accent/10'
              : 'border-line bg-surface-tertiary/60 hover:bg-surface-tertiary hover:border-accent/40'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-accent flex items-center justify-center shrink-0">
              {choice === 'local' && <span className="w-2 h-2 rounded-full bg-accent" />}
            </div>
            <div>
              <div className="text-sm font-semibold text-content-primary">Doar pe acest PC</div>
              <div className="text-pm-xs text-content-secondary mt-0.5">
                Folosește baza locală. Cel mai rapid — potrivit dacă nu partajezi datele cu alți utilizatori.
              </div>
            </div>
          </div>
        </div>

        <div
          role="radio"
          tabIndex={0}
          aria-checked={choice === 'remote'}
          onClick={() => onChoiceChange('remote')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChoiceChange('remote'); } }}
          className={`w-full text-left rounded-lg border-2 p-4 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
            choice === 'remote'
              ? 'border-accent bg-accent/10'
              : 'border-line bg-surface-tertiary/60 hover:bg-surface-tertiary hover:border-accent/40'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-accent flex items-center justify-center shrink-0">
              {choice === 'remote' && <span className="w-2 h-2 rounded-full bg-accent" />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-content-primary">Conectare la server existent</div>
              <div className="text-pm-xs text-content-secondary mt-0.5">
                Folosește automatiX-ul din rețeaua locală sau peste Tailscale / VPN.
              </div>

              {choice === 'remote' && (
                <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="http://192.168.1.28:3500"
                    value={remoteUrl}
                    onChange={e => onRemoteUrlChange(e.target.value)}
                    className="w-full h-9 rounded border-2 border-line bg-surface-secondary px-3 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent font-mono"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onTest}
                      disabled={!remoteUrl.trim() || testState === 'testing'}
                      className="h-8 px-3 rounded border border-line bg-surface-secondary text-pm-xs font-semibold text-content-primary hover:bg-surface-tertiary transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {testState === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                      Testează
                    </button>
                    {testState === 'ok'   && <span className="inline-flex items-center gap-1 text-pm-xs text-status-green"><Check className="w-3.5 h-3.5" /> {testMessage}</span>}
                    {testState === 'fail' && <span className="inline-flex items-center gap-1 text-pm-xs text-status-red"><WifiOff className="w-3.5 h-3.5" /> {testMessage}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <FooterNav onBack={onBack} onNext={onNext} nextDisabled={!canProceed} />
    </div>
  );
}

function TelemetryStep({
  enabled, onToggle, onNext, onBack,
}: { enabled: boolean; onToggle: (v: boolean) => void; onNext: () => void; onBack: () => void }) {
  return (
    <div>
      <StepHeader
        icon={<Shield className="w-5 h-5" />}
        title="Raportare diagnostic"
        subtitle="Ne ajuți să identificăm erorile rapid?"
      />

      <div className="space-y-3 text-sm text-content-secondary leading-relaxed">
        <p>
          Când aplicația întâmpină o eroare, putem primi automat detaliile tehnice
          (stack trace, versiune, sistem de operare) pentru a o remedia mai rapid.
        </p>
        <div className="rounded-lg bg-surface-tertiary/60 border border-line p-3 text-pm-xs">
          <strong className="text-content-primary">Ce NU trimitem:</strong>{' '}
          <span className="text-content-secondary">date despre proiecte, piese, clienți, parole, tokenuri. Doar informații tehnice despre eroare. Poți schimba această setare oricând din <span className="text-content-primary font-semibold">Setări → Cont</span>.</span>
        </div>
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-lg border-2 border-line bg-surface-tertiary/60 p-4 cursor-pointer hover:bg-surface-tertiary hover:border-accent/40 transition-colors">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => onToggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded accent-[var(--color-accent)]"
        />
        <div className="flex-1">
          <div className="text-sm font-semibold text-content-primary">Da, trimite raportări de erori</div>
          <div className="text-pm-xs text-content-secondary mt-0.5">
            Opțional. Implicit dezactivat — alegi conștient să activezi.
          </div>
        </div>
      </label>

      <FooterNav onBack={onBack} onNext={onNext} nextLabel="Finalizează" />
    </div>
  );
}

function DoneStep() {
  return (
    <div className="py-6 text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-status-green/15 flex items-center justify-center text-status-green mb-4">
        <Check className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-semibold text-content-primary">Gata!</h2>
      <p className="text-sm text-content-muted mt-1">Te redirecționăm către autentificare…</p>
    </div>
  );
}
