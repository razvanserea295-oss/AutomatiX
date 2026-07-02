import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Search } from '@/icons';
import { Page, PageHeader, PageBody, PageToolbar, PageKpis } from '@/v2/components/app/Page';
import { KPICard } from '@/v2/analytics';
import { Input } from '@/v2/components/ui/input';
import { Card } from '@/v2/components/ui/card';
import { Button } from '@/v2/components/ui/button';

const SECTIONS = [
  {
    id: 'start',
    title: 'Primii pași',
    steps: [
      { title: 'Autentificare', desc: 'Conectează-te cu contul primit de administrator.', path: '/v2' },
      { title: 'Dashboard', desc: 'Vizualizează KPI-uri și alerte active.', path: '/v2/dashboard' },
      { title: 'Setări firmă', desc: 'Configurează datele companiei și modul interfață.', path: '/v2/settings' },
    ],
  },
  {
    id: 'sales',
    title: 'Vânzări',
    steps: [
      { title: 'Pipeline', desc: 'Gestionează lead-uri pe etape.', path: '/v2/sales-hub' },
      { title: 'Oferte', desc: 'Creează, trimite și convertește oferte.', path: '/v2/quotations' },
      { title: 'Clienți', desc: 'Baza de clienți și contacte.', path: '/v2/clients' },
    ],
  },
  {
    id: 'production',
    title: 'Producție',
    steps: [
      { title: 'Proiecte', desc: 'Lista proiectelor active.', path: '/v2/projects' },
      { title: 'Kanban producție', desc: 'Urmărește etapele în fabrică.', path: '/v2/production' },
      { title: 'Arbore piese', desc: 'BOM și structură tehnică.', path: '/v2/parts-tree' },
    ],
  },
  {
    id: 'ops',
    title: 'Operațional',
    steps: [
      { title: 'Depozit', desc: 'Stoc, mișcări și rezervări.', path: '/v2/warehouse' },
      { title: 'Comunicare', desc: 'Chat, email și alerte.', path: '/v2/chat' },
      { title: 'Suport remote', desc: 'Asistență RustDesk pentru clienți.', path: '/v2/remote-support' },
    ],
  },
] as const;

export default function TutorialPage() {
  const [search, setSearch] = useState('');
  const [sectionId, setSectionId] = useState<string>('start');

  const totalSteps = SECTIONS.reduce((n, s) => n + s.steps.length, 0);
  const active = SECTIONS.find((s) => s.id === sectionId) ?? SECTIONS[0];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return SECTIONS.flatMap((s) =>
      s.steps
        .filter((st) => [st.title, st.desc, s.title].some((t) => t.toLowerCase().includes(q)))
        .map((st) => ({ ...st, section: s.title })),
    );
  }, [search]);

  const navigate = (path: string) => {
    window.location.hash = path;
  };

  return (
    <Page fill>
      <PageHeader
        title="Tutorial"
        description="Ghid rapid pentru modulele Automatix V2"
        actions={<BookOpen className="h-5 w-5 text-muted-foreground" />}
      />
      <PageBody>
        <PageKpis className="max-w-2xl">
          <KPICard label="Secțiuni" value={SECTIONS.length} />
          <KPICard label="Pași ghidați" value={totalSteps} />
          <KPICard label="Mod" value={2} hint="V2" />
        </PageKpis>
        <PageToolbar>
          <div className="relative flex-1" style={{ maxWidth: 'var(--density-search-w)' }}>
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" style={{ height: 'var(--density-search-h)' }} placeholder="Caută în ghid…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </PageToolbar>

      {filtered ? (
        <Card className="v2-panel shadow-none">
          <div className="divide-y">
            {filtered.length === 0 ? (
              <p className="density-meta p-[var(--density-card-p)] text-muted-foreground">Niciun rezultat.</p>
            ) : (
              filtered.map((st, i) => (
                <button key={i} type="button" className="density-list-item flex w-full items-center justify-between text-left hover:bg-muted/50" onClick={() => navigate(st.path)}>
                  <div>
                    <p className="font-medium">{st.title}</p>
                    <p className="density-meta text-muted-foreground">{st.section} · {st.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </Card>
      ) : (
        <div className="grid min-h-0 flex-1 gap-[var(--density-gap-section)] lg:grid-cols-[240px_1fr]">
          <Card className="shadow-none h-fit">
            <div className="space-y-0.5 p-[var(--density-card-p)]">
              {SECTIONS.map((s) => (
                <Button
                  key={s.id}
                  variant={sectionId === s.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSectionId(s.id)}
                >
                  {s.title}
                </Button>
              ))}
            </div>
          </Card>
          <Card className="v2-panel shadow-none">
            <div className="divide-y">
              {active.steps.map((st) => (
                <button key={st.path} type="button" className="density-list-item flex w-full items-center justify-between text-left hover:bg-muted/50" onClick={() => navigate(st.path)}>
                  <div>
                    <p className="font-medium">{st.title}</p>
                    <p className="density-meta text-muted-foreground">{st.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
      </PageBody>
    </Page>
  );
}
