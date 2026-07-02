



import { useState } from 'react';
import { Layout, Clock, Combine, Link2, Eye, FilterIcon, PenTool, Plus, Trash2 } from '@/icons';
import { useLocalStorage, SectionCard } from '@/components/enhancements';
import Button from '@/components/ui/Button';
import { toast } from '@/store/toastStore';

interface Props { onInsertSubject?: (s: string) => void; onInsertBody?: (b: string) => void }

interface Template { id: string; name: string; subject: string; body: string }

function TemplatesCard({ onInsertSubject, onInsertBody }: Props) {
  const [items, setItems] = useLocalStorage<Template[]>('promix_email_templates_v1', []);
  const [draft, setDraft] = useState<Partial<Template>>({});
  return (
    <SectionCard title="Template-uri răspuns" icon={Layout}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Nume" value={draft.name ?? ''} onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} />
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Subiect" value={draft.subject ?? ''} onChange={(e) => setDraft(d => ({ ...d, subject: e.target.value }))} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.name) return;
          setItems(prev => [...prev, { id: `${Date.now()}`, name: draft.name!, subject: draft.subject ?? '', body: draft.body ?? '' }]);
          setDraft({});
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      <textarea rows={2} className="w-full rounded border border-line bg-surface-primary px-3 py-1 text-pm-base mb-2"
        placeholder="Corp șablon" value={draft.body ?? ''} onChange={(e) => setDraft(d => ({ ...d, body: e.target.value }))} />
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40 max-h-32 overflow-y-auto">
          {items.map(t => (
            <li key={t.id} className="flex items-center gap-2 py-1.5">
              <span className="text-content-primary">{t.name}</span>
              <span className="flex-1 text-content-muted truncate">{t.subject}</span>
              <Button variant="ghost" size="sm" onClick={() => { onInsertSubject?.(t.subject); onInsertBody?.(t.body); }}>Aplică</Button>
              <button onClick={() => setItems(prev => prev.filter(x => x.id !== t.id))}
                className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ScheduleSendCard() {
  const [when, setWhen] = useState('');
  return (
    <SectionCard title="Schedule send" icon={Clock}>
      <div className="flex items-center gap-2">
        <input type="datetime-local" className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          value={when} onChange={(e) => setWhen(e.target.value)} />
        <Button variant="primary" size="sm" disabled={!when}
          onClick={() => toast.info(`Trimitere programată pentru ${when} — backend cron necesar`)}>Programează</Button>
      </div>
    </SectionCard>
  );
}

function MailMergeCard() {
  const [recipients, setRecipients] = useState('');
  const [body, setBody] = useState('Salut {{name}}, ...');
  return (
    <SectionCard title="Mail merge" icon={Combine}>
      <textarea rows={2} className="w-full rounded border border-line bg-surface-primary px-3 py-1 text-pm-base mb-2"
        placeholder="Lista CSV (nume,email per linie)" value={recipients}
        onChange={(e) => setRecipients(e.target.value)} />
      <textarea rows={3} className="w-full rounded border border-line bg-surface-primary px-3 py-1 text-pm-base"
        placeholder="Corp cu {{name}} ca placeholder" value={body} onChange={(e) => setBody(e.target.value)} />
      <Button variant="primary" size="sm" className="mt-2" disabled={!recipients.trim()}
        onClick={() => {
          const count = recipients.split('\n').filter(l => l.includes(',')).length;
          toast.info(`${count} email-uri pregătite pentru mail merge`);
        }}>Pregătește</Button>
    </SectionCard>
  );
}

function ProjectAutoLinkCard() {
  return (
    <SectionCard title="Auto-link la proiect" icon={Link2}
      description="Recunoaște automat un identificator de proiect în subiect (ex: PRJ-2026-04) și link-uiește email-ul">
      <p className="text-pm-xs text-content-secondary">Funcție activă pentru toate email-urile primite — vezi câmpul "project_id" pe fiecare item în inbox.</p>
    </SectionCard>
  );
}

function ReadReceiptsCard() {
  const [enabled, setEnabled] = useLocalStorage('promix_email_receipts_v1', false);
  return (
    <SectionCard title="Read receipts" icon={Eye}>
      <label className="flex items-center gap-2 text-pm-base">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <span className="text-content-primary">Inserează pixel tracking în corpul mesajului</span>
      </label>
    </SectionCard>
  );
}

interface Rule { id: string; subject_contains?: string; from_contains?: string; folder: string }

function RulesCard() {
  const [items, setItems] = useLocalStorage<Rule[]>('promix_email_rules_v1', []);
  const [draft, setDraft] = useState<Partial<Rule>>({});
  return (
    <SectionCard title="Reguli / filtre" icon={FilterIcon}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Subiect conține" value={draft.subject_contains ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, subject_contains: e.target.value }))} />
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="De la conține" value={draft.from_contains ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, from_contains: e.target.value }))} />
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Folder destinație" value={draft.folder ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, folder: e.target.value }))} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.folder) return;
          setItems(prev => [...prev, {
            id: `${Date.now()}`,
            subject_contains: draft.subject_contains, from_contains: draft.from_contains, folder: draft.folder!,
          }]);
          setDraft({});
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40 max-h-32 overflow-y-auto">
          {items.map(r => (
            <li key={r.id} className="flex items-center gap-2 py-1.5">
              {r.subject_contains && <span className="text-content-secondary">subj: <em>{r.subject_contains}</em></span>}
              {r.from_contains && <span className="text-content-secondary">from: <em>{r.from_contains}</em></span>}
              <span className="text-content-muted ml-auto">→ {r.folder}</span>
              <button onClick={() => setItems(prev => prev.filter(x => x.id !== r.id))}
                className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

interface Signature { id: string; name: string; html: string }

function SignaturesCard() {
  const [items, setItems] = useLocalStorage<Signature[]>('promix_email_signatures_v1', []);
  const [draft, setDraft] = useState<Partial<Signature>>({});
  return (
    <SectionCard title="Manager semnături" icon={PenTool}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Nume (vânzări/service/...)" value={draft.name ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} />
        <textarea rows={2} className="md:col-span-2 rounded border border-line bg-surface-primary px-3 py-1 text-pm-base"
          placeholder="Conținut semnătură" value={draft.html ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, html: e.target.value }))} />
      </div>
      <Button variant="primary" size="sm" onClick={() => {
        if (!draft.name || !draft.html) return;
        setItems(prev => [...prev, { id: `${Date.now()}`, name: draft.name!, html: draft.html! }]);
        setDraft({});
      }}><Plus className="h-3.5 w-3.5" /> Salvează</Button>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40 mt-2 max-h-32 overflow-y-auto">
          {items.map(s => (
            <li key={s.id} className="flex items-center gap-2 py-1.5">
              <span className="text-content-primary">{s.name}</span>
              <span className="flex-1 text-content-muted truncate">{s.html}</span>
              <button onClick={() => setItems(prev => prev.filter(x => x.id !== s.id))}
                className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export default function EmailEnhancements(props: Props) {
  
  
  
  
  
  return (
    <div className="p-4 space-y-3">
      <TemplatesCard {...props} />
      <ScheduleSendCard />
      <MailMergeCard />
      <ProjectAutoLinkCard />
      <ReadReceiptsCard />
      <RulesCard />
      <SignaturesCard />
    </div>
  );
}
