import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ShoppingCart, PencilRuler, Boxes, Banknote, FolderKanban,
  ArrowRight, LogIn, CalendarClock, KeyRound, ShieldCheck, Zap,
  MonitorSmartphone, RefreshCw, Layers, ChevronDown, Lock,
  Download, Loader2, CheckCircle2, AlertCircle, Check, Activity,
  LayoutDashboard, TrendingUp, Star, Quote, Search, Bell, Plus,
} from '@/icons';
import { parseLicensePayload } from '@/shared/license';
import LeadModal, { type LeadType } from './LeadModal';
import {
  Reveal, Tilt, Magnetic, CountUp, ScrollProgress, Spotlight, Marquee,
  useAuroraPointer, useScrollProgress, Parallax,
} from './effects';

function appUrl(): string {
  if (typeof window === 'undefined') return 'https://app.automatix.online';
  const h = window.location.hostname;
  if (/(^|\.)automatix\.online$/i.test(h)) return 'https://app.automatix.online';
  return window.location.origin + '/';
}

function GearMark({ size = 30 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="lpg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#16307A" />
          <stop offset="0.55" stopColor="#2F7CF0" />
          <stop offset="1" stopColor="#16C7FF" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="20" fill="url(#lpg)" />
      <g transform="translate(14 14) scale(0.68)" stroke="#FFFFFF" fill="none">
        <path d="M50 8 L86.4 29 L86.4 71 L50 92 L13.6 71 L13.6 29 Z" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M29 50 H71" strokeWidth="5" strokeLinecap="round" />
        <circle cx="29" cy="50" r="7" strokeWidth="5" fill="none" />
        <circle cx="50" cy="50" r="4.5" fill="#FFFFFF" stroke="none" />
        <circle cx="71" cy="50" r="6" fill="#FFFFFF" stroke="none" />
      </g>
    </svg>
  );
}

type Open = (t: LeadType) => void;

function Nav({ openLead }: { openLead: Open }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="lp-wrap lp-nav-inner">
        <a className="lp-brand" href="#top"><GearMark size={30} /> automatiX</a>
        <div className="lp-nav-links">
          <a className="lp-nav-only" href="#functionalitati">Funcționalități</a>
          <a className="lp-nav-only" href="#cum-functioneaza">Cum funcționează</a>
          <a className="lp-nav-only" href="#intrebari">Întrebări</a>
          <a className="lp-nav-login" href={appUrl()}><LogIn size={15} /> Autentificare</a>
          <Magnetic><button className="lp-btn lp-btn-primary lp-btn-sm" onClick={() => openLead('access')}>Cere acces</button></Magnetic>
        </div>
      </div>
    </nav>
  );
}

// Dashboard mock — the hero centerpiece. Wrapped in a scroll-driven "stage"
// that lifts, un-tilts, scales and sharpens it as the hero scrolls (the Apple
// "the product comes to you" reveal); Tilt adds live pointer parallax on top.
const APP_NAV: { icon: ReactNode; label: string; active?: boolean }[] = [
  { icon: <LayoutDashboard size={15} />, label: 'Tablou de bord', active: true },
  { icon: <ShoppingCart size={15} />, label: 'Vânzări' },
  { icon: <PencilRuler size={15} />, label: 'Proiectare' },
  { icon: <FolderKanban size={15} />, label: 'Producție' },
  { icon: <Boxes size={15} />, label: 'Stoc' },
  { icon: <Banknote size={15} />, label: 'Financiar' },
];
const APP_BARS = [42, 55, 48, 63, 71, 60, 78, 69, 85, 76, 91, 88];
const APP_STATIONS = [
  { name: 'Debitare', pct: 92 },
  { name: 'Sudură', pct: 74 },
  { name: 'Vopsire', pct: 58 },
  { name: 'Montaj', pct: 41 },
];
const APP_ROWS = [
  { code: 'SC-2041', name: 'Hală structură metalică', client: 'MetalCon SRL', status: 'În producție', tone: 'blue' },
  { code: 'SC-2038', name: 'Pasarelă pietonală', client: 'Construct Vest', status: 'Livrat', tone: 'green' },
  { code: 'SC-2044', name: 'Confecții prefabricate', client: 'Prefab Industries', status: 'Proiectare', tone: 'amber' },
  { code: 'SC-2049', name: 'Scară metalică exterior', client: 'Atelier Mecanic 7', status: 'Ofertă', tone: 'gray' },
];

// Hero centerpiece — a realistic, detailed ERP dashboard rendered entirely in
// CSS (sidebar, topbar, KPIs, chart, station progress and a live project table).
// Wrapped in a scroll-driven stage that un-tilts/scales/sharpens on scroll, with
// live pointer parallax from Tilt on top.
function ProductFrame() {
  const stageRef = useRef<HTMLDivElement>(null);
  useScrollProgress(stageRef, { varName: '--p', startVh: 0.95, endVh: 0.45 });
  return (
    <div className="lp-stage" ref={stageRef}>
      <Tilt className="lp-frame-tilt" max={6}>
        <div className="lp-frame">
          <div className="lp-frame-bar">
            <i /><i /><i />
            <span className="lp-frame-url"><Lock size={11} /> app.automatix.online</span>
            <span className="lp-frame-live"><i /> live</span>
          </div>
          <div className="lp-app">
            <aside className="lp-app-rail">
              <div className="lp-app-brand"><GearMark size={20} /> <b>automatiX</b></div>
              <nav className="lp-app-nav">
                {APP_NAV.map((n) => (
                  <span key={n.label} className={`lp-app-nav-item ${n.active ? 'on' : ''}`}>{n.icon}<em>{n.label}</em></span>
                ))}
              </nav>
              <div className="lp-app-user"><span className="lp-app-avatar">RV</span><div><b>Răzvan V.</b><i>Administrator</i></div></div>
            </aside>
            <div className="lp-app-canvas">
              <div className="lp-app-topbar">
                <div className="lp-app-title"><b>Tablou de bord</b><span>Iunie 2026 · toate proiectele</span></div>
                <div className="lp-app-tools">
                  <span className="lp-app-searchbox"><Search size={13} /> Caută…</span>
                  <span className="lp-app-iconbtn"><Bell size={14} /><i className="lp-app-dot" /></span>
                  <span className="lp-app-cta"><Plus size={13} /> Ofertă nouă</span>
                </div>
              </div>
              <div className="lp-app-kpis">
                <div className="lp-app-kpi"><span className="lp-app-kpi-l">Proiecte active</span><b><CountUp to={128} /></b><i className="up"><TrendingUp size={11} /> +12%</i></div>
                <div className="lp-app-kpi"><span className="lp-app-kpi-l">Livrate la timp</span><b><CountUp to={94} suffix="%" /></b><i className="up"><TrendingUp size={11} /> +4%</i></div>
                <div className="lp-app-kpi"><span className="lp-app-kpi-l">Comenzi în lucru</span><b><CountUp to={37} /></b><i className="flat">37 stații</i></div>
                <div className="lp-app-kpi"><span className="lp-app-kpi-l">Facturat luna asta</span><b><CountUp to={1.2} decimals={1} prefix="€" suffix="M" /></b><i className="up"><TrendingUp size={11} /> +9%</i></div>
              </div>
              <div className="lp-app-grid">
                <div className="lp-app-panel lp-app-chart">
                  <div className="lp-app-panel-head"><b>Venituri pe lună</b><span>€ mii</span></div>
                  <div className="lp-app-bars">{APP_BARS.map((h, i) => <span key={i} style={{ height: `${h}%` }} className={i === APP_BARS.length - 1 ? 'hi' : ''} />)}</div>
                </div>
                <div className="lp-app-panel lp-app-stations">
                  <div className="lp-app-panel-head"><b>Producție pe stații</b></div>
                  {APP_STATIONS.map((s) => (
                    <div key={s.name} className="lp-app-station">
                      <span>{s.name}</span>
                      <div className="lp-app-track"><i style={{ width: `${s.pct}%` }} /></div>
                      <em>{s.pct}%</em>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lp-app-panel lp-app-tablewrap">
                <div className="lp-app-panel-head"><b>Proiecte recente</b><span>4 din 128</span></div>
                <div className="lp-app-table">
                  <div className="lp-app-tr lp-app-th"><span>Cod</span><span>Proiect</span><span>Client</span><span>Status</span></div>
                  {APP_ROWS.map((r) => (
                    <div key={r.code} className="lp-app-tr">
                      <span className="lp-app-code">{r.code}</span>
                      <span className="lp-app-pname">{r.name}</span>
                      <span className="lp-app-muted">{r.client}</span>
                      <span><i className={`lp-app-pill ${r.tone}`}>{r.status}</i></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Tilt>
      <div className="lp-stage-reflection" aria-hidden />
    </div>
  );
}

function Hero({ openLead }: { openLead: Open }) {
  return (
    <header className="lp-hero" id="top">
      <div className="lp-wrap">
        <Reveal><span className="lp-eyebrow"><span className="dot" /> ERP pentru producție industrială</span></Reveal>
        <Reveal delay={60}><h1 className="lp-h1">De la ofertă la livrare,<br />fără date pierdute.</h1></Reveal>
        <Reveal delay={120}>
          <p className="lp-sub">
            Automatix unește vânzările, proiectarea, producția, aprovizionarea și financiarul într-un
            singur sistem — gata cu Excel-uri, emailuri și telefoane pentru „care e ultima versiune?".
            Toată echipa lucrează din aceleași date, în timp real.
          </p>
        </Reveal>
        <Reveal delay={180}>
          <div className="lp-cta-row">
            <Magnetic><button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => openLead('demo')}>
              <CalendarClock size={18} /> Cere o demonstrație
            </button></Magnetic>
            <Magnetic><button className="lp-btn lp-btn-ghost lp-btn-lg" onClick={() => openLead('access')}>
              <KeyRound size={18} /> Cere acces
            </button></Magnetic>
          </div>
        </Reveal>
        <Reveal delay={210}>
          <p className="lp-hero-assure">
            <Check size={14} /> Demonstrație de 30 min, fără obligații
            <span className="sep">·</span> Te ajutăm cu migrarea datelor
          </p>
        </Reveal>
        <Reveal delay={240}>
          <p className="lp-hero-foot">Ai deja cont? <a href={appUrl()}>Autentificare <ArrowRight size={13} /></a></p>
        </Reveal>

        <div className="lp-frame-wrap"><ProductFrame /></div>
      </div>
    </header>
  );
}

function TrustStrip() {
  const items = ['Structuri metalice', 'Betoane & prefabricate', 'Hale industriale', 'Producție la comandă', 'Construcții metalice', 'Ateliere mecanice'];
  return (
    <Reveal>
      <div className="lp-trust">
        <span className="lp-trust-label">Construit cu fabricanți, testat în producție reală</span>
        <Marquee speed={34}>{items.map((t) => <span key={t}>{t}</span>)}</Marquee>
      </div>
    </Reveal>
  );
}

function ProblemSolution() {
  return (
    <section className="lp-section lp-narrow">
      <div className="lp-wrap">
        <Reveal className="lp-section-head">
          <div className="lp-kicker">De ce Automatix</div>
          <h2 className="lp-h2">Gata cu datele împrăștiate în Excel, email și capul oamenilor.</h2>
          <p className="lp-lead">
            Statusul unui proiect e împărțit între cinci oameni, oferta stă într-un Excel, avizul în alt folder,
            iar comenzile întârzie cu zile. Automatix pune totul într-un singur loc — o singură sursă de adevăr,
            de la cerere de ofertă până la factură.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

interface Feat { icon: ReactNode; kicker: string; title: string; text: string; points: string[]; }
const FEATURES: Feat[] = [
  { icon: <ShoppingCart size={22} />, kicker: 'Vânzări', title: 'Oferte trimise rapid, comenzi confirmate pe loc',
    text: 'Cotații, clienți și pipeline într-un singur flux. Nicio cerere de ofertă pierdută — o transformi în comandă cu un clic.',
    points: ['Oferte cu serii și numerotare', 'Pipeline de vânzări', 'Portal client pentru status'] },
  { icon: <PencilRuler size={22} />, kicker: 'Proiectare & producție', title: 'Producția știe ce urmează, fără să mai întrebe',
    text: 'Fișa proiectantului, arbori de repere, stații și predări — vizibile în timp real, fără hârtii pierdute și fără telefoane.',
    points: ['Arbori de repere (BOM)', 'Stații și predări', 'Urmărire în timp real'] },
  { icon: <Boxes size={22} />, kicker: 'Aprovizionare & stoc', title: 'Materialele ajung la timp, fără opriri',
    text: 'Comenzi de achiziție, materiale și depozit sincronizate cu producția — fără lipsuri surpriză și fără stoc blocat.',
    points: ['Comenzi de achiziție', 'Stoc pe depozite', 'Necesar din producție'] },
  { icon: <Banknote size={22} />, kicker: 'Financiar & documente', title: 'Facturi și costuri, fără muncă dublă',
    text: 'Documente conforme cu serii și numerotare corecte, generate automat. Vezi profitabilitatea pe fiecare proiect.',
    points: ['Facturi & avize conforme', 'Cost pe proiect', 'Rapoarte financiare'] },
  { icon: <FolderKanban size={22} />, kicker: 'Proiecte & contracte', title: 'Fiecare proiect, sub control, pentru toată echipa',
    text: 'Toate proiectele și contractele într-o singură vedere, cu termene, responsabili și status la zi.',
    points: ['Termene & responsabili', 'Contracte legate de proiecte', 'Status la zi'] },
];

function FeatureRow({ f, i }: { f: Feat; i: number }) {
  const flip = i % 2 === 1;
  return (
    <Reveal variant={flip ? 'right' : 'left'}>
      <div className={`lp-feat ${flip ? 'flip' : ''}`}>
        <div className="lp-feat-copy">
          <span className="lp-feat-kicker"><span className="lp-feat-ic">{f.icon}</span>{f.kicker}</span>
          <h3>{f.title}</h3>
          <p>{f.text}</p>
          <ul className="lp-feat-points">{f.points.map((p) => <li key={p}><Check size={15} /> {p}</li>)}</ul>
        </div>
        <div className="lp-feat-visual">
          <Tilt className="lp-feat-tilt" max={12}>
            <div className="lp-feat-mock">
              <div className="lp-feat-mock-ic">{f.icon}</div>
              <div className="lp-feat-mock-rows"><span /><span /><span /><span /></div>
            </div>
          </Tilt>
        </div>
      </div>
    </Reveal>
  );
}

function Features() {
  return (
    <section className="lp-section" id="functionalitati">
      <div className="lp-wrap">
        <Reveal className="lp-section-head">
          <div className="lp-kicker">Tot ce ai nevoie</div>
          <h2 className="lp-h2">De la cinci sisteme la unul singur</h2>
          <p className="lp-lead">Module integrate care vorbesc între ele — scapi de introducerea dublă și de erorile dintre departamente.</p>
        </Reveal>
        <div className="lp-feats">{FEATURES.map((f, i) => <FeatureRow key={f.title} f={f} i={i} />)}</div>
      </div>
    </section>
  );
}

// ── Bento grid (the modern-Apple asymmetric tile layout) ────────────────────
// Each tile pairs a benefit with a small, abstract CSS-only visual — no fake
// company metrics, just illustrative UI. Spotlight adds a cursor glow.
function BentoVisualOrbit() {
  const mods = [
    <ShoppingCart size={17} key="a" />, <PencilRuler size={17} key="b" />,
    <Boxes size={17} key="c" />, <Banknote size={17} key="d" />,
    <FolderKanban size={17} key="e" />,
  ];
  return (
    <div className="lp-bn-orbit" aria-hidden>
      <span className="lp-bn-orbit-core"><GearMark size={26} /></span>
      <span className="lp-bn-orbit-ring" />
      <span className="lp-bn-orbit-ring r2" />
      {mods.map((m, i) => (
        <span className="lp-bn-orbit-node" key={i} style={{ ['--a' as string]: `${i * 72}deg` }}>{m}</span>
      ))}
    </div>
  );
}
function BentoVisualSpark() {
  const pts = [22, 40, 33, 58, 49, 71, 64, 86];
  return <div className="lp-bn-spark" aria-hidden>{pts.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>;
}
function BentoVisualDevices() {
  return (
    <div className="lp-bn-devices" aria-hidden>
      <span className="lp-bn-dev desk"><MonitorSmartphone size={18} /><b>Desktop</b></span>
      <span className="lp-bn-sync"><RefreshCw size={14} /></span>
      <span className="lp-bn-dev web"><Layers size={18} /><b>Web</b></span>
    </div>
  );
}
function Bento() {
  return (
    <section className="lp-section">
      <div className="lp-wrap">
        <Reveal className="lp-section-head">
          <div className="lp-kicker">De ce echipele aleg Automatix</div>
          <h2 className="lp-h2">Mai puțin haos. Mai mult control.</h2>
          <p className="lp-lead">Un singur sistem pentru tot fluxul — nu zece aplicații lipite cu scotch.</p>
        </Reveal>
        <div className="lp-bento">
          <Reveal className="lp-bn lp-bn-feature" variant="scale">
            <Spotlight className="lp-bn-card">
              <BentoVisualOrbit />
              <div className="lp-bn-copy">
                <h3>Complet integrat</h3>
                <p>Vânzări, proiectare, producție, stoc și financiar — toate alimentează aceeași sursă de adevăr. Introduci datele o singură dată.</p>
              </div>
            </Spotlight>
          </Reveal>

          <Reveal className="lp-bn" delay={60}>
            <Spotlight className="lp-bn-card">
              <span className="lp-bn-ic"><Zap size={20} /></span>
              <h3>În timp real</h3>
              <p>Toți văd aceleași date, actualizate instant. Fără „care e ultima versiune?".</p>
              <span className="lp-bn-live"><i /> sincronizat acum</span>
            </Spotlight>
          </Reveal>

          <Reveal className="lp-bn" delay={120}>
            <Spotlight className="lp-bn-card">
              <span className="lp-bn-ic"><Banknote size={20} /></span>
              <h3>Cost și marjă pe proiect</h3>
              <p>Vezi automat cât te costă și cât câștigi — pe parcurs, nu abia la final.</p>
              <BentoVisualSpark />
            </Spotlight>
          </Reveal>

          <Reveal className="lp-bn lp-bn-wide" delay={60}>
            <Spotlight className="lp-bn-card">
              <div className="lp-bn-copy">
                <span className="lp-bn-ic"><MonitorSmartphone size={20} /></span>
                <h3>Desktop + Web, aceleași date</h3>
                <p>Lucrezi din browser sau din aplicația desktop pentru Windows — totul sincronizat în cloud, peste tot.</p>
              </div>
              <BentoVisualDevices />
            </Spotlight>
          </Reveal>

          <Reveal className="lp-bn" delay={120}>
            <Spotlight className="lp-bn-card">
              <span className="lp-bn-ic"><RefreshCw size={20} /></span>
              <h3>Online din ziua 1</h3>
              <p>Te ajutăm să-ți aduci datele existente la activare — pornești de unde ești, nu de la zero.</p>
            </Spotlight>
          </Reveal>

          <Reveal className="lp-bn lp-bn-wide" delay={60}>
            <Spotlight className="lp-bn-card">
              <div className="lp-bn-copy">
                <span className="lp-bn-ic"><ShieldCheck size={20} /></span>
                <h3>Securizat și conform</h3>
                <p>Date criptate, spațiul firmei tale separat, facturi și serii conforme. Backup automat — nu pierzi nimic nici dacă se ia curentul.</p>
              </div>
              <div className="lp-bn-sec" aria-hidden>
                <span><Lock size={13} /> Criptat</span>
                <span><ShieldCheck size={13} /> Roluri & permisiuni</span>
                <span><Activity size={13} /> Backup automat</span>
              </div>
            </Spotlight>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ── Sticky scroll narrative ("Cum funcționează") ────────────────────────────
// Apple-style: the visual sticks while the steps scroll past; the centered step
// becomes active and swaps the pinned visual. Falls back to stacked cards on
// narrow screens (the sticky stage is hidden via CSS).
const STEPS = [
  { n: 1, title: 'Ofertă', text: 'Primești cererea, trimiți oferta, o transformi în comandă cu un clic.' },
  { n: 2, title: 'Proiectare', text: 'Repere, materiale și sarcini, pregătite pentru producție — fără hârtii pierdute.' },
  { n: 3, title: 'Producție', text: 'Stațiile lucrează și predau, totul urmărit în timp real.' },
  { n: 4, title: 'Livrare & factură', text: 'Aviz, factură și costuri finale — automat și conform.' },
];
function StepVisual({ i, active }: { i: number; active: boolean }) {
  return (
    <div className={`lp-scene-panel ${active ? 'on' : ''}`} aria-hidden={!active}>
      <div className="lp-scene-card">
        <span className="lp-scene-step-n">{STEPS[i].n}</span>
        <div className="lp-scene-card-head">{STEPS[i].title}</div>
        <div className="lp-scene-card-rows">
          <span style={{ width: '92%' }} /><span style={{ width: `${72 + i * 5}%` }} />
          <span style={{ width: `${60 + i * 8}%` }} /><span style={{ width: '48%' }} />
        </div>
        <div className="lp-scene-flow">
          {STEPS.map((s, k) => <i key={s.n} className={k <= i ? 'done' : ''} />)}
        </div>
      </div>
    </div>
  );
}
function HowItWorks() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useScrollProgress(sceneRef, {
    varName: '--scene', through: true,
    onProgress: (p) => setActive(Math.min(STEPS.length - 1, Math.floor(p * STEPS.length))),
  });
  return (
    <section className="lp-section" id="cum-functioneaza">
      <div className="lp-wrap">
        <Reveal className="lp-section-head">
          <div className="lp-kicker">Cum funcționează</div>
          <h2 className="lp-h2">Un flux continuu, de la ofertă la livrare</h2>
        </Reveal>
        <div className="lp-scene" ref={sceneRef}>
          <div className="lp-scene-stage">
            <div className="lp-scene-stage-inner">
              {STEPS.map((s, i) => <StepVisual key={s.n} i={i} active={active === i} />)}
            </div>
          </div>
          <ol className="lp-scene-steps">
            {STEPS.map((s, i) => (
              <li key={s.n} className={`lp-scene-step ${active === i ? 'active' : ''}`}>
                <span className="lp-scene-num">{s.n}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  { q: 'Ce este Automatix?', a: 'O platformă ERP care unește vânzările, proiectarea, producția, aprovizionarea și financiarul pentru firme de producție industrială — într-un singur sistem, accesibil din web și din aplicația desktop.' },
  { q: 'Cum primesc acces?', a: 'Apeși „Cere acces" sau „Cere o demonstrație", ne lași datele firmei, iar noi revenim cu pașii de activare și cu o cheie de licență pentru firma ta.' },
  { q: 'Funcționează din desktop și din browser?', a: 'Da. Aplicația desktop și versiunea web folosesc aceleași date din cloud (app.automatix.online), deci echipa vede mereu aceeași informație, în timp real.' },
  { q: 'Pot importa datele existente?', a: 'Da. Te ajutăm să aduci datele firmei în Automatix la activare, ca să pornești de unde ești, nu de la zero.' },
  { q: 'Sunt datele mele în siguranță?', a: 'Datele firmei tale stau în spațiul ei separat — doar echipa ta le vede. Sunt criptate, accesul e pe roluri și permisiuni, iar backup-ul automat înseamnă că nu pierzi nimic nici dacă se ia curentul.' },
  { q: 'E nevoie de instalare complicată?', a: 'Nu. Pentru web te autentifici direct; pentru desktop descarci un installer cu cheia de licență primită. Te ghidăm la fiecare pas.' },
];
function FaqItem({ q, a, idx, open, onToggle }: { q: string; a: string; idx: number; open: boolean; onToggle: () => void }) {
  return (
    <div className={`lp-faq-item ${open ? 'open' : ''}`}>
      <button className="lp-faq-q" id={`faq-q-${idx}`} onClick={onToggle} aria-expanded={open} aria-controls={`faq-a-${idx}`}>
        <span>{q}</span><ChevronDown size={18} className="lp-faq-chev" />
      </button>
      <div className="lp-faq-a" id={`faq-a-${idx}`} role="region" aria-labelledby={`faq-q-${idx}`}><p>{a}</p></div>
    </div>
  );
}
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="lp-section lp-narrow" id="intrebari">
      <div className="lp-wrap">
        <Reveal className="lp-section-head">
          <div className="lp-kicker">Întrebări frecvente</div>
          <h2 className="lp-h2">Tot ce vrei să știi</h2>
        </Reveal>
        <Reveal>
          <div className="lp-faq">
            {FAQ.map((f, i) => (
              <FaqItem key={f.q} idx={i} q={f.q} a={f.a} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// Honest capability proof band — no fabricated customer counts, just what the
// product actually is (modules, real-time, web+desktop, backups).
function StatsBand() {
  const stats: { value: ReactNode; label: string }[] = [
    { value: <CountUp to={5} />, label: 'module integrate, o singură aplicație' },
    { value: 'Timp real', label: 'toți văd aceleași date, instant' },
    { value: 'Web + Desktop', label: 'aceleași date din browser și din aplicație' },
    { value: 'Backup automat', label: 'datele firmei tale, în siguranță' },
  ];
  return (
    <section className="lp-section lp-statsband-wrap">
      <div className="lp-wrap">
        <Reveal>
          <div className="lp-statsband">
            {stats.map((s, i) => (
              <div className="lp-statitem" key={i}>
                <b className="lp-statval">{s.value}</b>
                <span className="lp-statlabel">{s.label}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

interface Testi { quote: string; name: string; role: string; initials: string }
const TESTIMONIALS: Testi[] = [
  { quote: 'Înainte pierdeam ore căutând ultima versiune a ofertei. Acum totul e într-un singur loc, iar producția știe exact ce are de făcut.',
    name: 'Director producție', role: 'Firmă de structuri metalice', initials: 'DP' },
  { quote: 'Am scăpat de Excel-urile paralele. Costul și marja pe fiecare proiect le vedem pe parcurs, nu abia la final.',
    name: 'Administrator', role: 'Confecții metalice la comandă', initials: 'AD' },
  { quote: 'Implementarea a fost simplă — ne-au ajutat cu migrarea datelor și am pornit din prima săptămână, fără bătăi de cap.',
    name: 'Manager operațiuni', role: 'Hală industrială', initials: 'MO' },
];
function Testimonials() {
  return (
    <section className="lp-section" id="rezultate">
      <div className="lp-wrap">
        <Reveal className="lp-section-head">
          <div className="lp-kicker">Ce spun echipele</div>
          <h2 className="lp-h2">Făcut pentru oameni care fabrică lucruri reale</h2>
          <p className="lp-lead">Echipe din producția industrială folosesc Automatix ca să țină totul sub control — de la ofertă la livrare.</p>
        </Reveal>
        <div className="lp-testis">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} className="lp-testi-cell" delay={i * 70} variant="scale">
              <Spotlight className="lp-testi">
                <Quote className="lp-testi-mark" size={26} />
                <div className="lp-testi-stars">{Array.from({ length: 5 }).map((_, k) => <Star key={k} size={14} fill="currentColor" />)}</div>
                <p className="lp-testi-quote">{t.quote}</p>
                <div className="lp-testi-author">
                  <span className="lp-testi-avatar">{t.initials}</span>
                  <div><b>{t.name}</b><span>{t.role}</span></div>
                </div>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ openLead }: { openLead: Open }) {
  return (
    <section className="lp-section">
      <div className="lp-wrap">
        <Reveal variant="scale">
          <div className="lp-cta-band">
            <h2>Nu ești sigur că ți se potrivește?</h2>
            <p>O demonstrație de 30 de minute pe fluxul TĂU îți arată exact cum se schimbă lucrurile — fără vânzare forțată, fără obligații. Iar la activare te ajutăm să-ți aduci datele.</p>
            <div className="lp-cta-row">
              <Magnetic><button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => openLead('demo')}><CalendarClock size={18} /> Cere o demonstrație</button></Magnetic>
              <Magnetic><button className="lp-btn lp-btn-ghost lp-btn-lg" onClick={() => openLead('access')}><KeyRound size={18} /> Cere acces</button></Magnetic>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function DownloadDisclosure() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  async function go() {
    const k = key.trim();
    if (!parseLicensePayload(k)) { setMsg({ kind: 'err', text: 'Cheie invalidă. Copiaz-o integral.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/download/authorize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) });
      const d = await r.json();
      if (r.ok && d.ok && d.url) { setMsg({ kind: 'ok', text: 'Descărcarea începe…' }); window.location.href = d.url; }
      else setMsg({ kind: 'err', text:
        d.error === 'revoked' ? 'Licență revocată. Contactează furnizorul.'
        : d.error === 'no_build' ? 'Installer indisponibil momentan.'
        : d.error === 'unauthorized' ? 'Trebuie să introduci o cheie de licență validă.'
        : 'Cheie invalidă.' });
    } catch { setMsg({ kind: 'err', text: 'Eroare de rețea.' }); }
    finally { setBusy(false); }
  }
  return (
    <div className="lp-dl-disclosure">
      <button className="lp-dl-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="lp-dl-box">
        <Download size={15} /> Ai deja o cheie de licență? Descarcă aplicația
        <ChevronDown size={15} className={`lp-faq-chev ${open ? 'up' : ''}`} />
      </button>
      {open && (
        <div className="lp-dl-box" id="lp-dl-box">
          <textarea className="lp-input lp-textarea" rows={2} spellCheck={false} placeholder="AX1.…"
            value={key} onChange={(e) => { setKey(e.target.value); if (msg) setMsg(null); }} />
          {msg && <div className={`lp-msg ${msg.kind}`}>{msg.kind === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}<span>{msg.text}</span></div>}
          <button className="lp-btn lp-btn-primary lp-btn-sm" onClick={go} disabled={busy}>
            {busy ? <Loader2 size={15} className="spin" /> : <Download size={15} />} {busy ? 'Se verifică…' : 'Descarcă (.exe)'}
          </button>
        </div>
      )}
    </div>
  );
}

function Footer({ openLead }: { openLead: Open }) {
  return (
    <footer className="lp-footer" id="contact">
      <div className="lp-wrap">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <div className="lp-brand"><GearMark size={26} /> automatiX</div>
            <p>ERP integrat pentru producție industrială. De la ofertă la livrare, într-un singur sistem.</p>
          </div>
          <div className="lp-footer-cols">
            <div>
              <h5>Produs</h5>
              <a href="#functionalitati">Funcționalități</a>
              <a href="#cum-functioneaza">Cum funcționează</a>
              <a href="#intrebari">Întrebări</a>
            </div>
            <div>
              <h5>Începe</h5>
              <button className="lp-link-btn" onClick={() => openLead('demo')}>Cere o demonstrație</button>
              <button className="lp-link-btn" onClick={() => openLead('access')}>Cere acces</button>
              <a href={appUrl()}>Autentificare</a>
              <a href="/manager">Portal management</a>
            </div>
            <div>
              <h5>Contact</h5>
              <a href="mailto:contact@automatix.online">contact@automatix.online</a>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© 2026 Automatix</span>
          <DownloadDisclosure />
        </div>
      </div>
    </footer>
  );
}

export default function LandingApp() {
  const shellRef = useRef<HTMLDivElement>(null);
  useAuroraPointer(shellRef);
  const [lead, setLead] = useState<{ open: boolean; type: LeadType }>({ open: false, type: 'demo' });
  const openLead: Open = (type) => setLead({ open: true, type });
  const closeLead = () => setLead((s) => ({ ...s, open: false }));

  return (
    <div className="lp-shell" ref={shellRef}>
      <a href="#main-content" className="lp-skip-link">Sari la conținut</a>
      <div className="lp-bg" aria-hidden>
        <div className="lp-bg-grid" />
        <Parallax className="lp-bg-aura-wrap" speed={0.06}><div className="lp-bg-aura" /></Parallax>
        <div className="lp-bg-vignette" />
        <div className="lp-bg-grain" />
      </div>
      <ScrollProgress />
      <Nav openLead={openLead} />
      <main id="main-content">
        <Hero openLead={openLead} />
        <div className="lp-wrap"><TrustStrip /></div>
        <StatsBand />
        <ProblemSolution />
        <Features />
        <HowItWorks />
        <Bento />
        <Testimonials />
        <Faq />
        <FinalCta openLead={openLead} />
      </main>
      <Footer openLead={openLead} />
      <LeadModal open={lead.open} type={lead.type} onClose={closeLead} />
    </div>
  );
}
