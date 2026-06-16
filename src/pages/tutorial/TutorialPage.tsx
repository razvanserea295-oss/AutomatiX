import { useState, useMemo } from 'react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import PageHeader from '@/components/ui/PageHeader';
import { filterSearchInputCls, filterSearchIconCls, filterClearInlineBtnCls } from '@/components/ui/filterControls';
import {
  GraduationCap, Target, FolderKanban, ScrollText, ClipboardCheck,
  Factory, Package, CircleDollarSign, CheckCircle2,
  ChevronRight, ChevronDown, PlayCircle, Building2, FileText,
  Wrench, Network, BarChart3, MessageCircle, Bot, Bell,
  Settings, Users, Warehouse, ShoppingCart, Calendar, Mail,
  Search, BookOpen, Lightbulb, ArrowRight, X, Activity,
  Hammer, MapPin, ListChecks, Gauge, LayoutDashboard, Inbox,
  GitBranch, Library, Truck, AtSign, Crown, Container,
} from 'lucide-react';





interface TutorialStep {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  details: string[];
  tips?: string[];
  page?: string;
}

interface TutorialSection {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  color: string;
  steps: TutorialStep[];
}

interface PageEntry {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  page: string;
  group: string;
  
  keywords?: string;
}

interface TipEntry {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}

type Tab = 'lifecycle' | 'pages' | 'tips';





const LIFECYCLE_SECTIONS: TutorialSection[] = [
  {
    id: 'sales',
    icon: Target,
    title: '1. Vânzări',
    subtitle: 'Primul contact, ofertare, contract',
    color: 'text-status-blue',
    steps: [
      {
        icon: Target,
        title: 'Adaugă o discuție nouă',
        description: 'Vânzări → Sales Hub → "Discuție nouă". Fiecare lead se transformă într-o pagină dedicată cu poze, note, contact.',
        details: [
          'Completează numele clientului, persoana de contact, telefonul, valoarea estimată.',
          'Setează status: "Fără contact", "Decizie client", "În negocieri".',
          'În pagina discuției poți încărca poze (sit, schiță), note multiple, atașa documente.',
        ],
        tips: ['Updateaza statusul lead-urilor zilnic — alertele "fără update 7+ zile" apar pe Dashboard.'],
        page: 'sales-hub',
      },
      {
        icon: FileText,
        title: 'Generează oferta tehnico-comercială',
        description: 'Vânzări → Oferte. Construiești BOM-ul în prețuri și descarci PDF cu antet firmă.',
        details: [
          'Ofertele rămân atașate de discuția-mamă.',
          'Buton "Descarcă PDF" pe orice ofertă — antet, semnătură, anexă tehnică.',
          'Conversia "Trece în execuție" creează automat proiectul cu valorile din ofertă.',
        ],
        page: 'quotations',
      },
      {
        icon: Building2,
        title: 'Gestionează clienții',
        description: 'Vânzări → Clienți. Date fiscale (CUI, IBAN), persoane de contact, istoric proiecte.',
        details: [
          'Buton "ANAF" verifică CUI-ul în registrul oficial și pre-completează datele.',
          'Validare IBAN automată (modulo 97).',
        ],
        page: 'clients',
      },
    ],
  },
  {
    id: 'project',
    icon: FolderKanban,
    title: '2. Proiecte & Contracte',
    subtitle: 'Demararea proiectului',
    color: 'text-accent',
    steps: [
      {
        icon: FolderKanban,
        title: 'Creează proiectul',
        description: 'Proiecte → "+ Adaugă". Sau folosește "Trece în execuție" din Sales Hub pentru pre-completare automată.',
        details: [
          'Asociază clientul, deadline-ul, valoarea estimată.',
          'Stadiul inițial e "Ofertare" — proiectul intră singur pe Kanban.',
          'Editează prioritate, responsabil, comentarii din pagina proiectului.',
        ],
        page: 'projects',
      },
      {
        icon: ScrollText,
        title: 'Semnează contractul',
        description: 'Contracte → "+ Contract nou". Lifecycle: Ciornă → Activ → Amendat → Închis.',
        details: [
          'Contractul se leagă de proiect și client.',
          'La stadiul "Finalizat" al proiectului, contractul se închide automat.',
        ],
        page: 'contracts',
      },
    ],
  },
  {
    id: 'design',
    icon: ClipboardCheck,
    title: '3. Proiectare',
    subtitle: 'Stadiul 2 — desen tehnic, fișă, arbore piese',
    color: 'text-status-blue',
    steps: [
      {
        icon: ClipboardCheck,
        title: 'Completează fișa proiectantului',
        description: 'Proiectare → Fișa proiectant. Documentație tehnică obligatorie pentru a permite trecerea în producție.',
        details: [
          'Câmpuri tehnice cheie + responsabil proiectant.',
          'Fără fișa finalizată, Kanban-ul refuză mutarea în stadiul "Producție".',
        ],
        page: 'fisa-proiectant',
      },
      {
        icon: Network,
        title: 'Construiește arborele de piese',
        description: 'Proiectare → Arbore piese. Importă din DXF/Excel sau adaugă manual.',
        details: [
          'Drag-and-drop pentru ierarhia ansamblu/subansamblu/piesă.',
          'Fiecare piesă are stadiu propriu (același Kanban ca proiectele).',
          'Bibliotecile de piese reutilizabile între proiecte.',
        ],
        page: 'parts-tree',
      },
    ],
  },
  {
    id: 'production',
    icon: Factory,
    title: '4. Producție',
    subtitle: 'Stadiile 3-7 — execuție în hală',
    color: 'text-status-amber',
    steps: [
      {
        icon: Factory,
        title: 'Urmărește producția pe Kanban',
        description: 'Producție → Kanban. Drag-and-drop proiecte și piese între stadii.',
        details: [
          'Stadii: Debitare → Sudură → Vopsire → Asamblare → QC → Pregătire livrare.',
          'Mutările între roluri creează handoff-uri automate (acceptate/respinse de destinatar).',
          'Statusul proiectului se derivează automat din stadiu.',
        ],
        page: 'production',
      },
      {
        icon: Wrench,
        title: 'Stații de lucru & service',
        description: 'Producție → Stații pentru configurare; Service & Mentenanță pentru intervenții.',
        details: [
          'Stații: configurare hală, locații, asignare piese.',
          'Service: înregistrare intervenții cu poze before/after, costuri manoperă/piese, status.',
        ],
        page: 'stations',
      },
    ],
  },
  {
    id: 'supply',
    icon: Warehouse,
    title: '5. Aprovizionare',
    subtitle: 'Materiale, furnizori, depozit',
    color: 'text-status-green',
    steps: [
      {
        icon: Container,
        title: 'Verifică stocul în Depozit',
        description: 'Aprovizionare → Depozit. Locații, rezervări, stoc curent vs. minim.',
        details: [
          'Tab "Stoc": cantitate per locație, alertă pentru sub-minim.',
          'Tab "Rezervări": piese rezervate per proiect, alarmă > 7 zile fără eliberare.',
        ],
        page: 'warehouse',
      },
      {
        icon: ShoppingCart,
        title: 'Comandă materiale',
        description: 'Aprovizionare → Achiziții. Comenzi către furnizori cu istoric și recepții.',
        details: [
          'Sugestii automate "Comenzi sugerate" pentru materialele sub pragul minim.',
          'Lead time și negociere prețuri vizibile per furnizor.',
        ],
        page: 'purchase-orders',
      },
    ],
  },
  {
    id: 'finance',
    icon: CircleDollarSign,
    title: '6. Financiar & Livrare',
    subtitle: 'Stadiile 8-9 — facturare, livrare, închidere',
    color: 'text-status-green',
    steps: [
      {
        icon: Truck,
        title: 'Livrare & PIF (Stadiul 8)',
        description: 'Mută proiectul în stadiul "Livrare". Facturile ciornă devin automat "Trimise".',
        details: [
          'Avizul de expediție se generează din pagina proiectului.',
          'Punere în funcțiune (PIF) e o sub-etapă — actualizezi data efectivă.',
        ],
        page: 'finance',
      },
      {
        icon: CheckCircle2,
        title: 'Finalizare (Stadiul 9)',
        description: 'Mută în "Finalizat". Contractul se închide automat și raportul de profitabilitate devine final.',
        details: [
          'Costurile (manoperă + materiale + service) se consolidează în P&L per proiect.',
          'Rapoartele își recalculează automat agregatele.',
        ],
      },
      {
        icon: FileText,
        title: 'Documente & arhivă',
        description: 'Documente → repository centralizat per proiect.',
        details: [
          'Upload fișiere (PDF, Word, Excel, imagini) cu categorie.',
          'Versionare implicită prin date de upload.',
        ],
        page: 'documents',
      },
    ],
  },
];





const PAGES_GUIDE: PageEntry[] = [
  
  { icon: LayoutDashboard, title: 'Dashboard',         desc: 'Privire de ansamblu: KPI, navigare rapidă kanban-style, briefing lunar, predări, alerte. Configurabilă per user din Sistem → Utilizatori.', page: 'dashboard',       group: 'Acasă',    keywords: 'kpi profit venit cost productie alerte briefing inbox' },
  { icon: ListChecks,      title: 'Task-uri personale', desc: 'TODO list cu instrucțiuni detaliate, deadline, delegare, notificări de termen. Modal Info pe fiecare task pentru completare cu notă (rezolvat/nerezolvat/clarificări).', page: 'tasks',           group: 'Personal', keywords: 'todo task delegare deadline mentiuni notificari' },
  { icon: Calendar,        title: 'Calendar',          desc: 'Vizualizare lunară/săptămânală/zilnică a deadline-urilor proiectelor, deplasărilor, evenimentelor.', page: 'calendar',        group: 'Personal', keywords: 'evenimente termene' },
  { icon: MapPin,          title: 'Deplasări',         desc: 'Programări deplasări cu costuri pe categorii, alertă 7 zile pentru completarea costurilor.', page: 'deplasari',       group: 'Personal', keywords: 'travel diurnale transport cazare costuri' },

  
  { icon: Target,          title: 'Sales Hub',         desc: 'Pipeline comercial. Click pe o discuție o deschide într-o pagină dedicată cu poze, note multiple, contact, conversie în proiect.', page: 'sales-hub',       group: 'Vânzări',  keywords: 'lead pipeline discutie client oferta' },
  { icon: FileText,        title: 'Oferte',            desc: 'Generare ofertă tehnico-comercială cu BOM, descărcare PDF, atașare la discuții.', page: 'quotations',      group: 'Vânzări',  keywords: 'oferta pdf bom' },
  { icon: Building2,       title: 'Clienți',           desc: 'Bază de date clienți: CUI (validat ANAF), IBAN, contact, istoric proiecte.', page: 'clients',         group: 'Vânzări',  keywords: 'firme persoane contact cui iban' },

  
  { icon: FolderKanban,    title: 'Proiecte',          desc: 'Lista și detalii proiecte. Editare stadiu, responsabil, deadline, prioritate, blocare.', page: 'projects',        group: 'Proiecte', keywords: 'proiect stadiu kanban responsabil' },
  { icon: ScrollText,      title: 'Contracte',         desc: 'Lifecycle contract: Ciornă → Activ → Amendat → Închis. Legat de proiect.', page: 'contracts',       group: 'Proiecte', keywords: 'contract semnatura status' },

  
  { icon: ClipboardCheck,  title: 'Fișa proiectant',   desc: 'Documentație tehnică obligatorie înainte de intrarea în producție.', page: 'fisa-proiectant', group: 'Proiectare', keywords: 'design specificatii desen' },
  { icon: Network,         title: 'Arbore piese',      desc: 'Structură ierarhică ansamblu/subansamblu/piesă cu stadii proprii. Import DXF/Excel.', page: 'parts-tree',      group: 'Proiectare', keywords: 'piese ansamblu dxf' },
  { icon: Library,         title: 'Biblioteci piese',  desc: 'Catalog reutilizabil de piese standard pentru import rapid în proiecte.', page: 'libraries',       group: 'Proiectare', keywords: 'biblioteca piese reutilizabile' },

  
  { icon: Factory,         title: 'Producție (Kanban)', desc: 'Board vizual cu stadii. Drag-and-drop proiecte/piese. Handoff-uri automate între roluri.', page: 'production',     group: 'Producție', keywords: 'kanban stadii hala' },
  { icon: Wrench,          title: 'Stații',            desc: 'Configurare stații hală: locație, capacitate, asignare piese.', page: 'stations',        group: 'Producție', keywords: 'masini hala echipament' },
  { icon: Hammer,          title: 'Service & Mentenanță', desc: 'Înregistrare intervenții pe piese cu foto before/after, costuri manoperă/piese, status.', page: 'maintenance',     group: 'Producție', keywords: 'service intervenții reparatii' },

  
  { icon: Container,       title: 'Depozit',           desc: 'Inventar fizic: locații, rezervări, mișcări. Alertă rezervări vechi > 7 zile.', page: 'warehouse',       group: 'Aprovizionare', keywords: 'stoc locatii rezervari' },
  { icon: Package,         title: 'Inventar materiale', desc: 'Catalog materiale cu specs, preț, furnizor preferat, stoc curent. Comenzi sugerate sub minim.', page: 'materials',       group: 'Aprovizionare', keywords: 'materiale catalog stoc minim' },
  { icon: Warehouse,       title: 'Furnizori',         desc: 'Bază date furnizori: lead time, prețuri, performanță negociere.', page: 'suppliers',       group: 'Aprovizionare', keywords: 'furnizor vendor lead time' },
  { icon: ShoppingCart,    title: 'Achiziții',         desc: 'Purchase orders către furnizori + urmărire livrare + recepții.', page: 'purchase-orders', group: 'Aprovizionare', keywords: 'comenzi po purchase' },

  
  { icon: CircleDollarSign, title: 'Financiar',        desc: 'Facturi emise/primite, plăți, cashflow, override-uri pe costuri proiect.', page: 'finance',         group: 'Financiar', keywords: 'facturi plati cashflow profit' },
  { icon: FileText,        title: 'Documente',         desc: 'Repository centralizat de documente per proiect cu categorii și upload.', page: 'documents',       group: 'Financiar', keywords: 'pdf word excel arhiva' },
  { icon: BarChart3,       title: 'Rapoarte',          desc: 'Profitabilitate, productivitate, stoc, financiar — agregate pe proiect/lună/an.', page: 'reports',         group: 'Financiar', keywords: 'export raport profitabilitate' },

  
  { icon: GraduationCap,   title: 'Tutorial',          desc: 'Acest ghid: parcurs proiect, listă pagini, sfaturi.', page: 'tutorial',        group: 'Instrumente', keywords: 'help ajutor ghid' },
  { icon: Mail,            title: 'Email',             desc: 'Client IMAP/SMTP integrat. Setări persistente per user (Setări → Email).', page: 'email',           group: 'Instrumente', keywords: 'email imap smtp inbox' },
  { icon: MessageCircle,   title: 'Mesaje (Chat)',     desc: 'Chat intern cu grupuri. Detalii grup (poză, membri, admini) la click pe avatar.', page: 'chat',            group: 'Instrumente', keywords: 'chat mesagerie' },
  { icon: Bot,             title: 'AI Assistant',      desc: 'Chat AI cu acces la date — întrebări despre proiecte, generări de rapoarte, query DB.', page: 'ai',              group: 'Instrumente', keywords: 'ai asistent llm chatbot' },
  { icon: Bell,            title: 'Alerte',            desc: 'Notificări sistem: handoff-uri, deadlines, stoc redus. Cooldown 7 zile pe alerte confirmate.', page: 'alerts',          group: 'Instrumente', keywords: 'notificari alerta acknowledged' },

  
  { icon: Gauge,           title: 'Birou control',     desc: 'Dashboard manager: predări blocate >24h, anomalii AI, forțare tranziții. Vizibil doar admin/manager.', page: 'manager-control', group: 'Sistem',     keywords: 'manager anomalii predari sla' },
  { icon: Users,           title: 'Utilizatori',       desc: 'Gestionare conturi: roluri, permisiuni override, configurare dashboard per user.', page: 'users',           group: 'Sistem',     keywords: 'cont rol permisiuni admin' },
  { icon: Activity,        title: 'Sesiuni',           desc: 'Monitorizare live useri conectați (refresh 5s), istoric login/logout per user, force logout.', page: 'sessions',        group: 'Sistem',     keywords: 'live online conectat ip' },
  { icon: Settings,        title: 'Setări',            desc: 'Aspect (light/dark), notificări, contul meu, email IMAP, date fiscale firmă, server, AI.', page: 'settings',        group: 'Sistem',     keywords: 'preferinte tema' },
];





const TIPS: TipEntry[] = [
  { icon: Search,            title: 'Căutare globală',         body: 'Apasă Ctrl+K (sau Cmd+K) în orice pagină pentru a căuta proiecte, clienți, materiale, piese, documente instant.' },
  { icon: Factory,           title: 'Stadii și statusuri',     body: 'Statusul proiectului se derivă automat din stadiu. Mută proiectul pe Kanban și statusul se actualizează singur.' },
  { icon: ClipboardCheck,    title: 'Porți obligatorii',       body: 'Un proiect nu poate trece din "Proiectare" (stadiul 2) în producție (stadiul 3+) fără fișa proiectantului finalizată.' },
  { icon: Wrench,            title: 'Handoff-uri',             body: 'Când un proiect se mută între roluri (ex: Proiectare → Hală), se creează automat un handoff. Destinatarul trebuie să-l accepte din Inbox.' },
  { icon: Inbox,             title: 'Inbox-ul Dashboard',       body: 'Predările care îți sunt destinate apar în panoul "Inbox" pe Dashboard. Polling automat la 5 secunde — fără refresh manual.' },
  { icon: CircleDollarSign,  title: 'Cascade automate',        body: 'La stadiul 8 (Livrare), facturile ciornă devin "Trimise". La stadiul 9 (Finalizat), contractul se închide automat.' },
  { icon: BookOpen,          title: 'Blocarea proiectului',    body: 'Apasă "Blochează" pe detaliul proiectului dacă apare o problemă. Proiectul rămâne pe stadiul curent cu badge roșu "Blocat".' },
  { icon: Lightbulb,         title: 'Densitate UI',            body: 'Din meniul utilizatorului poți comuta între densitate "Confortabilă" și "Compactă" pentru mai multe rânduri pe ecran.' },
  { icon: Target,            title: 'Conversie lead → proiect', body: 'În Sales Hub, pagina discuției are buton "Trece în execuție". Sistemul creează proiectul + contractul automat.' },
  { icon: Package,           title: 'Stoc redus',              body: 'Materialele sub pragul minim apar în Alerte și în "Comenzi sugerate" pe pagina Inventar.' },
  { icon: Calendar,          title: 'Scurtături tastatură',    body: 'Apasă "?" în orice pagină pentru lista completă: Ctrl+Shift+D (Dashboard), Ctrl+Shift+P (Proiecte), Ctrl+K (search).' },
  { icon: AtSign,            title: 'Mențiuni & task-uri',     body: 'Tag-uri de tip @username în comentarii / chat-uri creează mențiuni. Apar în tab-ul Mențiuni din Task-urile mele.' },
  { icon: Crown,             title: 'Birou control manager',   body: 'Pagina Birou control (admin/manager) arată predările blocate >24h și anomalii detectate de AI. "Forțare tranziție" pentru cazuri excepționale.' },
  { icon: GitBranch,         title: 'Anomalii AI',             body: 'Rulează "Detecție anomalii" în Birou control pentru a evidenția deadline-uri în conflict, marje mici, predări vechi.' },
  { icon: Gauge,             title: 'Personalizare dashboard', body: 'Admin → Sistem → Utilizatori → "Configurare dashboard" pentru a bifa ce widget-uri vede fiecare user pe Dashboard.' },
];





interface SearchHit {
  kind: 'page' | 'lifecycle' | 'tip';
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
  page?: string;
  meta?: string;
}

function buildSearchIndex(query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  const matches = (...txt: (string | undefined)[]) =>
    txt.filter(Boolean).some(t => t!.toLowerCase().includes(q));

  
  for (const p of PAGES_GUIDE) {
    if (matches(p.title, p.desc, p.keywords, p.group)) {
      hits.push({ kind: 'page', title: p.title, body: p.desc, icon: p.icon, page: p.page, meta: p.group });
    }
  }
  
  for (const s of LIFECYCLE_SECTIONS) {
    for (const step of s.steps) {
      const detailsTxt = step.details.join(' ') + ' ' + (step.tips || []).join(' ');
      if (matches(step.title, step.description, detailsTxt, s.title)) {
        hits.push({ kind: 'lifecycle', title: step.title, body: step.description, icon: step.icon, page: step.page, meta: s.title });
      }
    }
  }
  
  for (const t of TIPS) {
    if (matches(t.title, t.body)) {
      hits.push({ kind: 'tip', title: t.title, body: t.body, icon: t.icon, meta: 'Sfat' });
    }
  }
  return hits;
}





function LifecycleTimeline({ sections, onNavigate }: { sections: TutorialSection[]; onNavigate: (page: string) => void }) {
  const [expanded, setExpanded] = useState<string | null>(sections[0]?.id ?? null);

  return (
    <div>
      {sections.map((section, si) => {
        const isOpen = expanded === section.id;
        const Icon = section.icon;

        return (
          <div key={section.id} className="border-b border-line bg-surface-secondary">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : section.id)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-tertiary/40 transition-colors text-left"
            >
              <div className="relative flex flex-col items-center shrink-0">
                <div className={`h-9 w-9 flex items-center justify-center ${isOpen ? 'bg-accent/12 ring-1 ring-accent/30' : 'bg-surface-tertiary'}`}>
                  <Icon className={`h-[18px] w-[18px] ${isOpen ? section.color : 'text-content-muted'}`} />
                </div>
                {si < sections.length - 1 && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-3 bg-line" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-semibold ${isOpen ? 'text-content-primary' : 'text-content-secondary'}`}>
                  {section.title}
                </p>
                <p className="text-pm-xs text-content-muted">{section.subtitle}</p>
              </div>

              {isOpen
                ? <ChevronDown className="h-4 w-4 text-content-muted shrink-0" />
                : <ChevronRight className="h-4 w-4 text-content-muted shrink-0" />
              }
            </button>

            {isOpen && (
              <div className="border-t border-line px-5 py-4 bg-surface-primary">
                {section.steps.map((step, idx) => {
                  const StepIcon = step.icon;
                  return (
                    <div key={idx} className={`flex gap-3 px-0 py-3 ${idx < section.steps.length - 1 ? 'border-b border-line' : ''}`}>
                      <div className="shrink-0 mt-0.5">
                        <div className="h-7 w-7 bg-surface-tertiary flex items-center justify-center">
                          <StepIcon className="h-3.5 w-3.5 text-content-muted" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-content-primary">{step.title}</p>
                        <p className="text-pm-sm text-content-secondary mt-0.5">{step.description}</p>

                        {step.details.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {step.details.map((d, di) => (
                              <li key={di} className="text-pm-sm text-content-secondary flex gap-2">
                                <span className="text-content-muted shrink-0">•</span>
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {step.tips && step.tips.length > 0 && (
                          <div className="mt-2 bg-accent/5 border-l-2 border-accent/30 px-3 py-1.5">
                            {step.tips.map((tip, ti) => (
                              <p key={ti} className="text-pm-xs text-content-secondary">
                                <Lightbulb className="inline h-3 w-3 mr-1 text-accent" />
                                {tip}
                              </p>
                            ))}
                          </div>
                        )}

                        {step.page && (
                          <button
                            type="button"
                            onClick={() => onNavigate(step.page!)}
                            className="mt-2 inline-flex items-center gap-1 text-pm-xs font-medium text-accent hover:underline"
                          >
                            Deschide pagina <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PagesDirectory({ pages, onNavigate }: { pages: PageEntry[]; onNavigate: (page: string) => void }) {
  
  const byGroup = useMemo(() => {
    const map = new Map<string, PageEntry[]>();
    for (const p of pages) {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group)!.push(p);
    }
    return Array.from(map.entries());
  }, [pages]);

  return (
    <div>
      {byGroup.map(([group, items]) => (
        <div key={group}>
          <div className="px-5 py-2 bg-surface-secondary border-b border-line">
            <p className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">{group}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.page}
                  type="button"
                  onClick={() => onNavigate(p.page)}
                  className="flex items-start gap-3 border-b border-r border-line bg-surface-secondary p-4 hover:bg-surface-tertiary/40 hover:border-accent/30 transition-colors text-left group"
                >
                  <div className="h-8 w-8 bg-accent/8 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-content-primary group-hover:text-accent transition-colors">{p.title}</p>
                    <p className="text-pm-xs text-content-muted mt-0.5 line-clamp-2">{p.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function TipsGrid({ tips }: { tips: TipEntry[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2">
      {tips.map((tip, i) => {
        const Icon = tip.icon;
        return (
          <div key={i} className="border-b border-r border-line bg-surface-secondary p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 bg-accent/8 flex items-center justify-center">
                <Icon className="h-3.5 w-3.5 text-accent" />
              </div>
              <p className="text-[13px] font-semibold text-content-primary">{tip.title}</p>
            </div>
            <p className="text-pm-sm text-content-secondary leading-relaxed">{tip.body}</p>
          </div>
        );
      })}
    </div>
  );
}

function SearchResults({ hits, onNavigate }: { hits: SearchHit[]; onNavigate: (page: string) => void }) {
  if (hits.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <Search className="h-8 w-8 mx-auto text-content-muted opacity-30 mb-2" />
        <p className="text-pm-sm text-content-muted">Niciun rezultat. Încearcă alt cuvânt-cheie.</p>
      </div>
    );
  }
  
  const groups: Record<SearchHit['kind'], SearchHit[]> = { page: [], lifecycle: [], tip: [] };
  for (const h of hits) groups[h.kind].push(h);
  const KIND_LABEL: Record<SearchHit['kind'], string> = { page: 'Pagini', lifecycle: 'Parcurs proiect', tip: 'Sfaturi' };
  const KIND_ICON: Record<SearchHit['kind'], React.ComponentType<{ className?: string }>> = {
    page: BookOpen, lifecycle: PlayCircle, tip: Lightbulb,
  };

  return (
    <div>
      <div className="px-5 py-2 bg-surface-secondary border-b border-line">
        <p className="text-pm-xs text-content-muted">{hits.length} {hits.length === 1 ? 'rezultat' : 'rezultate'}</p>
      </div>
      {(['page', 'lifecycle', 'tip'] as const).map(kind => {
        const arr = groups[kind];
        if (arr.length === 0) return null;
        const KindIcon = KIND_ICON[kind];
        return (
          <div key={kind}>
            <div className="px-5 py-2 bg-surface-tertiary/30 border-b border-line/40 flex items-center gap-2">
              <KindIcon className="h-3.5 w-3.5 text-content-muted" />
              <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">{KIND_LABEL[kind]}</p>
              <span className="text-pm-2xs text-content-muted">· {arr.length}</span>
            </div>
            {arr.map((h, i) => {
              const Icon = h.icon;
              const clickable = !!h.page;
              const inner = (
                <div className="flex items-start gap-3 px-5 py-3 border-b border-line/40 hover:bg-surface-tertiary/30 transition-colors">
                  <div className="h-8 w-8 bg-accent/8 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-content-primary">{h.title}</p>
                      {h.meta && <span className="text-pm-2xs text-content-muted">· {h.meta}</span>}
                    </div>
                    <p className="text-pm-xs text-content-muted mt-0.5 line-clamp-2">{h.body}</p>
                  </div>
                  {clickable && <ArrowRight className="h-3.5 w-3.5 text-content-muted shrink-0 self-center" />}
                </div>
              );
              return clickable ? (
                <button key={i} type="button" onClick={() => onNavigate(h.page!)} className="w-full text-left">
                  {inner}
                </button>
              ) : (
                <div key={i}>{inner}</div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}





interface TutorialPageProps {
  user: User;
  onNavigate?: (pageId: string) => void;
}

export default function TutorialPage({ user, onNavigate }: TutorialPageProps) {
  const [tab, setTab] = useState<Tab>('lifecycle');
  const [search, setSearch] = useState('');

  const handleNavigate = (page: string) => {
    if (onNavigate) onNavigate(page);
    else window.location.hash = `#/${page}`;
  };

  const tabs = [
    { id: 'lifecycle' as Tab, label: 'Parcurs proiect' },
    { id: 'pages' as Tab, label: 'Toate paginile' },
    { id: 'tips' as Tab, label: 'Sfaturi' },
  ];

  const searching = search.trim().length > 0;
  const hits = useMemo(() => buildSearchIndex(search), [search]);

  return (
    <Page>
      <PageHeader
        title="Tutorial Automatix"
        icon={<GraduationCap className="h-4 w-4" />}
        subtitle="Ghid complet: pagini, parcurs proiect, sfaturi"
        tabs={searching ? undefined : tabs}
        activeTab={tab}
        onTabChange={(t) => setTab(t as Tab)}
      />

      <Page.Body maxWidth="full" padding="flush">
        {
}
        <div className="border-b border-line bg-surface-secondary px-5 py-3 sticky top-0 z-10">
          <div className="relative group max-w-md">
            <Search className={filterSearchIconCls} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută în tutorial — pagini, pași, sfaturi..."
              className={`${filterSearchInputCls} !w-full max-w-md`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                title="Șterge"
                className={filterClearInlineBtnCls}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {searching ? (
          <SearchResults hits={hits} onNavigate={handleNavigate} />
        ) : (
          <>
            {}
            <div className="border-b border-line bg-accent/5 px-5 py-4 flex items-start gap-3">
              <PlayCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-semibold text-content-primary">
                  Bine ai venit, {user.full_name || user.username}!
                </p>
                <p className="text-pm-sm text-content-secondary mt-1">
                  Automatix gestionează întregul ciclu de viață al unui proiect industrial: de la primul contact comercial,
                  prin proiectare și producție, până la livrare și facturare. Folosește bara de căutare de mai sus
                  pentru a găsi rapid o pagină sau un sfat.
                </p>
              </div>
            </div>

            {tab === 'lifecycle' && (
              <LifecycleTimeline sections={LIFECYCLE_SECTIONS} onNavigate={handleNavigate} />
            )}

            {tab === 'pages' && (
              <PagesDirectory pages={PAGES_GUIDE} onNavigate={handleNavigate} />
            )}

            {tab === 'tips' && (
              <TipsGrid tips={TIPS} />
            )}
          </>
        )}
      </Page.Body>
    </Page>
  );
}
