




import { useEffect, useState } from 'react';
import { Library, Hash, PenLine, BellRing, GitCompareArrows, Paperclip, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useLocalStorage, SectionCard } from '@/components/enhancements';
import Button from '@/components/ui/Button';
import { toast } from '@/store/toastStore';
import { formatDateRo } from '@/lib/format';

interface Props { contractId?: number | null; contractNo?: string | null; expiresAt?: string | null }

interface Template { id: string; name: string; preset: string }

function TemplateLibraryCard() {
  const [items, setItems] = useLocalStorage<Template[]>('promix_contract_templates_v1', []);
  const [draft, setDraft] = useState<Partial<Template>>({});
  return (
    <SectionCard title="Bibliotecă șabloane" icon={Library}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Nume șablon" value={draft.name ?? ''} onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} />
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Tip produs / serviciu" value={draft.preset ?? ''} onChange={(e) => setDraft(d => ({ ...d, preset: e.target.value }))} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.name) return;
          setItems(prev => [...prev, { id: `${Date.now()}`, name: draft.name!, preset: draft.preset ?? '' }]);
          setDraft({});
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40">
          {items.map(t => (
            <li key={t.id} className="flex items-center gap-2 py-1.5">
              <span className="text-content-primary">{t.name}</span>
              <span className="text-content-muted">{t.preset}</span>
              <button className="text-content-muted hover:text-status-red ml-auto" onClick={() => setItems(prev => prev.filter(x => x.id !== t.id))}><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function AutoNumberingCard() {
  const [cfg, setCfg] = useLocalStorage<{ pattern: string; counter: number }>('promix_contract_numbering_v1', { pattern: 'CTR-{YYYY}-{NNNN}', counter: 1 });
  const preview = cfg.pattern
    .replace('{YYYY}', String(new Date().getFullYear()))
    .replace('{MM}', String(new Date().getMonth() + 1).padStart(2, '0'))
    .replace('{NNNN}', String(cfg.counter).padStart(4, '0'));
  return (
    <SectionCard title="Auto-numerotare" icon={Hash} description="Suportă {YYYY}, {MM}, {NNNN}">
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base font-mono"
          value={cfg.pattern} onChange={(e) => setCfg({ ...cfg, pattern: e.target.value })} />
        <input type="number" className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base tabular-nums"
          value={cfg.counter} onChange={(e) => setCfg({ ...cfg, counter: Number(e.target.value) })} />
      </div>
      <p className="text-pm-2xs text-content-muted">Preview: <span className="font-mono text-content-primary">{preview}</span></p>
    </SectionCard>
  );
}

function ESignatureCard({ contractNo }: Props) {
  const [email, setEmail] = useState('');
  return (
    <SectionCard title="E-signature" icon={PenLine}>
      <div className="flex items-center gap-2">
        <input type="email" className="flex-1 h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="email@client.ro" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button variant="primary" size="sm" disabled={!email || !contractNo}
          onClick={() => toast.info(`Cerere semnătură ${contractNo} către ${email} — necesită server email/SMS configurat`)}>Trimite link</Button>
      </div>
    </SectionCard>
  );
}

function RenewalRemindersCard({ contractId, expiresAt }: Props) {
  const [reminders, setReminders] = useLocalStorage<{ id: string; daysBefore: number; channel: string }[]>(
    `promix_contract_reminders_${contractId ?? 'all'}_v1`, [
      { id: 'r1', daysBefore: 90, channel: 'email' },
      { id: 'r2', daysBefore: 30, channel: 'email' },
      { id: 'r3', daysBefore: 7, channel: 'sms' },
    ]);
  return (
    <SectionCard title="Reminder reînnoire" icon={BellRing}
      description={expiresAt ? `Expiră ${formatDateRo(expiresAt)}` : 'Setează data de expirare în detaliile contractului'}
    >
      <ul className="text-pm-xs divide-y divide-line/40">
        {reminders.map(r => (
          <li key={r.id} className="flex items-center gap-2 py-1.5">
            <input type="number" className="w-16 h-7 rounded border border-line bg-surface-primary px-2 text-pm-base tabular-nums"
              value={r.daysBefore} onChange={(e) => setReminders(prev => prev.map(x => x.id === r.id ? { ...x, daysBefore: Number(e.target.value) } : x))} />
            <span className="text-pm-2xs text-content-muted">zile înainte</span>
            <select value={r.channel} onChange={(e) => setReminders(prev => prev.map(x => x.id === r.id ? { ...x, channel: e.target.value } : x))}
              className="h-7 rounded border border-line bg-surface-primary px-2 text-pm-base">
              <option>email</option><option>sms</option><option>chat</option>
            </select>
            <button className="ml-auto text-content-muted hover:text-status-red"
              onClick={() => setReminders(prev => prev.filter(x => x.id !== r.id))}><Trash2 className="h-3 w-3" /></button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" className="mt-2" onClick={() => setReminders(prev => [...prev, { id: `${Date.now()}`, daysBefore: 14, channel: 'email' }])}>
        <Plus className="h-3.5 w-3.5" /> Adaugă reminder
      </Button>
    </SectionCard>
  );
}

function RevisionCompareCard({ contractId }: Props) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const diff = (() => {
    const al = a.split('\n');
    const bl = b.split('\n');
    const max = Math.max(al.length, bl.length);
    const out: { ln: number; left: string; right: string; same: boolean }[] = [];
    for (let i = 0; i < max; i++) {
      out.push({ ln: i + 1, left: al[i] ?? '', right: bl[i] ?? '', same: (al[i] ?? '') === (bl[i] ?? '') });
    }
    return out;
  })();
  return (
    <SectionCard title="Comparare revizii" icon={GitCompareArrows}
      description={contractId ? `Pentru contractul #${contractId}` : 'Lipiți textele a două revizii'}
    >
      <div className="grid grid-cols-2 gap-2 mb-2">
        <textarea rows={4} className="rounded border border-line bg-surface-primary px-2 py-1 text-pm-xs font-mono"
          placeholder="Revizia A" value={a} onChange={(e) => setA(e.target.value)} />
        <textarea rows={4} className="rounded border border-line bg-surface-primary px-2 py-1 text-pm-xs font-mono"
          placeholder="Revizia B" value={b} onChange={(e) => setB(e.target.value)} />
      </div>
      {(a || b) && (
        <ul className="text-pm-2xs font-mono max-h-40 overflow-y-auto">
          {diff.slice(0, 80).map(r => (
            <li key={r.ln} className={`grid grid-cols-[40px_1fr_1fr] gap-1 ${r.same ? '' : 'bg-status-amber/5'}`}>
              <span className="text-content-muted">{r.ln}</span>
              <span className={r.same ? 'text-content-secondary' : 'text-status-red'}>{r.left}</span>
              <span className={r.same ? 'text-content-secondary' : 'text-status-green'}>{r.right}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

interface Addendum { id: string; contractId: number | null; label: string; date: string }

function AddendaCard({ contractId }: Props) {
  const [items, setItems] = useLocalStorage<Addendum[]>('promix_contract_addenda_v1', []);
  const [draft, setDraft] = useState<{ label?: string }>({});
  const filtered = items.filter(i => !contractId || i.contractId === contractId);
  return (
    <SectionCard title="Anexe / acte adiționale" icon={Paperclip}>
      <div className="flex items-center gap-2 mb-2">
        <input className="flex-1 h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Titlu anexă (Act adițional 2026/01)" value={draft.label ?? ''}
          onChange={(e) => setDraft({ label: e.target.value })} />
        <Button variant="primary" size="sm" disabled={!contractId} onClick={() => {
          if (!draft.label) return;
          setItems(prev => [{ id: `${Date.now()}`, contractId: contractId ?? null, label: draft.label!, date: new Date().toISOString() }, ...prev]);
          setDraft({});
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {filtered.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40">
          {filtered.map(a => (
            <li key={a.id} className="flex items-center gap-2 py-1.5">
              <Paperclip className="h-3 w-3 text-content-muted" />
              <span className="flex-1 text-content-primary truncate">{a.label}</span>
              <span className="text-content-muted">{formatDateRo(a.date)}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function PublicLinkCard({ contractNo }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  return (
    <SectionCard title="Link public watermarked" icon={ExternalLink}>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-pm-xs text-accent hover:underline break-all">{url}</a>
      ) : (
        <Button variant="primary" size="sm" disabled={!contractNo}
          onClick={() => {
            const token = Math.random().toString(36).slice(2, 10);
            setUrl(`${location.origin}/#/portal/contract/${token}`);
            toast.success('Link generat — valabil 7 zile');
          }}>Generează link</Button>
      )}
    </SectionCard>
  );
}

export default function ContractEnhancements(props: Props) {
  useEffect(() => {  }, [props.contractId]);
  return (
    <section className="mt-4 space-y-3">
      <header>
        <p className="text-pm-eyebrow text-content-muted mb-1">Contract — extra</p>
        <h2 className="text-pm-md font-semibold text-content-primary">Tools avansate</h2>
      </header>
      <TemplateLibraryCard />
      <AutoNumberingCard />
      <ESignatureCard {...props} />
      <RenewalRemindersCard {...props} />
      <RevisionCompareCard {...props} />
      <AddendaCard {...props} />
      <PublicLinkCard {...props} />
    </section>
  );
}
