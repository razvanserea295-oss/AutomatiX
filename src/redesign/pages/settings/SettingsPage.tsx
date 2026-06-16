















































import { useState, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { getServerUrl, setServerUrl, testServerConnection, isServerMode } from '@/config/server';
import { getAiServiceUrl, setAiServiceUrl, aiHealth } from '@/api/ai';
import { toast } from '@/store/toastStore';
import { useLocalStorage } from '@/components/enhancements';
import AboutPanel from '@/components/settings/AboutPanel';
import AuditLogPanel from '@/components/settings/AuditLogPanel';
import AutoBackupPanel from '@/components/settings/AutoBackupPanel';
import AvatarUpload from '@/components/settings/AvatarUpload';
import HelpPanel from '@/components/settings/HelpPanel';
import { useSetupStore } from '@/store/setupStore';
import {
  Settings, AlertCircle, Sun, Moon, Bell, User as UserIcon, Mail, Building2,
  Server, Bot, ScrollText, Info, Database, Clock, Folder, RefreshCw, Shield, ShieldCheck,
  Megaphone, Wrench, HelpCircle, ArrowRight,
} from 'lucide-react';
import BroadcastsAdminPanel from '@/components/settings/BroadcastsAdminPanel';
import MaintenanceModePanel from '@/components/settings/MaintenanceModePanel';
import { maskCui, maskIban, validateCui, validateIban } from '@/lib/inputMasks';
import { getErrorMessage } from '@/utils/errors';
import { formatDateTimeRo } from '@/lib/format';
import { useSettingsStore } from '@/store/settingsStore';
import {
  nativeNotificationsAvailable, nativeNotificationsEnabled,
  setNativeNotificationsEnabled, nativeNotify,
} from '@/lib/nativeNotify';

import Page from '@/redesign/ui/Page';
import Card, { CardBody } from '@/redesign/ui/Card';
import KpiCard from '@/redesign/ui/KpiCard';
import HeroHeader from '@/redesign/ui/HeroHeader';
import SectionHeader from '@/redesign/ui/SectionHeader';
import StatusBadge from '@/redesign/ui/StatusBadge';
import EmptyState from '@/redesign/ui/EmptyState';
import type { StatusTone } from '@/lib/statusTokens';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';





type Section = 'aspect' | 'notificari' | 'cont' | 'email' | 'fiscal' | 'anunturi' | 'mentenanta' | 'server' | 'ai' | 'audit' | 'backup' | 'despre' | 'ajutor';

interface CompanySettings {
  company_name: string; cui: string; reg_com: string;
  address: string; city: string; county: string;
  bank_name: string; iban: string;
  tva_rate: number; default_currency: string; eur_to_ron_rate: number;
  eur_to_ron_rate_updated_at?: string | null; eur_to_ron_rate_source?: string | null;
}

interface SettingsPageProps {
  user: User | null;
  onThemeChange: (theme: 'light' | 'dark') => void;
  currentTheme: 'light' | 'dark';
  onQuitApplication?: () => void;
}








type NavGroup = 'personal' | 'companie' | 'platforma';

const NAV_ITEMS: { id: Section; label: string; icon: typeof Settings; description: string; group: NavGroup }[] = [
  { id: 'aspect',     label: 'Aspect',             icon: Sun,        description: 'Temă și personalizare',           group: 'personal'  },
  { id: 'notificari', label: 'Notificări',         icon: Bell,       description: 'Email și in-app',                 group: 'personal'  },
  { id: 'cont',       label: 'Cont',               icon: UserIcon,   description: 'Profil utilizator',               group: 'personal'  },
  { id: 'email',      label: 'Email',              icon: Mail,       description: 'IMAP / SMTP',                     group: 'personal'  },
  { id: 'fiscal',     label: 'Fiscal',             icon: Building2,  description: 'Date companie',                   group: 'companie'  },
  { id: 'anunturi',   label: 'Anunțuri',           icon: Megaphone,  description: 'Popup-uri pentru toți userii',    group: 'companie'  },
  { id: 'mentenanta', label: 'Mod mentenanță',     icon: Wrench,     description: 'Blochează accesul non-admin',     group: 'companie'  },
  { id: 'audit',      label: 'Jurnal modificări',  icon: ScrollText, description: 'Audit log',                       group: 'companie'  },
  { id: 'server',     label: 'Server',             icon: Server,     description: 'Conexiune rețea',                 group: 'platforma' },
  { id: 'ai',         label: 'AI Service',         icon: Bot,        description: 'Motor inteligență',               group: 'platforma' },
  { id: 'backup',     label: 'Backup',             icon: Database,   description: 'Copie de siguranță DB',           group: 'platforma' },
  { id: 'despre',     label: 'Despre',             icon: Info,       description: 'Versiune și licență',             group: 'platforma' },
  { id: 'ajutor',     label: 'Ajutor',             icon: HelpCircle, description: 'Ghid, FAQ și changelog',          group: 'platforma' },
];

const GROUP_LABELS: Record<NavGroup, string> = {
  personal:  'Personal',
  companie:  'Companie',
  platforma: 'Platformă',
};
const GROUP_ORDER: NavGroup[] = ['personal', 'companie', 'platforma'];





export default function SettingsPage({ user, onThemeChange, currentTheme }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<Section>('aspect');

  
  
  
  
  
  
  
  
  const visibleNav = NAV_ITEMS.filter((item) => {
    const r = (user?.role_name || '').toLowerCase();
    if (item.id === 'fiscal')   return r === 'admin' || r === 'manager' || r === 'financiar';
    if (item.id === 'audit')    return r === 'admin'; 
    if (item.id === 'anunturi') return r === 'admin';
    if (item.id === 'mentenanta') return r === 'admin';
    if (item.id === 'server')   return r === 'admin';
    if (item.id === 'ai')       return r === 'admin';
    if (item.id === 'backup')   return r === 'admin';
    if (item.id === 'despre')   return r === 'admin';
    return true;
  });

  const active = visibleNav.find(n => n.id === activeSection);
  const ActiveIcon = active?.icon || Settings;
  const isAdmin = (user?.role_name || '').toLowerCase() === 'admin';
  const roleLabel = user?.role_name === 'admin' ? 'Administrator' : (user?.role_name || 'Utilizator');

  
  
  const selectSection = useCallback((id: Section) => {
    if (id === activeSection) return;
    startMorphTransition(() => flushSync(() => setActiveSection(id)), { dir: 'forward' });
  }, [activeSection]);

  return (
    <Page fit className="mod-shell">
      <Page.Body fit maxWidth="wide" padding="comfortable">
        {}
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Sistem"
          icon={Settings}
          title="Setări"
          subtitle="Configurare aplicație, cont, fiscal și integrări"
          actions={
            <div className="flex items-center gap-2">
              <SetupContinueBanner isAdmin={isAdmin} />
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-accent-muted text-accent text-pm-xs font-semibold whitespace-nowrap">
                <Shield className="h-3.5 w-3.5" /> {roleLabel}
              </span>
            </div>
          }
        />

        {}
        <Page.Kpis cols={4} className="shrink-0 enter-up" style={{ animationDelay: '60ms' }}>
          <KpiCard
            label="Temă activă" value={currentTheme === 'dark' ? 'Întunecat' : 'Luminos'}
            icon={currentTheme === 'dark' ? Moon : Sun} iconColor="text-accent"
            hint="Comută din secțiunea Aspect"
          />
          <KpiCard
            label="Rol cont" value={roleLabel}
            icon={Shield} iconColor="text-status-blue"
            hint={user?.username ? `@${user.username}` : '—'}
          />
          <KpiCard
            label="Secțiuni disponibile" value={visibleNav.length}
            icon={Settings} iconColor="text-status-teal"
            hint={`din ${NAV_ITEMS.length} totale`}
          />
          <KpiCard
            label="2FA cont" value={(user as { totp_enabled?: boolean } | null)?.totp_enabled ? 'Activat' : 'Inactiv'}
            icon={(user as { totp_enabled?: boolean } | null)?.totp_enabled ? ShieldCheck : Shield}
            iconColor={(user as { totp_enabled?: boolean } | null)?.totp_enabled ? 'text-status-green' : 'text-content-muted'}
            hint="Gestionează din Cont"
          />
        </Page.Kpis>

        {


}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 enter-up" style={{ animationDelay: '120ms' }}>
          {}
          <nav className="lg:col-span-4 xl:col-span-3 flex min-h-0" aria-label="Secțiuni setări">
            <Card padding="none" className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <CardBody padding="sm" className="space-y-4 min-h-0 overflow-y-auto">
                {GROUP_ORDER.map((grp) => {
                  const items = visibleNav.filter(n => n.group === grp);
                  if (items.length === 0) return null;
                  return (
                    <div key={grp}>
                      <p className="px-2 pb-1.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">
                        {GROUP_LABELS[grp]}
                      </p>
                      <div className="space-y-0.5 stagger-in">
                        {items.map((item) => {
                          const Icon = item.icon;
                          const on = activeSection === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => selectSection(item.id)}
                              style={on ? ({ viewTransitionName: vtName('settings-rail', item.id) } as React.CSSProperties) : undefined}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors relative ${
                                on
                                  ? 'bg-accent-muted text-accent'
                                  : 'text-content-secondary hover:bg-surface-tertiary/60 hover:text-content-primary'
                              }`}
                            >
                              {on && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-accent anim-grow-y" />}
                              <Icon className={`h-4 w-4 shrink-0 ${on ? 'text-accent' : 'text-content-muted'}`} />
                              <span className="min-w-0 flex-1">
                                <span className={`block text-pm-sm truncate ${on ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                                <span className="block text-pm-2xs text-content-muted truncate">{item.description}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          </nav>

          {
}
          <div className="lg:col-span-8 xl:col-span-9 min-w-0 flex min-h-0">
            <Card
              padding="none"
              vtName={vtName('settings-section', activeSection)}
              className="flex flex-col min-h-0 flex-1 overflow-hidden"
            >
              <CardBody padding="lg" className="min-h-0 overflow-y-auto">
                {
}
                <div key={activeSection} className="enter-up">
                  <SectionHeader
                    icon={ActiveIcon}
                    title={active?.label || 'Setări'}
                    meta={active?.description}
                  />

                  {}
                  {activeSection === 'aspect' && <AspectSection currentTheme={currentTheme} onThemeChange={onThemeChange} />}
                  {activeSection === 'notificari' && <NotificariSection />}
                  {activeSection === 'cont' && <ContSection user={user} />}
                  {activeSection === 'email' && <EmailSection />}
                  {activeSection === 'fiscal' && <FiscalSection />}
                  {activeSection === 'anunturi' && <BroadcastsAdminPanel />}
                  {activeSection === 'mentenanta' && <MaintenanceModePanel />}
                  {activeSection === 'server' && <ServerSection />}
                  {activeSection === 'ai' && <AiSection />}
                  {activeSection === 'audit' && <AuditLogPanel />}
                  {activeSection === 'backup' && <BackupSection />}
                  {activeSection === 'despre' && <AboutPanel user={user} />}
                  {activeSection === 'ajutor' && <HelpPanel />}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </Page.Body>
    </Page>
  );
}











function SetupContinueBanner({ isAdmin }: { isAdmin: boolean }) {
  const completed = useSetupStore(s => s.completed);
  const checked = useSetupStore(s => s.checked);
  const refresh = useSetupStore(s => s.refresh);
  const openWizard = useSetupStore(s => s.openWizard);

  useEffect(() => { if (isAdmin && !checked) void refresh(); }, [isAdmin, checked, refresh]);

  if (!isAdmin || completed !== false) return null;

  return (
    <button
      onClick={openWizard}
      title="Completează datele firmei, logo-ul și setările fiscale pentru documentele oficiale."
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-accent/30 bg-accent/8 text-accent text-pm-xs font-semibold hover:bg-accent/12 transition-colors whitespace-nowrap"
    >
      <Building2 className="h-3.5 w-3.5 shrink-0" />
      Continuă setup inițial <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}

function SectionGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      {title && <h3 className="text-pm-xs font-bold uppercase tracking-wider text-content-muted">{title}</h3>}
      {children}
    </div>
  );
}

function FieldRow({ label, hint, error, children }: {
  label: string; hint?: string; error?: string | null; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-pm-sm font-medium text-content-primary mb-1">{label}</label>
      {hint && <p className="text-pm-2xs text-content-muted mb-1.5">{hint}</p>}
      {children}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-pm-xs text-status-red">
          <AlertCircle className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

const inputCls = 'w-full bg-surface-primary border border-line rounded-md px-3 py-2 text-pm-sm text-content-primary placeholder:text-content-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/60 transition-colors';

function SaveBtn({ onClick, saving, saved, label = 'Salvează' }: {
  onClick: () => void; saving?: boolean; saved?: boolean; label?: string;
}) {
  return (
    <button onClick={onClick} disabled={saving}
      className="h-9 px-5 rounded-md bg-accent text-pm-sm font-semibold text-surface-primary hover:bg-accent/90 active:scale-[0.97] transition-all disabled:opacity-50">
      {saving ? 'Se salvează...' : saved ? 'Salvat ✓' : label}
    </button>
  );
}

function StatusPill({ ok, message }: { ok: boolean; message: string }) {
  return (
    <div className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-pm-sm ${
      ok ? 'bg-status-green/10 text-status-green' : 'bg-status-red/10 text-status-red'
    }`}>
      <span className={`h-2 w-2 rounded-full shrink-0 ${ok ? 'bg-status-green' : 'bg-status-red'}`} />
      {message}
    </div>
  );
}





function AspectSection({ currentTheme, onThemeChange }: { currentTheme: 'light' | 'dark'; onThemeChange: (t: 'light' | 'dark') => void }) {
  const themes = [
    { id: 'light' as const, label: 'Luminos', hint: 'Canvas alb, contrast aerisit', Icon: Sun },
    { id: 'dark' as const, label: 'Întunecat', hint: 'Industrial, coerent cu shell-ul', Icon: Moon },
  ];

  return (
    <SectionGroup>
      <div className="grid grid-cols-2 gap-3">
        {themes.map(t => {
          const active = currentTheme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onThemeChange(t.id)}
              className={`relative text-left rounded-lg border-2 p-4 transition-all ${
                active
                  ? 'border-accent bg-accent/5'
                  : 'border-line bg-surface-primary hover:border-accent/40'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <t.Icon className={`h-5 w-5 ${active ? 'text-accent' : 'text-content-muted'}`} />
                <span className="text-pm-sm font-semibold text-content-primary">{t.label}</span>
              </div>
              <p className="text-pm-xs text-content-muted">{t.hint}</p>
              {active && (
                <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>
    </SectionGroup>
  );
}





interface NotifPref { event_type: string; email_enabled: boolean; in_app_enabled: boolean; }

const EVENT_LABELS: Record<string, { label: string; hint: string }> = {
  handoff_assigned:  { label: 'Handoff nou primit',             hint: 'Cineva îți pasează un proiect' },
  handoff_overdue:   { label: 'Handoff overdue',                hint: 'Un handoff așteaptă de prea mult' },
  sla_breach:        { label: 'Depășire SLA',                   hint: 'Termenul a fost depășit' },
  mention:           { label: 'Mențiune (@user)',               hint: 'Cineva te-a menționat' },
  project_changed:   { label: 'Modificări proiect',             hint: 'Status / etapă schimbat' },
  comment_reply:     { label: 'Răspuns la comentariu',          hint: 'Cineva a răspuns' },
  invoice_due_soon:  { label: 'Factură aproape de scadență',    hint: 'Expiră în 3 zile' },
  daily_briefing:    { label: 'Briefing zilnic',                hint: 'Digest trimis dimineața' },
};




function DesktopNotifToggle() {
  const available = nativeNotificationsAvailable();
  const [on, setOn] = useState(() => nativeNotificationsEnabled());

  const toggle = (next: boolean) => {
    setOn(next);
    setNativeNotificationsEnabled(next);
    if (next) nativeNotify({ title: 'automatiX', body: 'Notificările desktop sunt active.', level: 'success' });
  };

  return (
    <div className="rounded-lg border border-line bg-surface-primary p-4">
      <label className="flex items-start justify-between gap-4 cursor-pointer">
        <span>
          <span className="block text-pm-sm font-medium text-content-primary">Notificări desktop native</span>
          <span className="mt-0.5 block text-pm-2xs text-content-muted">
            {available
              ? 'Afișează notificări de sistem (Windows/macOS) pentru delegații închise, facturi emise, backup și erori critice.'
              : 'Disponibil doar în aplicația desktop Automatix. În browser, această opțiune nu are efect.'}
          </span>
        </span>
        <input
          type="checkbox"
          checked={on}
          disabled={!available}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-accent focus:ring-accent/30 disabled:opacity-50"
        />
      </label>
    </div>
  );
}

function NotificariSection() {
  const [prefs, setPrefs] = useState<NotifPref[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiCommand<NotifPref[]>('get_notification_prefs')
      .then(setPrefs).catch(() => setPrefs([])).finally(() => setLoading(false));
  }, []);

  const update = (eventType: string, channel: 'email_enabled' | 'in_app_enabled', value: boolean) => {
    setPrefs(prev => prev.map(p => p.event_type === eventType ? { ...p, [channel]: value } : p));
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await apiCommand<NotifPref[]>('update_notification_prefs', { prefs });
      setPrefs(updated);
      toast.success('Preferințe salvate');
    } catch (err) { toast.error(err instanceof Error ? getErrorMessage(err) : 'Eroare salvare'); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-pm-sm text-content-muted">Se încarcă...</p>;

  return (
    <SectionGroup>
      <DesktopNotifToggle />
      <div className="rounded-lg border border-line overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-primary">
              <th className="text-left px-4 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Eveniment</th>
              <th className="text-center px-4 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted w-20">Email</th>
              <th className="text-center px-4 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted w-20">In-app</th>
            </tr>
          </thead>
          <tbody key={prefs.length} className="stagger-in">
            {prefs.map(p => {
              const meta = EVENT_LABELS[p.event_type] || { label: p.event_type, hint: '' };
              return (
                <tr key={p.event_type} className="border-t border-line/50 hover:bg-surface-tertiary/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-pm-sm font-medium text-content-primary">{meta.label}</p>
                    <p className="text-pm-2xs text-content-muted">{meta.hint}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked={p.email_enabled}
                      onChange={e => update(p.event_type, 'email_enabled', e.target.checked)}
                      className="h-4 w-4 rounded border-line text-accent focus:ring-accent/30" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked={p.in_app_enabled}
                      onChange={e => update(p.event_type, 'in_app_enabled', e.target.checked)}
                      className="h-4 w-4 rounded border-line text-accent focus:ring-accent/30" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-pm-2xs text-content-muted">Email necesită un cont SMTP configurat.</p>
        <SaveBtn onClick={save} saving={saving} />
      </div>
    </SectionGroup>
  );
}





function ContSection({ user }: { user: User | null }) {
  const fields = [
    { label: 'Utilizator', value: user?.username ?? '—' },
    { label: 'Email', value: user?.email ?? '—' },
    
    { label: 'Funcție / titlu', value: user?.job_title ?? '— (setat de admin)' },
    { label: 'Rol', value: user?.role_name === 'admin' ? 'Administrator' : 'Utilizator' },
  ];

  return (
    <div className="space-y-6">
      <SectionGroup>
        <div className="space-y-4">
          {}
          <AvatarUpload user={user} />

          {}
          <div className="flex items-center gap-4 p-4 rounded-lg border border-line bg-surface-primary">
            <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center text-pm-xl font-bold text-accent">
              {(user?.full_name || user?.username || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-pm-md font-semibold text-content-primary">{user?.full_name || user?.username || '—'}</p>
              {user?.job_title && (
                <p className="text-pm-sm text-accent font-medium">{user.job_title}</p>
              )}
              <p className="text-pm-xs text-content-muted">{user?.role_name === 'admin' ? 'Administrator' : 'Utilizator'}</p>
            </div>
          </div>

          {}
          {fields.map((f) => (
            <FieldRow key={f.label} label={f.label}>
              <div className="rounded-md border border-line bg-surface-primary px-3 py-2 text-pm-sm text-content-primary">
                {f.value}
              </div>
            </FieldRow>
          ))}
        </div>
      </SectionGroup>

      <TwoFactorPanel user={user} />
    </div>
  );
}






function TwoFactorPanel({ user }: { user: User | null }) {
  
  
  
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<'idle' | 'setup' | 'disable'>('idle');
  const [secret, setSecret] = useState<string | null>(null);
  const [otpUrl, setOtpUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  
  
  
  
  useEffect(() => {
    setEnabled(Boolean((user as { totp_enabled?: boolean } | null)?.totp_enabled));
  }, [user]);

  const startEnrollment = useCallback(async () => {
    setBusy(true);
    try {
      const res = await apiCommand<{ secret: string; otpauthUrl: string }>('enable_2fa_start');
      setSecret(res.secret);
      setOtpUrl(res.otpauthUrl);
      setStep('setup');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Nu am putut iniția 2FA'));
    } finally {
      setBusy(false);
    }
  }, []);

  const confirmEnrollment = useCallback(async () => {
    if (!/^\d{6}$/.test(code)) { toast.error('Codul trebuie să aibă 6 cifre'); return; }
    setBusy(true);
    try {
      await apiCommand('enable_2fa_confirm', { code });
      toast.success('2FA activat. La următorul login va fi cerut un cod.');
      setEnabled(true); setStep('idle'); setCode(''); setSecret(null); setOtpUrl(null);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Cod 2FA invalid'));
    } finally {
      setBusy(false);
    }
  }, [code]);

  const disable = useCallback(async () => {
    if (!/^\d{6}$/.test(code)) { toast.error('Codul trebuie să aibă 6 cifre'); return; }
    setBusy(true);
    try {
      await apiCommand('disable_2fa', { code });
      toast.success('2FA dezactivat');
      setEnabled(false); setStep('idle'); setCode('');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Cod 2FA invalid'));
    } finally {
      setBusy(false);
    }
  }, [code]);

  return (
    <SectionGroup title="Verificare în doi pași (2FA)">
      <div className="border border-line rounded-md bg-surface-primary p-4 space-y-4">
        <div className="flex items-start gap-3">
          {enabled
            ? <ShieldCheck className="h-5 w-5 text-status-green shrink-0 mt-0.5" />
            : <Shield className="h-5 w-5 text-content-muted shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <p className="text-pm-sm font-semibold text-content-primary">
              {enabled ? '2FA este activat' : '2FA nu este activat'}
            </p>
            <p className="text-pm-xs text-content-muted mt-0.5">
              Adaugă un cod de unică folosință (TOTP) pe lângă parolă. Funcționează cu Google Authenticator, Authy, 1Password, Microsoft Authenticator etc.
            </p>
          </div>
        </div>

        {step === 'idle' && !enabled && (
          <button onClick={startEnrollment} disabled={busy}
            className="h-9 px-5 rounded-md bg-accent text-pm-sm font-semibold text-surface-primary hover:bg-accent/90 disabled:opacity-50">
            {busy ? 'Se inițiază...' : 'Activează 2FA'}
          </button>
        )}

        {step === 'idle' && enabled && (
          <button onClick={() => setStep('disable')}
            className="h-9 px-5 rounded-md border border-status-red/40 bg-status-red/5 text-pm-sm font-semibold text-status-red hover:bg-status-red/10">
            Dezactivează 2FA
          </button>
        )}

        {step === 'setup' && secret && otpUrl && (
          <div className="space-y-3 border-t border-line/60 pt-3">
            <p className="text-pm-sm text-content-secondary">
              <strong>Pasul 1.</strong> Adaugă acest cont în aplicația ta de autentificare. Scanează QR-ul (sau introdu manual cheia).
            </p>
            <div className="bg-white p-3 rounded-md inline-block">
              <img alt="QR 2FA" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpUrl)}`} width={180} height={180} />
            </div>
            <FieldRow label="Cheie (manual)" hint="Dacă nu poți scana QR, introdu cheia direct în aplicație">
              <code className="block font-mono text-pm-xs bg-surface-tertiary border border-line rounded p-2 select-all break-all">{secret}</code>
            </FieldRow>
            <FieldRow label="Pasul 2. Cod curent (6 cifre)" hint="Introdu codul afișat în aplicație pentru a confirmă">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric" placeholder="000000" maxLength={6}
                className={inputCls + ' text-center font-mono tracking-[0.4em] text-pm-md'} />
            </FieldRow>
            <div className="flex gap-2">
              <button onClick={() => { setStep('idle'); setCode(''); setSecret(null); setOtpUrl(null); }}
                className="h-9 px-4 rounded-md border border-line text-pm-sm text-content-secondary hover:bg-surface-tertiary">
                Anulează
              </button>
              <button onClick={confirmEnrollment} disabled={busy || code.length !== 6}
                className="h-9 px-5 rounded-md bg-accent text-pm-sm font-semibold text-surface-primary hover:bg-accent/90 disabled:opacity-50">
                {busy ? 'Se confirmă...' : 'Confirmă activarea'}
              </button>
            </div>
          </div>
        )}

        {step === 'disable' && (
          <div className="space-y-3 border-t border-line/60 pt-3">
            <FieldRow label="Cod curent (6 cifre)" hint="Introdu codul curent ca să confirmi că ești tu">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric" placeholder="000000" maxLength={6}
                className={inputCls + ' text-center font-mono tracking-[0.4em] text-pm-md'} />
            </FieldRow>
            <div className="flex gap-2">
              <button onClick={() => { setStep('idle'); setCode(''); }}
                className="h-9 px-4 rounded-md border border-line text-pm-sm text-content-secondary hover:bg-surface-tertiary">
                Anulează
              </button>
              <button onClick={disable} disabled={busy || code.length !== 6}
                className="h-9 px-5 rounded-md bg-status-red text-pm-sm font-semibold text-white hover:bg-status-red/90 disabled:opacity-50">
                {busy ? 'Se dezactivează...' : 'Confirmă dezactivarea'}
              </button>
            </div>
          </div>
        )}
      </div>
    </SectionGroup>
  );
}





function ServerSection() {
  const [url, setUrl] = useState(getServerUrl());
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  const [serverRunning, setServerRunning] = useState(false);
  const [serverPort, setServerPort] = useState('3500');
  const [serverMsg, setServerMsg] = useState('');
  const [serverLoading, setServerLoading] = useState(false);
  const [localIp, setLocalIp] = useState('');

  useEffect(() => {
    if ('electron' in window) {
      window.electron.invoke('server_status').then((raw: unknown) => {
        const s = raw as { running?: boolean; port?: number; localIp?: string } | null;
        setServerRunning(s?.running || false);
        if (s?.port) setServerPort(String(s.port));
        if (s?.localIp) setLocalIp(s.localIp);
      }).catch(() => {});
      window.electron.invoke('get_local_ip').then((ip: unknown) => {
        if (ip) setLocalIp(ip as string);
      }).catch(() => {});
    }
  }, []);

  const handleStartServer = useCallback(async () => {
    setServerLoading(true); setServerMsg('');
    try {
      const result = await window.electron.invoke('server_start', { port: parseInt(serverPort) || 3500 }) as { running: boolean; message: string };
      setServerRunning(result.running); setServerMsg(result.message);
    } catch (err: unknown) { setServerMsg(getErrorMessage(err, 'Eroare')); }
    setServerLoading(false);
  }, [serverPort]);

  const handleStopServer = useCallback(async () => {
    setServerLoading(true);
    try {
      const result = await window.electron.invoke('server_stop') as { running: boolean; message: string };
      setServerRunning(result.running); setServerMsg(result.message);
    } catch (err: unknown) { setServerMsg(getErrorMessage(err, 'Eroare')); }
    setServerLoading(false);
  }, []);

  const handleTest = useCallback(async () => {
    if (!url.trim()) { setStatus({ ok: false, message: 'Introdu un URL' }); return; }
    setTesting(true); setStatus(null);
    const result = await testServerConnection(url.trim());
    setStatus(result); setTesting(false);
  }, [url]);

  const handleSave = useCallback(() => {
    setServerUrl(url); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }, [url]);

  const handleDisconnect = useCallback(() => {
    setServerUrl(''); setUrl(''); setStatus(null); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }, []);

  return (
    <div className="space-y-6">
      {}
      {'electron' in window && (
        <div className="rounded-lg border border-line bg-surface-primary p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${serverRunning ? 'bg-status-green' : 'bg-content-muted/40'}`} />
              <div>
                <p className="text-pm-sm font-semibold text-content-primary">
                  {serverRunning ? 'Server activ' : 'Server oprit'}
                </p>
                {serverRunning && <p className="text-pm-2xs text-content-muted tabular-nums">Port {serverPort}</p>}
              </div>
            </div>
            {serverRunning ? (
              <button onClick={handleStopServer} disabled={serverLoading}
                className="h-8 px-4 rounded-md border border-status-red/30 text-pm-xs font-semibold text-status-red hover:bg-status-red/8 disabled:opacity-50 transition-colors">
                Oprește
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input type="number" value={serverPort} onChange={e => setServerPort(e.target.value)}
                  className="w-20 bg-surface-secondary border border-line rounded-md px-2.5 py-1.5 text-pm-sm text-content-primary tabular-nums" />
                <button onClick={handleStartServer} disabled={serverLoading}
                  className="h-8 px-4 rounded-md bg-accent text-pm-xs font-semibold text-surface-primary hover:bg-accent/90 disabled:opacity-50 transition-colors">
                  {serverLoading ? 'Se pornește...' : 'Pornește'}
                </button>
              </div>
            )}
          </div>
          {serverRunning && localIp && (
            <div className="p-3 rounded-md bg-surface-secondary border border-line/60">
              <p className="text-pm-2xs text-content-muted mb-1">Link pentru utilizatori:</p>
              <code className="text-pm-sm font-mono text-accent select-all cursor-pointer">
                http://{localIp}:{serverPort}
              </code>
            </div>
          )}
          {serverMsg && !serverRunning && <p className="text-pm-xs text-content-muted">{serverMsg}</p>}
        </div>
      )}

      {}
      <SectionGroup title="Conexiune server (client)">
        <FieldRow label="URL Server" hint="Acceptă URL-uri din rețeaua locală sau publice HTTPS.">
          <div className="flex gap-2">
            <input type="text" value={url} onChange={e => { setUrl(e.target.value); setSaved(false); }}
              placeholder="http://192.168.1.100:3500" className={inputCls} />
            <button onClick={handleTest} disabled={testing}
              className="shrink-0 h-9 px-4 rounded-md bg-accent text-pm-sm font-semibold text-surface-primary hover:bg-accent/90 disabled:opacity-50">
              {testing ? 'Testez...' : 'Testează'}
            </button>
          </div>
        </FieldRow>

        {url.startsWith('http://') && !/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url) && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-status-amber/8 border border-status-amber/20">
            <AlertCircle className="h-4 w-4 text-status-amber shrink-0 mt-0.5" />
            <p className="text-pm-xs text-content-secondary">URL public fără HTTPS — traficul circulă necriptat.</p>
          </div>
        )}

        {status && <StatusPill ok={status.ok} message={status.message} />}

        <div className="flex items-center gap-3">
          <SaveBtn onClick={handleSave} saved={saved} />
          {isServerMode() && (
            <button onClick={handleDisconnect}
              className="h-9 px-4 rounded-md border border-status-red/30 text-pm-sm font-medium text-status-red hover:bg-status-red/8 transition-colors">
              Deconectează
            </button>
          )}
        </div>

        <div className="pt-2 border-t border-line/40">
          <p className="text-pm-xs text-content-muted">
            Mod curent: <span className="font-semibold text-content-primary">
              {isServerMode() ? `Server (${getServerUrl()})` : 'Local'}
            </span>
          </p>
        </div>
      </SectionGroup>
    </div>
  );
}





function AiSection() {
  const [url, setUrl] = useState(getAiServiceUrl());
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [processState, setProcessState] = useState<{ running: boolean; pid: number | null; exe: string | null }>({ running: false, pid: null, exe: null });
  const [starting, setStarting] = useState(false);
  const isElectron = typeof window !== 'undefined' && 'electron' in window;

  useEffect(() => {
    if (!isElectron) return;
    const check = () => { window.electron.invoke('ai_service_status').then((raw: unknown) => setProcessState(raw as { running: boolean; pid: number | null; exe: string | null })).catch(() => {}); };
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, [isElectron]);

  const handleStart = useCallback(async () => {
    if (!isElectron) return;
    setStarting(true);
    try {
      const result = await window.electron.invoke('ai_service_start') as { ok?: boolean; message?: string; pid?: number | null };
      if (result.ok) { setProcessState({ running: true, pid: result.pid ?? null, exe: processState.exe }); toast.success(result.message ?? ''); }
      else toast.error(result.message ?? 'Eroare');
    } catch (e) { toast.error(e instanceof Error ? getErrorMessage(e) : 'Eroare'); }
    setStarting(false);
  }, [isElectron, processState.exe]);

  const handleStop = useCallback(async () => {
    if (!isElectron) return;
    try {
      const result = await window.electron.invoke('ai_service_stop') as { ok?: boolean; message?: string };
      setProcessState({ running: false, pid: null, exe: processState.exe }); toast.success(result.message ?? '');
    } catch (e) { toast.error(e instanceof Error ? getErrorMessage(e) : 'Eroare'); }
  }, [isElectron, processState.exe]);

  const handleTest = useCallback(async () => {
    setTesting(true); setStatus(null);
    try {
      const ok = await aiHealth();
      setStatus(ok ? { ok: true, message: 'Conectat la AI Service' } : { ok: false, message: 'AI Service nu răspunde' });
    } catch { setStatus({ ok: false, message: 'Nu se poate conecta' }); }
    setTesting(false);
  }, []);

  const handleSave = useCallback(() => {
    try {
      setAiServiceUrl(url);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'URL nepermis pentru AI service'));
    }
  }, [url]);
  const handleReset = useCallback(() => { setAiServiceUrl(''); setUrl(getAiServiceUrl()); setSaved(true); setTimeout(() => setSaved(false), 2000); }, []);

  return (
    <div className="space-y-6">
      {}
      {isElectron && (
        <div className="rounded-lg border border-line bg-surface-primary p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${processState.running ? 'bg-status-green' : 'bg-content-muted/40'}`} />
              <div>
                <p className="text-pm-sm font-semibold text-content-primary">
                  {processState.running ? 'AI Service activ' : 'AI Service oprit'}
                </p>
                {processState.running && processState.pid && (
                  <p className="text-pm-2xs text-content-muted tabular-nums">PID {processState.pid}</p>
                )}
              </div>
            </div>
            {processState.running ? (
              <button onClick={handleStop}
                className="h-8 px-4 rounded-md border border-status-red/30 text-pm-xs font-semibold text-status-red hover:bg-status-red/8 transition-colors">
                Oprește
              </button>
            ) : (
              <button onClick={handleStart} disabled={starting}
                className="h-8 px-4 rounded-md bg-status-green text-pm-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-colors">
                {starting ? 'Se pornește...' : 'Pornește AI'}
              </button>
            )}
          </div>
          {processState.exe && <p className="text-pm-2xs text-content-muted font-mono mt-3 truncate">{processState.exe}</p>}
          {!processState.exe && !processState.running && (
            <p className="text-pm-2xs text-status-amber mt-3">ai-service.exe nu a fost găsit.</p>
          )}
        </div>
      )}

      {}
      <SectionGroup title="Conexiune">
        <FieldRow label="URL AI Service">
          <div className="flex gap-2">
            <input type="text" value={url} onChange={e => { setUrl(e.target.value); setSaved(false); }}
              placeholder="http://localhost:8100" className={inputCls} />
            <button onClick={handleTest} disabled={testing}
              className="shrink-0 h-9 px-4 rounded-md bg-accent text-pm-sm font-semibold text-surface-primary hover:bg-accent/90 disabled:opacity-50">
              {testing ? 'Testez...' : 'Testează'}
            </button>
          </div>
        </FieldRow>
        {status && <StatusPill ok={status.ok} message={status.message} />}
        <div className="flex gap-2">
          <SaveBtn onClick={handleSave} saved={saved} />
          <button onClick={handleReset}
            className="h-9 px-4 rounded-md border border-line text-pm-sm font-medium text-content-secondary hover:bg-surface-tertiary transition-colors">
            Resetare
          </button>
        </div>
      </SectionGroup>
    </div>
  );
}





interface BackupStatus {
  directory: string;
  intervalHours: number;
  cooldownHours: number;
  keepCount: number;
  totalCount: number;
  lastBackupAt: number | null;
  lastBackupName: string | null;
}

interface BackupItem {
  name: string;
  size: number;
  mtime: number;
  kind: 'rolling' | 'pre-migrate' | 'manual' | 'other';
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(ms: number | null): string {
  if (!ms) return 'niciodată';
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1)        return 'acum câteva secunde';
  if (min < 60)       return `acum ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24)        return `acum ${hr} ${hr === 1 ? 'oră' : 'ore'}`;
  const days = Math.floor(hr / 24);
  if (days < 30)      return `acum ${days} ${days === 1 ? 'zi' : 'zile'}`;
  return new Date(ms).toLocaleDateString('ro-RO');
}

const KIND_LABEL: Record<BackupItem['kind'], string> = {
  rolling:      'zilnic',
  'pre-migrate':'pre-migrație',
  manual:       'manual',
  other:        '—',
};

const KIND_TONE: Record<BackupItem['kind'], StatusTone> = {
  rolling:      'success',
  'pre-migrate':'info',
  manual:       'accent',
  other:        'neutral',
};

function BackupSection() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [list, setList]     = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const [s, l] = await Promise.all([
        apiCommand<BackupStatus>('backup_status'),
        apiCommand<BackupItem[]>('backup_list'),
      ]);
      setStatus(s);
      setList(l || []);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, 'Nu am putut încărca starea backup-ului'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const runNow = useCallback(async () => {
    setRunning(true);
    try {
      const r = await apiCommand<{ skipped: boolean; file?: string; reason?: string }>('backup_run_now');
      if (r.skipped) toast.info(`Backup omis: ${r.reason || 'există deja unul recent'}`);
      else            toast.success('Backup creat cu succes');
      await refresh();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Backup eșuat'));
    } finally {
      setRunning(false);
    }
  }, [refresh]);

  if (loading) {
    return <div className="text-pm-sm text-content-muted">Se încarcă starea backup-ului...</div>;
  }

  if (err) {
    return (
      <div className="rounded-md bg-status-red/10 border border-status-red/30 px-4 py-3 text-pm-sm text-status-red">
        {err}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {}
      <SectionGroup title="Stare">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <StatCard
            icon={Clock}
            label="Ultimul backup automat"
            value={status?.lastBackupAt ? formatRelativeTime(status.lastBackupAt) : 'încă nu s-a făcut'}
            sub={status?.lastBackupName || undefined}
          />
          <StatCard
            icon={Database}
            label="Total fișiere backup"
            value={`${status?.totalCount ?? 0}`}
            sub={`${status?.keepCount ?? 0} zilnice păstrate`}
          />
          <StatCard
            icon={RefreshCw}
            label="Frecvență backup zilnic"
            value={`la fiecare ${status?.intervalHours ?? 6}h`}
            sub={`cooldown ${status?.cooldownHours ?? 24}h între copii`}
          />
          <StatCard
            icon={Folder}
            label="Locație"
            value={status?.directory ? truncatePath(status.directory) : '—'}
            sub={status?.directory || undefined}
            mono
          />
        </div>
      </SectionGroup>

      {}
      <SectionGroup>
        <div className="flex items-center gap-2">
          <button
            onClick={runNow}
            disabled={running}
            className="h-9 px-5 rounded-md bg-accent text-pm-sm font-semibold text-surface-primary hover:bg-accent/90 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            {running ? 'Se face backup...' : 'Backup acum'}
          </button>
          <button
            onClick={refresh}
            className="h-9 px-4 rounded-md border border-line text-pm-sm text-content-secondary hover:bg-surface-tertiary/60 hover:text-content-primary transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizează
          </button>
        </div>
        <p className="text-pm-xs text-content-muted">
          Backup-urile sunt salvate pe acelasi server. Pentru rezistenta la dezastru,
          copiaza periodic folderul intr-un drive extern sau cloud.
        </p>
      </SectionGroup>

      {}
      <SectionGroup title={`Backup-uri (${list.length})`}>
        {list.length === 0 ? (
          <EmptyState
            icon={Database}
            title="Niciun backup încă"
            description="Apasă „Backup acum” pentru a crea prima copie de siguranță a bazei de date."
          />
        ) : (
          <div className="border border-line rounded-md overflow-hidden">
            <table className="w-full text-pm-sm">
              <thead className="bg-surface-tertiary/40 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">
                <tr>
                  <th className="text-left px-3 py-2">Fișier</th>
                  <th className="text-left px-3 py-2">Tip</th>
                  <th className="text-right px-3 py-2">Mărime</th>
                  <th className="text-left px-3 py-2">Data</th>
                </tr>
              </thead>
              <tbody key={list.length} className="stagger-in">
                {list.map((b) => (
                  <tr key={b.name} className="border-t border-line/60 hover:bg-surface-tertiary/40 transition-colors">
                    <td className="px-3 py-2 font-mono text-pm-xs text-content-secondary truncate" title={b.name}>{b.name}</td>
                    <td className="px-3 py-2">
                      <StatusBadge tone={KIND_TONE[b.kind]} label={KIND_LABEL[b.kind]} size="xs" />
                    </td>
                    <td className="px-3 py-2 text-right text-content-muted tabular-nums">{formatBytes(b.size)}</td>
                    <td className="px-3 py-2 text-content-muted tabular-nums">{new Date(b.mtime).toLocaleString('ro-RO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionGroup>

      {}
      <AutoBackupPanel />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, mono }: {
  icon: typeof Database; label: string; value: string; sub?: string; mono?: boolean;
}) {
  return (
    <div className="border border-line rounded-md bg-surface-primary px-4 py-3">
      <div className="flex items-center gap-2 text-pm-2xs uppercase tracking-wider text-content-muted">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1.5 text-pm-md font-semibold text-content-primary ${mono ? 'font-mono text-pm-sm' : ''}`}>
        {value}
      </div>
      {sub && (
        <div className={`text-pm-xs text-content-muted mt-0.5 truncate ${mono ? 'font-mono' : ''}`} title={sub}>
          {sub}
        </div>
      )}
    </div>
  );
}

function truncatePath(p: string, max = 40): string {
  if (p.length <= max) return p;
  return '...' + p.slice(p.length - max + 3);
}
















const EMAIL_DRAFT_KEY = 'promix_email_setup_draft_v1';
const EMAIL_DRAFT_INITIAL = {
  email_address: '', display_name: '', imap_host: '', imap_port: '993',
  imap_username: '', imap_password: '', smtp_host: '', smtp_port: '587',
  smtp_username: '', smtp_password: '',
};

function EmailSection() {
  const [config, setConfig] = useLocalStorage<typeof EMAIL_DRAFT_INITIAL>(EMAIL_DRAFT_KEY, EMAIL_DRAFT_INITIAL);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [, setHasAccount] = useState(false);

  useEffect(() => {
    
    
    
    apiCommand<any>('email_get_account').then(acc => {
      if (!acc) return;
      setHasAccount(true);
      setConfig(prev => {
        const isPristine = !prev.email_address && !prev.imap_host && !prev.smtp_host
          && !prev.imap_password && !prev.smtp_password;
        if (!isPristine) return prev;
        return {
          ...prev,
          email_address:  acc.email_address,
          display_name:   acc.display_name,
          imap_host:      acc.imap_host,
          imap_port:      String(acc.imap_port),
          smtp_host:      acc.smtp_host,
          smtp_port:      String(acc.smtp_port),
          imap_username:  acc.email_address,
          smtp_username:  acc.email_address,
        };
      });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTest = async () => {
    setTesting(true); setStatus(null);
    try { const r = await apiCommand<string>('email_test_connection', { ...config, imap_port: Number(config.imap_port), smtp_port: Number(config.smtp_port) }); setStatus(r || 'Conexiune reușită!'); }
    catch (err) { setStatus(err instanceof Error ? getErrorMessage(err) : 'Eroare conexiune'); }
    finally { setTesting(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiCommand('email_save_account', { ...config, imap_port: Number(config.imap_port), smtp_port: Number(config.smtp_port) });
      setHasAccount(true);
      setStatus('Salvat!');
      
      
      
      setConfig(prev => ({ ...prev, imap_password: '', smtp_password: '' }));
    }
    catch (err) { setStatus(err instanceof Error ? getErrorMessage(err) : 'Eroare'); }
    finally { setSaving(false); }
  };

  const f = (key: string, label: string, type = 'text', placeholder = '') => (
    <FieldRow key={key} label={label}>
      <input type={type} value={(config as Record<string, string>)[key] || ''}
        onChange={e => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder} className={inputCls} />
    </FieldRow>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {f('email_address', 'Adresa email', 'email', 'user@firma.ro')}
        {f('display_name', 'Nume afișat', 'text', 'Nume Prenume')}
      </div>

      <SectionGroup title="IMAP (citire)">
        <div className="grid grid-cols-3 gap-3">
          {f('imap_host', 'Host', 'text', 'mail.firma.ro')}
          {f('imap_port', 'Port', 'number', '993')}
          {f('imap_username', 'Username', 'text', 'user@firma.ro')}
        </div>
        {f('imap_password', 'Parolă IMAP', 'password', '••••••••')}
      </SectionGroup>

      <SectionGroup title="SMTP (trimitere)">
        <div className="grid grid-cols-3 gap-3">
          {f('smtp_host', 'Host', 'text', 'mail.firma.ro')}
          {f('smtp_port', 'Port', 'number', '587')}
          {f('smtp_username', 'Username', 'text', 'user@firma.ro')}
        </div>
        {f('smtp_password', 'Parolă SMTP', 'password', '••••••••')}
      </SectionGroup>

      {status && (
        <StatusPill ok={status.includes('reușită') || status.includes('Salvat')} message={status} />
      )}

      <div className="flex gap-2">
        <button onClick={handleTest} disabled={testing}
          className="h-9 px-4 rounded-md border border-line text-pm-sm font-medium text-content-secondary hover:bg-surface-tertiary disabled:opacity-50 transition-colors">
          {testing ? 'Se testează...' : 'Testează conexiunea'}
        </button>
        <SaveBtn onClick={handleSave} saving={saving} />
      </div>
    </div>
  );
}





function FiscalSection() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [refreshingBnr, setRefreshingBnr] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CompanySettings, string>>>({});
  
  const [bnrHistory, setBnrHistory] = useState<Array<{ id: number; rate: number; published_date: string | null; fetched_at: string; source: string }>>([]);
  const loadBnrHistory = useCallback(() => {
    apiCommand<typeof bnrHistory>('get_bnr_rate_history', { limit: 12 }).then(h => setBnrHistory(h || [])).catch(() => {});
  }, []);

  useEffect(() => { apiCommand<CompanySettings>('get_company_settings').then(setSettings).catch(() => {}); loadBnrHistory(); }, [loadBnrHistory]);

  const handleChange = (field: keyof CompanySettings, value: string | number) => {
    if (!settings) return;
    let next: string | number = value;
    if (field === 'cui' && typeof value === 'string') next = maskCui(value);
    if (field === 'iban' && typeof value === 'string') next = maskIban(value);
    setSettings({ ...settings, [field]: next });
    setSaved(false);
    if (errors[field]) setErrors(e => { const c = { ...e }; delete c[field]; return c; });
  };

  const handleBlur = (field: keyof CompanySettings) => {
    if (!settings) return;
    const v = settings[field];
    let err: string | null = null;
    if (field === 'cui' && typeof v === 'string') err = validateCui(v);
    if (field === 'iban' && typeof v === 'string') err = validateIban(v);
    setErrors(e => err ? { ...e, [field]: err! } : (() => { const c = { ...e }; delete c[field]; return c; })());
  };

  const handleSave = async () => {
    if (!settings) return;
    const finalErrors: Partial<Record<keyof CompanySettings, string>> = {};
    const cuiErr = validateCui(String(settings.cui ?? ''));
    if (cuiErr) finalErrors.cui = cuiErr;
    const ibanErr = validateIban(String(settings.iban ?? ''));
    if (ibanErr) finalErrors.iban = ibanErr;
    if (Object.keys(finalErrors).length > 0) { setErrors(finalErrors); toast.error('Verifică câmpurile evidențiate.'); return; }
    setSaving(true);
    try {
      const result = await apiCommand<CompanySettings>('update_company_settings', { ...settings, tva_rate: settings.tva_rate });
      setSettings(result); setSaved(true); toast.success('Setările fiscale au fost salvate');
      
      
      
      void useSettingsStore.getState().load(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { toast.error(err instanceof Error ? getErrorMessage(err) : 'Eroare'); }
    finally { setSaving(false); }
  };

  
  
  
  const handleRefreshBnr = async () => {
    setRefreshingBnr(true);
    try {
      await apiCommand('refresh_exchange_rate', {});
      const fresh = await apiCommand<CompanySettings>('get_company_settings');
      setSettings(fresh);
      void useSettingsStore.getState().load(true);
      loadBnrHistory();
      toast.success(`Curs actualizat din BNR: ${fresh.eur_to_ron_rate} RON/EUR`);
    } catch (err) { toast.error(err instanceof Error ? getErrorMessage(err) : 'Eroare la actualizarea cursului'); }
    finally { setRefreshingBnr(false); }
  };

  if (!settings) return <p className="text-pm-sm text-content-muted">Se încarcă...</p>;

  const fields: { key: keyof CompanySettings; label: string; type?: string; hint?: string; cols?: number }[] = [
    { key: 'company_name', label: 'Denumire firmă', cols: 2 },
    { key: 'cui', label: 'CUI' },
    { key: 'reg_com', label: 'Nr. Reg. Comerțului' },
    { key: 'address', label: 'Adresa', cols: 2 },
    { key: 'city', label: 'Oraș' },
    { key: 'county', label: 'Județ' },
    { key: 'bank_name', label: 'Banca' },
    { key: 'iban', label: 'IBAN' },
    { key: 'tva_rate', label: 'Cota TVA', type: 'number', hint: 'ex: 0.19 = 19%' },
    { key: 'eur_to_ron_rate', label: 'Curs EUR/RON', type: 'number' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {fields.map(f => {
          const placeholder = f.key === 'cui' ? 'RO12345678' : f.key === 'iban' ? 'RO00 BANK 0000 0000 0000 0000' : undefined;
          return (
            <div key={f.key} className={f.cols === 2 ? 'col-span-2' : ''}>
              <FieldRow label={f.label} hint={f.hint} error={errors[f.key]}>
                <input
                  type={f.type || 'text'}
                  step={f.type === 'number' ? '0.01' : undefined}
                  value={settings[f.key] as string | number}
                  onChange={e => handleChange(f.key, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                  onBlur={() => handleBlur(f.key)}
                  placeholder={placeholder}
                  className={`${inputCls} ${errors[f.key] ? 'border-status-red focus:ring-status-red/30' : ''} ${f.key === 'iban' ? 'font-mono tracking-wider' : ''}`}
                />
              </FieldRow>
            </div>
          );
        })}

        <FieldRow label="Monedă default">
          <select value={settings.default_currency} onChange={e => handleChange('default_currency', e.target.value)}
            className={inputCls}>
            <option value="RON">RON</option>
            <option value="EUR">EUR</option>
          </select>
        </FieldRow>
      </div>

      {}
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={handleRefreshBnr} disabled={refreshingBnr}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded border border-line text-pm-xs text-content-secondary hover:bg-surface-tertiary hover:text-content-primary disabled:opacity-50 transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshingBnr ? 'animate-spin' : ''}`} /> Actualizează din BNR
        </button>
        <span className="text-pm-2xs text-content-muted">
          {settings.eur_to_ron_rate_updated_at
            ? `Curs actualizat ${formatDateTimeRo(settings.eur_to_ron_rate_updated_at)}${settings.eur_to_ron_rate_source ? ` · ${settings.eur_to_ron_rate_source === 'bnr' ? 'BNR' : 'manual'}` : ''}`
            : 'Cursul nu a fost încă sincronizat din BNR'}
        </span>
      </div>

      {}
      {bnrHistory.length > 0 && (
        <div className="rounded border border-line overflow-hidden">
          <div className="px-3 py-1.5 bg-surface-secondary border-b border-line text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">
            Istoric curs EUR/RON
          </div>
          <div key={bnrHistory.length} className="max-h-44 overflow-y-auto divide-y divide-line stagger-in">
            {bnrHistory.map(h => (
              <div key={h.id} className="flex items-center justify-between px-3 py-1.5 text-pm-xs">
                <span className="tabular-nums font-medium text-content-primary">{h.rate.toFixed(4)} <span className="text-content-muted font-normal">RON/EUR</span></span>
                <span className="text-pm-2xs text-content-muted">
                  {h.published_date || formatDateTimeRo(h.fetched_at)}
                  <span className="ml-1.5 text-content-muted/70">· {h.source === 'bnr' ? 'BNR' : h.source === 'seed' ? 'inițial' : 'manual'}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SaveBtn onClick={handleSave} saving={saving} saved={saved} />
    </div>
  );
}
