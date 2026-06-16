import { useMemo, useState } from 'react';
import {
  ChevronDown, LayoutDashboard, FolderKanban, Factory, ShoppingCart,
  Ruler, Wallet, TrendingUp, Plane, HelpCircle, ScrollText, BookOpen,
} from 'lucide-react';

import changelogRaw from '../../../CHANGELOG.md?raw';



interface Guide { id: string; icon: typeof BookOpen; title: string; body: string[] }

const GUIDES: Guide[] = [
  {
    id: 'dashboard', icon: LayoutDashboard, title: 'Dashboard',
    body: [
      'Ecranul principal rezumă starea firmei: KPI-uri (proiecte active, încasări, oferte, alerte) și grafice de evoluție.',
      'Valorile monetare se afișează în moneda selectată (RON/EUR) folosind cursul BNR. Comutarea monedei se face din colțul de sus.',
    ],
  },
  {
    id: 'proiecte', icon: FolderKanban, title: 'Proiecte',
    body: [
      'Gestionează proiectele de la inițiere la livrare: status, termene, echipă, documente și costuri asociate.',
      'Din fișa unui proiect ai acces la briefing, piese, deplasări și documentele financiare legate.',
    ],
  },
  {
    id: 'productie', icon: Factory, title: 'Producție',
    body: [
      'Urmărește execuția pieselor și a structurilor: stații de lucru, stadii, cantități și documente de producție.',
      'Stadiile pieselor se actualizează din listă; întârzierile apar evidențiate.',
    ],
  },
  {
    id: 'achizitii', icon: ShoppingCart, title: 'Achiziții',
    body: [
      'Comenzi către furnizori, cereri de ofertă (RFQ), recepții de marfă și potrivirea pe trei căi (comandă–recepție–factură).',
      'Codurile de furnizor și urmărirea pieselor comandate ajută la trasabilitate.',
    ],
  },
  {
    id: 'inginerie', icon: Ruler, title: 'Inginerie & Proiectanți',
    body: [
      'Fișele proiectanților, checklist-urile și șabloanele de fișă. La finalizare, fișa poate fi exportată ca PDF.',
      'Briefing-urile de proiect centralizează cerințele tehnice și atașamentele.',
    ],
  },
  {
    id: 'financiar', icon: Wallet, title: 'Financiar',
    body: [
      'Facturi emise/primite, încasări, cheltuieli pe proiect și rapoarte. Fiecare factură poate fi descărcată ca PDF oficial (buton „Descarcă PDF”).',
      'PDF-ul conține antetul firmei cu logo, totalurile în RON și EUR la cursul BNR de la data emiterii, și se arhivează automat pe server.',
    ],
  },
  {
    id: 'vanzari', icon: TrendingUp, title: 'Vânzări',
    body: [
      'Pipeline de lead-uri, oferte (cotații) și clienți. Ofertele se trimit pe email și se pot exporta ca PDF.',
      'Statusul ofertei (trimisă, vizualizată, acceptată) se actualizează automat când clientul o deschide prin link.',
    ],
  },
  {
    id: 'deplasari', icon: Plane, title: 'Deplasări',
    body: [
      'Înregistrează deplasările echipei, diurna și decontările. Valorile se pot introduce în RON sau EUR.',
    ],
  },
];

interface Faq { q: string; a: string }

const FAQ: Faq[] = [
  { q: 'Cum descarc o factură sau o ofertă în PDF?', a: 'Din lista de facturi (Financiar) sau oferte (Vânzări), apasă butonul „Descarcă PDF” de pe rândul documentului. Fișierul se generează pe server, se arhivează automat și se descarcă.' },
  { q: 'De ce apar două valute pe documente?', a: 'Documentele oficiale afișează totalul în moneda documentului plus echivalentul în cealaltă monedă, calculat la cursul BNR valabil la data emiterii.' },
  { q: 'Cum schimb datele firmei sau logo-ul de pe documente?', a: 'Din Setări → Fiscal (date companie) și prin wizardul de configurare inițială (Setări → „Continuă setup inițial”), unde poți încărca logo-ul și sigiliul.' },
  { q: 'Am sărit configurarea inițială. Cum o reiau?', a: 'Mergi în Setări → Fiscal: dacă setup-ul nu e finalizat, vei vedea butonul „Continuă setup inițial” care redeschide wizardul.' },
  { q: 'Unde văd versiunea aplicației și informații de diagnostic?', a: 'În Setări → Despre (vizibil pentru administratori): versiune, runtime, bază de date, căi și ultimele backup-uri.' },
  { q: 'Cum invit utilizatori noi?', a: 'Administratorul poate adăuga utilizatori din wizardul de configurare inițială (pasul Utilizatori) sau ulterior din administrarea conturilor.' },
];



interface Release { version: string; date: string; lines: string[] }

function parseChangelog(raw: string): Release[] {
  const out: Release[] = [];
  let cur: Release | null = null;
  for (const line of raw.split('\n')) {
    const head = line.match(/^##\s*\[?([^\]\s]+)\]?\s*(?:-\s*(.+))?$/);
    if (head) {
      if (cur) out.push(cur);
      cur = { version: head[1], date: (head[2] || '').trim(), lines: [] };
      continue;
    }
    if (cur && line.trim() !== '---' && line.trim() !== '') cur.lines.push(line);
  }
  if (cur) out.push(cur);
  return out;
}

function ReleaseBlock({ rel }: { rel: Release }) {
  return (
    <div className="border-l-2 border-accent/40 pl-4 py-1">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-sm font-bold text-content-primary font-mono">{rel.version}</span>
        {rel.date && <span className="text-pm-2xs text-content-muted">{rel.date}</span>}
      </div>
      <div className="space-y-0.5">
        {rel.lines.map((l, i) => {
          const sub = l.match(/^###\s+(.*)/);
          if (sub) return <p key={i} className="text-pm-2xs font-semibold uppercase tracking-wide text-accent mt-2">{sub[1]}</p>;
          const bullet = l.match(/^[-*]\s+(.*)/);
          if (bullet) return <p key={i} className="text-pm-xs text-content-secondary pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-content-muted">{stripMd(bullet[1])}</p>;
          return <p key={i} className="text-pm-xs text-content-secondary">{stripMd(l)}</p>;
        })}
      </div>
    </div>
  );
}


function stripMd(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1');
}



function Collapsible({ icon: Icon, title, defaultOpen, children }: {
  icon: typeof BookOpen; title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-lg border border-line bg-surface-secondary overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-surface-tertiary/50 transition-colors"
        aria-expanded={open}
      >
        <Icon className="h-4 w-4 text-accent shrink-0" />
        <span className="flex-1 text-sm font-semibold text-content-primary">{title}</span>
        <ChevronDown className={`h-4 w-4 text-content-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}



export default function HelpPanel() {
  const releases = useMemo(() => parseChangelog(changelogRaw), []);
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? releases : releases.slice(0, 5);

  return (
    <div className="max-w-3xl space-y-6">
      {}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-content-primary mb-3">
          <BookOpen className="h-4 w-4 text-accent" /> Ghid de utilizare pe module
        </h3>
        <div className="space-y-2">
          {GUIDES.map((g, i) => (
            <Collapsible key={g.id} icon={g.icon} title={g.title} defaultOpen={i === 0}>
              <div className="space-y-2">
                {g.body.map((p, j) => <p key={j} className="text-pm-xs text-content-secondary leading-relaxed">{p}</p>)}
              </div>
            </Collapsible>
          ))}
        </div>
      </section>

      {}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-content-primary mb-3">
          <HelpCircle className="h-4 w-4 text-accent" /> Întrebări frecvente
        </h3>
        <div className="space-y-2">
          {FAQ.map((f, i) => (
            <Collapsible key={i} icon={HelpCircle} title={f.q}>
              <p className="text-pm-xs text-content-secondary leading-relaxed">{f.a}</p>
            </Collapsible>
          ))}
        </div>
      </section>

      {}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-content-primary mb-3">
          <ScrollText className="h-4 w-4 text-accent" /> Istoric versiuni (Changelog)
        </h3>
        <div className="space-y-4 rounded-lg border border-line bg-surface-secondary p-4">
          {shown.map((rel, i) => <ReleaseBlock key={`${rel.version}-${i}`} rel={rel} />)}
          {releases.length > 5 && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="text-pm-xs font-semibold text-accent hover:underline"
            >
              {showAll ? 'Arată mai puține' : `Arată toate (${releases.length} versiuni)`}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
