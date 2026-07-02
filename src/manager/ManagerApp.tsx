import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  Inbox, KeyRound, Building2, Users as UsersIcon, ShieldCheck, LogOut,
  Loader2, AlertCircle, Lock, ArrowLeft, ShieldQuestion,
} from '@/icons';
import {
  login, verify2fa, logout, isAuthed, currentUser, cmd, type MgrUser,
} from './api';
import { GearMark, Btn, Field } from './ui';
import Leads from './sections/Leads';
import Licenses from './sections/Licenses';
import Tenants from './sections/Tenants';
import Users from './sections/Users';
import MyLicense from './sections/MyLicense';

// ── Login ────────────────────────────────────────────────────────────────────
function LoginView({ onAuthed }: { onAuthed: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (challenge) {
        await verify2fa(challenge, code.trim());
        onAuthed();
        return;
      }
      const r = await login(username.trim(), password);
      if (r.kind === '2fa') { setChallenge(r.challenge); }
      else onAuthed();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Autentificare eșuată');
    } finally { setBusy(false); }
  }

  return (
    <div className="mgr-login">
      <div className="mgr-login-aura" aria-hidden />
      <div className="mgr-login-card">
        <a className="mgr-login-brand" href="/"><GearMark size={34} /> <span>automatiX</span></a>
        <h1>Portal management</h1>
        <p className="mgr-login-sub">Administrează utilizatori, licențe și clienți.</p>

        <form onSubmit={submit} className="mgr-login-form">
          {!challenge ? (
            <>
              <Field label="Utilizator sau email">
                <input className="mgr-input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
              </Field>
              <Field label="Parolă">
                <input className="mgr-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </Field>
            </>
          ) : (
            <>
              <div className="mgr-banner info"><Lock size={15} /><span>Cont protejat cu autentificare în doi pași. Introdu codul din aplicația de autentificare.</span></div>
              <Field label="Cod de verificare">
                <input className="mgr-input" value={code} onChange={(e) => setCode(e.target.value)} autoFocus inputMode="numeric" placeholder="123456" />
              </Field>
            </>
          )}

          {err && <div className="mgr-banner err"><AlertCircle size={15} /><span>{err}</span></div>}

          <Btn type="submit" loading={busy} className="mgr-login-submit">
            {challenge ? <><ShieldCheck size={16} /> Verifică</> : <><Lock size={16} /> Autentificare</>}
          </Btn>
          {challenge && (
            <button type="button" className="mgr-login-back" onClick={() => { setChallenge(null); setCode(''); setErr(null); }}>
              <ArrowLeft size={13} /> Înapoi
            </button>
          )}
        </form>

        <p className="mgr-login-foot">
          Ai nevoie de aplicația completă? <a href="/">Mergi la Automatix</a>
        </p>
      </div>
    </div>
  );
}

// ── Console ──────────────────────────────────────────────────────────────────
interface NavItem { id: string; label: string; icon: ReactNode; group: 'vendor' | 'firm'; render: () => ReactNode }

function NoAccess({ user, onLogout }: { user: MgrUser | null; onLogout: () => void }) {
  return (
    <div className="mgr-noaccess">
      <div className="mgr-noaccess-card">
        <ShieldQuestion size={40} />
        <h2>Acces restricționat</h2>
        <p>
          Contul <strong>{user?.full_name || user?.username}</strong> nu are drepturi de administrare a utilizatorilor sau licențelor.
          Contactează un administrator pentru acces la portal.
        </p>
        <Btn variant="ghost" onClick={onLogout}><LogOut size={15} /> Deconectare</Btn>
      </div>
    </div>
  );
}

function ConsoleView({ onLogout }: { onLogout: () => void }) {
  const user = currentUser();
  const [caps, setCaps] = useState<{ ready: boolean; canVendor: boolean; canFirm: boolean }>({ ready: false, canVendor: false, canFirm: false });
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const isAdmin = user?.role_name === 'admin';
    cmd<{ can_issue: boolean }>('get_license_issuer_state')
      .then((s) => setCaps({ ready: true, canVendor: !!s.can_issue, canFirm: isAdmin }))
      .catch(() => setCaps({ ready: true, canVendor: false, canFirm: isAdmin }));
  }, [user]);

  const allNav: NavItem[] = [
    { id: 'leads', label: 'Solicitări', icon: <Inbox size={17} />, group: 'vendor', render: () => <Leads /> },
    { id: 'licenses', label: 'Licențe', icon: <KeyRound size={17} />, group: 'vendor', render: () => <Licenses /> },
    { id: 'tenants', label: 'Clienți', icon: <Building2 size={17} />, group: 'vendor', render: () => <Tenants /> },
    { id: 'users', label: 'Utilizatori', icon: <UsersIcon size={17} />, group: 'firm', render: () => <Users /> },
    { id: 'mylicense', label: 'Licența mea', icon: <ShieldCheck size={17} />, group: 'firm', render: () => <MyLicense /> },
  ];
  const nav = allNav.filter((n) => (n.group === 'vendor' ? caps.canVendor : caps.canFirm));

  useEffect(() => {
    if (caps.ready && !active && nav.length) setActive(nav[0].id);
  }, [caps.ready, nav, active]);

  if (!caps.ready) {
    return <div className="mgr-boot"><Loader2 size={22} className="mgr-spin" /><span>Se încarcă portalul…</span></div>;
  }
  if (nav.length === 0) return <NoAccess user={user} onLogout={onLogout} />;

  const current = nav.find((n) => n.id === active) || nav[0];
  const vendorNav = nav.filter((n) => n.group === 'vendor');
  const firmNav = nav.filter((n) => n.group === 'firm');

  function navGroup(title: string, items: NavItem[]) {
    if (!items.length) return null;
    return (
      <div className="mgr-nav-group">
        <div className="mgr-nav-title">{title}</div>
        {items.map((n) => (
          <button key={n.id} className={`mgr-nav-item ${current.id === n.id ? 'on' : ''}`} onClick={() => setActive(n.id)}>
            {n.icon}<span>{n.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mgr-shell">
      <aside className="mgr-sidebar">
        <a className="mgr-side-brand" href="/"><GearMark size={28} /> <span>automatiX</span></a>
        <div className="mgr-side-tag">Portal management</div>
        <nav className="mgr-nav">
          {navGroup('Administrare produs', vendorNav)}
          {navGroup('Firma mea', firmNav)}
        </nav>
        <div className="mgr-side-user">
          <div className="mgr-avatar">{(user?.full_name || user?.username || '?').slice(0, 1).toUpperCase()}</div>
          <div className="mgr-side-user-info">
            <div className="mgr-strong">{user?.full_name || user?.username}</div>
            <div className="mgr-muted">{caps.canVendor ? 'Furnizor' : 'Administrator firmă'}</div>
          </div>
          <button className="mgr-icon-btn" onClick={onLogout} aria-label="Deconectare" title="Deconectare"><LogOut size={16} /></button>
        </div>
      </aside>
      <main className="mgr-main">{current.render()}</main>
    </div>
  );
}

export default function ManagerApp() {
  const [authed, setAuthed] = useState(isAuthed());
  function doLogout() { logout(); setAuthed(false); }
  return authed ? <ConsoleView onLogout={doLogout} /> : <LoginView onAuthed={() => setAuthed(true)} />;
}
