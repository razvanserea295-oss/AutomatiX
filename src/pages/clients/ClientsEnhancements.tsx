




import { useMemo, useState } from 'react';
import { Upload, MapPin, History, ShieldAlert, Tags, Mail, Cake, Plus, Trash2 } from '@/icons';
import { useLocalStorage, SectionCard } from '@/components/enhancements';
import Button from '@/components/ui/Button';
import { toast } from '@/store/toastStore';
import { formatDateRo } from '@/lib/format';

interface ClientLite { id: number; name: string; email?: string | null; address?: string | null; phone?: string | null }
interface Props { clients: ClientLite[]; embedded?: boolean }

function CsvImportCard() {
  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      toast.info(`${lines.length - 1} rânduri detectate — confirmare admin necesară pentru creare`);
    } catch { toast.error('Fișier invalid'); }
  };
  return (
    <SectionCard title="Import CSV" icon={Upload}>
      <label className="cursor-pointer h-9 px-3 inline-flex items-center gap-1.5 rounded bg-surface-tertiary text-pm-base">
        <input type="file" accept=".csv,.tsv,.xls,.xlsx" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }} />
        <Upload className="h-3.5 w-3.5" /> Selectează fișier
      </label>
    </SectionCard>
  );
}

function GeoMapCard({ clients }: Props) {
  const withAddr = useMemo(() => clients.filter(c => c.address?.trim()), [clients]);
  return (
    <SectionCard title="Hartă clienți" icon={MapPin}
      description={`${withAddr.length} clienți au adresă`}
    >
      <ul className="text-pm-xs grid grid-cols-1 md:grid-cols-2 gap-1 max-h-44 overflow-y-auto">
        {withAddr.slice(0, 24).map(c => (
          <li key={c.id} className="flex items-center gap-2 px-2 py-1 rounded bg-surface-tertiary/30">
            <MapPin className="h-3 w-3 text-content-muted" />
            <span className="text-content-primary truncate flex-1">{c.name}</span>
            <a target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(c.address ?? '')}`}
              className="text-pm-2xs text-accent hover:underline">harta</a>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

interface Interaction { id: string; clientId: number; kind: 'call' | 'email' | 'visit' | 'order'; note: string; ts: string }

function TimelineCard({ clients }: Props) {
  const [items, setItems] = useLocalStorage<Interaction[]>('promix_clients_timeline_v1', []);
  const [draft, setDraft] = useState<Partial<Interaction>>({ kind: 'call' });
  return (
    <SectionCard title="Timeline interacțiuni" icon={History}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <select value={draft.clientId ?? ''} onChange={(e) => setDraft(d => ({ ...d, clientId: Number(e.target.value) }))}
          className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base">
          <option value="">Client</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={draft.kind} onChange={(e) => setDraft(d => ({ ...d, kind: e.target.value as Interaction['kind'] }))}
          className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base">
          <option value="call">Call</option><option value="email">Email</option>
          <option value="visit">Vizită</option><option value="order">Comandă</option>
        </select>
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Notă" value={draft.note ?? ''} onChange={(e) => setDraft(d => ({ ...d, note: e.target.value }))} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.clientId || !draft.note) return;
          setItems(prev => [{ id: `${Date.now()}`, clientId: draft.clientId!, kind: draft.kind ?? 'call', note: draft.note!, ts: new Date().toISOString() }, ...prev]);
          setDraft({ kind: 'call' });
        }}>Înregistrează</Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40 max-h-32 overflow-y-auto">
          {items.map(i => {
            const c = clients.find(x => x.id === i.clientId);
            return (
              <li key={i.id} className="flex items-center gap-2 py-1.5">
                <span className="text-pm-2xs uppercase text-content-muted">{i.kind}</span>
                <span className="text-content-primary">{c?.name ?? '#' + i.clientId}</span>
                <span className="flex-1 text-content-secondary truncate">{i.note}</span>
                <span className="text-content-muted">{formatDateRo(i.ts)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function CreditScoreCard({ clients }: Props) {
  const [scores, setScores] = useLocalStorage<Record<number, number>>('promix_clients_credit_v1', {});
  return (
    <SectionCard title="Credit score (manual)" icon={ShieldAlert}
      description="0–100 — punctaj care apare lângă numele clientului în liste"
    >
      <ul className="text-pm-xs grid grid-cols-1 md:grid-cols-2 gap-1 max-h-44 overflow-y-auto">
        {clients.slice(0, 24).map(c => {
          const score = scores[c.id] ?? 70;
          const tone = score >= 75 ? 'text-status-green' : score >= 45 ? 'text-status-amber' : 'text-status-red';
          return (
            <li key={c.id} className="flex items-center gap-2 px-2 py-1 rounded bg-surface-tertiary/30">
              <span className="flex-1 text-content-primary truncate">{c.name}</span>
              <input type="number" min={0} max={100} value={score}
                onChange={(e) => setScores({ ...scores, [c.id]: Number(e.target.value) })}
                className="w-14 h-7 rounded border border-line bg-surface-primary px-1.5 text-pm-base tabular-nums" />
              <span className={`text-pm-2xs ${tone}`}>{score >= 75 ? 'OK' : score >= 45 ? 'Atenție' : 'Risc'}</span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

interface ClientTag { clientId: number; tag: string }

function TagsCard({ clients }: Props) {
  const [items, setItems] = useLocalStorage<ClientTag[]>('promix_clients_tags_v1', []);
  const [draft, setDraft] = useState<Partial<ClientTag>>({});
  return (
    <SectionCard title="Tag-uri" icon={Tags}>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <select value={draft.clientId ?? ''} onChange={(e) => setDraft(d => ({ ...d, clientId: Number(e.target.value) }))}
          className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base">
          <option value="">Client</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Tag (ex: key-account)" value={draft.tag ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, tag: e.target.value }))} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.clientId || !draft.tag) return;
          setItems(prev => [...prev, { clientId: draft.clientId!, tag: draft.tag! }]);
          setDraft({});
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((t, i) => {
            const c = clients.find(x => x.id === t.clientId);
            return (
              <li key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-line text-pm-2xs text-content-secondary bg-surface-tertiary/40">
                <span className="text-content-primary">{c?.name ?? '#' + t.clientId}</span>:
                <span>{t.tag}</span>
                <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                  className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function EmailBlastCard({ clients }: Props) {
  const [recipients, setRecipients] = useState<number[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  return (
    <SectionCard title="Email blast" icon={Mail}>
      <select multiple value={recipients.map(String)} onChange={(e) => {
        setRecipients(Array.from(e.target.selectedOptions).map(o => Number(o.value)));
      }} className="h-24 w-full rounded border border-line bg-surface-primary px-3 text-pm-base mb-2">
        {clients.filter(c => c.email).map(c => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
      </select>
      <input className="h-9 w-full rounded border border-line bg-surface-primary px-3 text-pm-base mb-2"
        placeholder="Subiect" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea rows={3} className="w-full rounded border border-line bg-surface-primary px-3 py-2 text-pm-base"
        placeholder="Corp mesaj — folosește {{name}} pentru personalizare"
        value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex justify-end mt-2">
        <Button variant="primary" size="sm" disabled={recipients.length === 0 || !subject}
          onClick={() => toast.info(`${recipients.length} email-uri pregătite — necesită SMTP server activ`)}>Pregătește trimitere</Button>
      </div>
    </SectionCard>
  );
}

interface Anniversary { clientId: number; date: string; label: string }

function AnniversariesCard({ clients }: Props) {
  const [items, setItems] = useLocalStorage<Anniversary[]>('promix_clients_anniversaries_v1', []);
  const [draft, setDraft] = useState<Partial<Anniversary>>({});
  const upcoming = useMemo(() => {
    const now = new Date();
    return items.filter(a => {
      const d = new Date(a.date);
      const diff = (d.getTime() - now.getTime()) / 86400_000;
      return diff < 30 && diff > -1;
    });
  }, [items]);
  return (
    <SectionCard title="Aniversări & memento-uri" icon={Cake}
      description={`${upcoming.length} apropiate (≤30 zile)`}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <select value={draft.clientId ?? ''} onChange={(e) => setDraft(d => ({ ...d, clientId: Number(e.target.value) }))}
          className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base">
          <option value="">Client</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          value={draft.date ?? ''} onChange={(e) => setDraft(d => ({ ...d, date: e.target.value }))} />
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Eveniment" value={draft.label ?? ''} onChange={(e) => setDraft(d => ({ ...d, label: e.target.value }))} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.clientId || !draft.date || !draft.label) return;
          setItems(prev => [...prev, { clientId: draft.clientId!, date: draft.date!, label: draft.label! }]);
          setDraft({});
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40 max-h-32 overflow-y-auto">
          {items.map((a, i) => {
            const c = clients.find(x => x.id === a.clientId);
            return (
              <li key={i} className="flex items-center gap-2 py-1.5">
                <span className="text-content-primary">{c?.name ?? '#' + a.clientId}</span>
                <span className="flex-1 text-content-secondary truncate">{a.label}</span>
                <span className="text-content-muted">{formatDateRo(a.date)}</span>
                <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                  className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

export default function ClientsEnhancements({ clients, embedded = false }: Props) {
  const cards = (
    <>
      <TimelineCard clients={clients} />
      <EmailBlastCard clients={clients} />
      <AnniversariesCard clients={clients} />
      <CsvImportCard />
      <GeoMapCard clients={clients} />
      <CreditScoreCard clients={clients} />
      <TagsCard clients={clients} />
    </>
  );

  if (embedded) {
    return <div className="space-y-[var(--density-gap-section)]">{cards}</div>;
  }

  return (
    <section className="border-t border-line p-3 space-y-3 bg-surface-secondary/40">
      <header>
        <p className="text-pm-eyebrow text-content-muted mb-1">Clienți — extra</p>
        <h2 className="text-pm-md font-semibold text-content-primary">Tools CRM</h2>
      </header>
      {cards}
    </section>
  );
}
