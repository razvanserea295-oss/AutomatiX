




import { useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Plus, Search, Package, Users, DollarSign, FolderKanban, Bell, Sun, Moon, Inbox,
  ArrowLeft, ArrowUpRight, Building2, Calendar,
} from '@/icons';
import Button from '../ui/Button';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Page from '../ui/Page';
import KpiCard from '../ui/KpiCard';
import StatusBadge from '../ui/StatusBadge';
import StatusDot from '../ui/StatusDot';
import Tabs from '../ui/Tabs';
import Avatar from '../ui/Avatar';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import AppBackground from '@/components/ui/AppBackground';
import { startMorphTransition, vtName } from '../lib/viewTransition';
import type { StatusTone } from '@/lib/statusTokens';

const TONES: { tone: StatusTone; label: string }[] = [
  { tone: 'success', label: 'Finalizat' },
  { tone: 'warning', label: 'În așteptare' },
  { tone: 'danger', label: 'Întârziat' },
  { tone: 'info', label: 'Nou' },
  { tone: 'progress', label: 'În producție' },
  { tone: 'special', label: 'Prioritar' },
  { tone: 'accent', label: 'Activ' },
  { tone: 'neutral', label: 'Ciornă' },
];

const ROWS = [
  { id: 'PRJ-1042', client: 'Hidroconstrucția SA', val: '184.500 €', tone: 'progress' as StatusTone, st: 'În producție' },
  { id: 'PRJ-1041', client: 'Strabag România', val: '92.300 €', tone: 'success' as StatusTone, st: 'Finalizat' },
  { id: 'PRJ-1038', client: 'ACI Cluj', val: '47.900 €', tone: 'warning' as StatusTone, st: 'În așteptare' },
  { id: 'PRJ-1036', client: 'ConfortTrans SRL', val: '12.100 €', tone: 'danger' as StatusTone, st: 'Întârziat' },
];

const PROJECTS: { id: string; name: string; client: string; val: string; tone: StatusTone; st: string; desc: string; pieces: number; due: string }[] = [
  { id: 'p1', name: 'Pod Olt — grinzi', client: 'Hidroconstrucția SA', val: '184.500 €', tone: 'progress', st: 'În producție', desc: '24 de grinzi precomprimate, livrare etapizată pe 3 tronsoane. Recepție parțială efectuată la tronsonul 1.', pieces: 24, due: '18 iul' },
  { id: 'p2', name: 'Hală Strabag', client: 'Strabag România', val: '92.300 €', tone: 'success', st: 'Finalizat', desc: 'Structură metalică 1.200 mp, montaj finalizat și recepționat fără observații.', pieces: 86, due: '02 iun' },
  { id: 'p3', name: 'Siloz ACI', client: 'ACI Cluj', val: '47.900 €', tone: 'warning', st: 'În așteptare', desc: 'Confecție metalică siloz 60 t, în așteptarea avansului contractual.', pieces: 12, due: '30 iul' },
  { id: 'p4', name: 'Depozit ConfortTrans', client: 'ConfortTrans SRL', val: '12.100 €', tone: 'danger', st: 'Întârziat', desc: 'Hală de depozitare, întârziere la livrarea profilelor laminate.', pieces: 8, due: '10 iun' },
];






function MorphDemo() {
  const [sel, setSel] = useState<(typeof PROJECTS)[number] | null>(null);
  const open = (p: (typeof PROJECTS)[number]) => startMorphTransition(() => flushSync(() => setSel(p)), { dir: 'forward' });
  const back = () => startMorphTransition(() => flushSync(() => setSel(null)), { dir: 'back' });

  if (sel) {
    return (
      <div className="anim-fade-in">
        <button onClick={back} className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-pm-sm font-medium text-content-secondary hover:bg-surface-tertiary hover:text-content-primary">
          <ArrowLeft className="h-4 w-4" /> Înapoi la listă
        </button>
        <Card vtName={vtName('proj', sel.id)} padding="lg" tone="elevated">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <StatusBadge tone={sel.tone} label={sel.st} dot />
              <h3 className="mt-3 text-display font-semibold text-content-primary">{sel.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-pm-md text-content-secondary"><Building2 className="h-4 w-4" /> {sel.client}</p>
            </div>
            <span className="shrink-0 text-pm-2xl font-semibold tabular-nums text-content-primary">{sel.val}</span>
          </div>
          <p className="mt-5 max-w-2xl text-pm-base leading-relaxed text-content-secondary">{sel.desc}</p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-surface-secondary p-4"><p className="text-pm-2xs uppercase tracking-wide text-content-muted">Piese</p><p className="mt-1 text-pm-xl font-semibold tabular-nums text-content-primary">{sel.pieces}</p></div>
            <div className="rounded-xl border border-line bg-surface-secondary p-4"><p className="text-pm-2xs uppercase tracking-wide text-content-muted">Termen</p><p className="mt-1 flex items-center gap-1.5 text-pm-xl font-semibold text-content-primary"><Calendar className="h-4 w-4 text-content-muted" />{sel.due}</p></div>
            <div className="rounded-xl border border-line bg-surface-secondary p-4"><p className="text-pm-2xs uppercase tracking-wide text-content-muted">Valoare</p><p className="mt-1 text-pm-xl font-semibold tabular-nums text-content-primary">{sel.val}</p></div>
            <div className="rounded-xl border border-line bg-surface-secondary p-4"><p className="text-pm-2xs uppercase tracking-wide text-content-muted">Status</p><p className="mt-1 text-pm-md font-semibold text-content-primary">{sel.st}</p></div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="primary" size="md">Deschide proiect <ArrowUpRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="md">Editează</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PROJECTS.map((p) => (
        <Card key={p.id} vtName={vtName('proj', p.id)} interactive padding="lg" onClick={() => open(p)} className="text-left">
          <StatusBadge tone={p.tone} label={p.st} dot />
          <h4 className="mt-3 text-pm-lg font-semibold leading-tight text-content-primary">{p.name}</h4>
          <p className="mt-1 flex items-center gap-1.5 text-pm-sm text-content-muted"><Building2 className="h-3.5 w-3.5" /> {p.client}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-pm-lg font-semibold tabular-nums text-content-primary">{p.val}</span>
            <ArrowUpRight className="h-4 w-4 text-content-muted" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function KitchenSink() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState('pipeline');
  const [seg, setSeg] = useState('lista');
  const [modal, setModal] = useState(false);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <div className="relative isolate min-h-screen">
      <AppBackground />
      {}
      <header className="surface-frost sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line/60 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-[var(--color-on-accent)] font-bold">A</div>
        <span className="text-pm-md font-semibold text-content-primary">Automatix</span>
        <span className="pill pill-accent ml-1">Ultra-modern · monochrome</span>
        <div className="ml-auto flex items-center gap-2">
          <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-content-secondary hover:bg-surface-tertiary" aria-label="Notificări">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-status-red" />
          </button>
          <Button variant="ghost" size="sm" onClick={toggleTheme}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {dark ? 'Light' : 'Dark'}
          </Button>
          <Avatar name="Răzvan Serea" size="sm" status="online" />
        </div>
      </header>

      <Page>
        <Page.Body maxWidth="wide" padding="comfortable">
          {}
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-pm-eyebrow text-accent mb-1.5 flex items-center gap-2">
                <span className="inline-block h-px w-3.5 bg-accent/50" /> Privire de ansamblu
              </p>
              <h1 className="text-display font-semibold text-content-primary">Panou de comandă</h1>
              <p className="mt-1 text-pm-md text-content-secondary">Proiecte, producție, financiar — o privire clară.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="md"><Search className="h-4 w-4" /> Caută</Button>
              <Button variant="primary" size="md"><Plus className="h-4 w-4" /> Proiect nou</Button>
            </div>
          </div>

          {}
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-pm-eyebrow text-accent mb-1.5 flex items-center gap-2">
                  <span className="inline-block h-px w-3.5 bg-accent/50" /> Tranziții fluide
                </p>
                <h2 className="text-pm-2xl font-semibold text-content-primary">Cardurile se transformă între pagini</h2>
              </div>
              <span className="hidden text-pm-sm text-content-muted sm:block">Click pe un card →</span>
            </div>
            <MorphDemo />
          </section>

          {}
          <Page.Kpis cols={4}>
            <KpiCard label="Proiecte active" value="38" icon={FolderKanban} iconColor="text-accent" trend="up" trendValue="+4" hint="vs luna trecută" />
            <KpiCard label="Valoare pipeline" value="1.24M €" icon={DollarSign} iconColor="text-status-green" trend="up" trendValue="+12%" hint="ofertat + contractat" />
            <KpiCard label="Piese de comandat" value="217" icon={Package} iconColor="text-status-amber" trend="down" trendValue="-9" hint="sub stoc minim" />
            <KpiCard label="Echipă online" value="14" icon={Users} iconColor="text-status-blue" trend="flat" trendValue="0" hint="din 22 total" />
          </Page.Kpis>

          {}
          <Card padding="none">
            <CardHeader
              title="Proiecte"
              subtitle="Listă completă, sortabilă"
              actions={
                <div className="flex items-center gap-2">
                  <Tabs
                    tabs={[{ id: 'lista', label: 'Listă' }, { id: 'carduri', label: 'Carduri' }]}
                    activeId={seg}
                    onChange={setSeg}
                    variant="segmented"
                  />
                  <Button variant="secondary" size="sm"><Plus className="h-3.5 w-3.5" /> Adaugă</Button>
                </div>
              }
            />
            <div className="px-5 pt-3">
              <Tabs
                tabs={[
                  { id: 'pipeline', label: 'Pipeline', count: 38 },
                  { id: 'contracte', label: 'Contracte', count: 12 },
                  { id: 'arhiva', label: 'Arhivă' },
                ]}
                activeId={tab}
                onChange={setTab}
                variant="underline"
              />
            </div>
            <CardBody padding="none">
              <table className="w-full text-pm-base">
                <thead>
                  <tr className="text-pm-2xs uppercase tracking-wide text-content-muted">
                    <th className="px-5 py-2.5 text-left font-semibold">Proiect</th>
                    <th className="px-5 py-2.5 text-left font-semibold">Client</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Valoare</th>
                    <th className="px-5 py-2.5 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr key={r.id} className="border-t border-line/70 hover:bg-surface-tertiary/60 transition-colors">
                      <td className="px-5 py-3 font-mono text-pm-sm text-content-secondary">{r.id}</td>
                      <td className="px-5 py-3 text-content-primary">{r.client}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-content-primary">{r.val}</td>
                      <td className="px-5 py-3"><StatusBadge tone={r.tone} label={r.st} dot /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          {}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card padding="lg">
              <h3 className="text-pm-md font-semibold text-content-primary">Butoane</h3>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Button variant="primary"><Plus className="h-4 w-4" /> Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="success">Success</Button>
                <Button variant="danger">Danger</Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <Button size="sm" variant="primary">Small</Button>
                <Button size="md" variant="primary">Medium</Button>
                <Button size="lg" variant="primary">Large</Button>
                <Button variant="primary" onClick={() => setModal(true)}>Deschide panou →</Button>
              </div>
            </Card>

            <Card padding="lg">
              <h3 className="text-pm-md font-semibold text-content-primary">Status &amp; formular</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {TONES.map((t) => <StatusBadge key={t.tone} tone={t.tone} label={t.label} dot />)}
              </div>
              {
}
              <div className="mt-5 overflow-hidden rounded-xl border border-line/70 bg-surface-secondary/60 transition-all duration-200 focus-within:border-accent/50 focus-within:shadow-[0_0_0_4px_var(--color-accent-muted)]">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-content-muted/70" />
                  <input placeholder="Caută proiecte…" className="h-12 w-full bg-transparent pl-10 pr-3 text-pm-md text-content-primary placeholder:text-content-muted/55 focus:outline-none" />
                </div>
                <div aria-hidden className="mx-3.5 h-px bg-line/60" />
                <div className="relative flex items-center">
                  <Building2 className="pointer-events-none absolute left-3.5 h-4 w-4 text-content-muted/70" />
                  <input placeholder="Client…" className="h-12 w-full bg-transparent pl-10 pr-3 text-pm-md text-content-primary placeholder:text-content-muted/55 focus:outline-none" />
                </div>
              </div>
              {}
              <label className="mt-4 flex cursor-pointer select-none items-center justify-between">
                <span className="text-pm-sm text-content-secondary">Doar proiecte active</span>
                <span className="relative inline-flex">
                  <input type="checkbox" defaultChecked role="switch" className="peer h-[26px] w-[44px] cursor-pointer appearance-none rounded-full bg-surface-tertiary transition-colors duration-200 checked:bg-accent focus:outline-none focus-visible:shadow-[0_0_0_4px_var(--color-accent-muted)]" />
                  <span aria-hidden className="pointer-events-none absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] peer-checked:translate-x-[18px]" />
                </span>
              </label>
              <div className="mt-4 flex items-center gap-4">
                <StatusDot tone="success" label="Server conectat" />
                <StatusDot tone="warning" pulse label="Sincronizare" />
                <div className="flex -space-x-2">
                  <Avatar name="Ana Pop" size="sm" />
                  <Avatar name="Mihai Ion" size="sm" tone="accent" />
                  <Avatar name="Elena V" size="sm" tone="green" />
                </div>
              </div>
            </Card>
          </div>

          {}
          <Card padding="none">
            <EmptyState icon={Inbox} title="Nimic de afișat" description="Adaugă primul element ca să începi." action={<Button variant="primary" size="sm"><Plus className="h-3.5 w-3.5" /> Adaugă</Button>} />
          </Card>
        </Page.Body>
      </Page>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Panou detaliu (split-view)" size="md">
        <div className="space-y-4">
          <p className="text-pm-base text-content-secondary">Modalul andochează în dreapta, lăsând restul interactiv.</p>
          <Card padding="md" tone="subtle">
            <p className="text-pm-sm text-content-muted">Conținut exemplu</p>
            <p className="mt-1 text-pm-lg font-semibold text-content-primary">184.500 €</p>
          </Card>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setModal(false)}>Anulează</Button>
            <Button variant="primary" size="sm" onClick={() => setModal(false)}>Salvează</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
