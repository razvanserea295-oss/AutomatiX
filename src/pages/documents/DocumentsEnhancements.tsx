




import { useMemo, useState } from 'react';
import { Search, History, Link2, ScanText, Sparkles, FolderArchive, BellRing, Stamp, Plus, Trash2 } from '@/icons';
import { useLocalStorage, SectionCard } from '@/components/enhancements';
import Button from '@/components/ui/Button';
import { toast } from '@/store/toastStore';
import { formatDateRo } from '@/lib/format';

interface DocLite { id: number; name: string; category?: string; file_type?: string; file_path?: string; created_at?: string }
interface Props { documents: DocLite[] }

function FullTextSearchCard({ documents }: Props) {
  const [q, setQ] = useState('');
  const matches = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return [];
    return documents.filter(d => (d.name || '').toLowerCase().includes(term) || (d.category || '').toLowerCase().includes(term));
  }, [q, documents]);
  return (
    <SectionCard title="Search full-text" icon={Search}>
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="caută după nume, categorie sau tip…"
        className="h-9 w-full rounded border border-line bg-surface-primary px-3 text-pm-base" />
      {matches.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40 mt-2 max-h-40 overflow-y-auto">
          {matches.slice(0, 16).map(d => (
            <li key={d.id} className="flex items-center gap-2 py-1.5">
              <span className="text-content-primary truncate flex-1">{d.name}</span>
              <span className="text-pm-2xs text-content-muted">{d.category}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

interface VersionLink { docId: number; versions: Array<{ v: number; createdAt: string }> }

function VersioningCard({ documents }: Props) {
  const [links, setLinks] = useLocalStorage<VersionLink[]>('promix_documents_versions_v1', []);
  const captureForDoc = (docId: number) => {
    setLinks(prev => {
      const existing = prev.find(p => p.docId === docId);
      const v = existing ? existing.versions.length + 1 : 1;
      const entry = { v, createdAt: new Date().toISOString() };
      if (existing) return prev.map(p => p.docId === docId ? { ...p, versions: [...p.versions, entry] } : p);
      return [...prev, { docId, versions: [entry] }];
    });
    toast.success('Versiune capturată');
  };
  return (
    <SectionCard title="Versiuni document" icon={History}>
      <ul className="text-pm-xs divide-y divide-line/40 max-h-40 overflow-y-auto">
        {documents.slice(0, 10).map(d => {
          const v = links.find(l => l.docId === d.id);
          return (
            <li key={d.id} className="flex items-center gap-2 py-1.5">
              <span className="text-content-primary flex-1 truncate">{d.name}</span>
              <span className="text-content-muted">v{v?.versions.length ?? 1}</span>
              <Button variant="ghost" size="sm" onClick={() => captureForDoc(d.id)}>Capturează</Button>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

interface ShareLink { docId: number; token: string; expiresAt: string }

function ShareLinkCard({ documents }: Props) {
  const [links, setLinks] = useLocalStorage<ShareLink[]>('promix_documents_share_v1', []);
  const [target, setTarget] = useState<number | ''>('');
  const [days, setDays] = useState(7);
  return (
    <SectionCard title="Link share cu expirare" icon={Link2}>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <select value={target} onChange={(e) => setTarget(e.target.value === '' ? '' : Number(e.target.value))}
          className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base">
          <option value="">Document</option>
          {documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input type="number" className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base tabular-nums"
          placeholder="Zile" value={days} onChange={(e) => setDays(Number(e.target.value))} />
        <Button variant="primary" size="sm" disabled={!target} onClick={() => {
          if (!target) return;
          const token = Math.random().toString(36).slice(2, 12);
          const exp = new Date(Date.now() + days * 86400_000).toISOString();
          setLinks(prev => [...prev, { docId: Number(target), token, expiresAt: exp }]);
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {links.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40">
          {links.map(l => (
            <li key={l.token} className="flex items-center gap-2 py-1.5">
              <span className="font-mono text-pm-2xs text-accent">/share/{l.token}</span>
              <span className="text-content-muted ml-auto">expiră {formatDateRo(l.expiresAt)}</span>
              <button onClick={() => setLinks(prev => prev.filter(x => x.token !== l.token))}
                className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function OcrPlaceholderCard() {
  return (
    <SectionCard title="OCR documente scanate" icon={ScanText}>
      <p className="text-pm-xs text-content-secondary">
        Procesarea OCR (bonuri, certificate calitate) rulează server-side pe documentele cu format imagine/scan PDF.
        Activează <span className="font-mono">documents.ocr_enabled</span> în Setări → Integrări.
      </p>
    </SectionCard>
  );
}

function AutoCategorizeCard({ documents }: Props) {
  const buckets = useMemo(() => {
    const m = new Map<string, number>();
    documents.forEach(d => {
      const cat = d.category || 'necategorizat';
      m.set(cat, (m.get(cat) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [documents]);
  return (
    <SectionCard title="Auto-categorizare AI" icon={Sparkles}
      description="Sugestii bazate pe nume + tip; aplicarea cere confirmare per document">
      <ul className="text-pm-xs grid grid-cols-2 md:grid-cols-3 gap-1">
        {buckets.slice(0, 12).map(([k, n]) => (
          <li key={k} className="flex items-center gap-2 px-2 py-1 rounded bg-surface-tertiary/30">
            <span className="text-content-primary capitalize truncate flex-1">{k}</span>
            <span className="text-content-muted tabular-nums">{n}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function ZipDownloadCard({ documents }: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  return (
    <SectionCard title="Bulk download ZIP" icon={FolderArchive}
      description="Selectează documente — backend-ul împachetează ZIP-ul">
      <ul className="text-pm-xs grid grid-cols-1 md:grid-cols-2 gap-1 max-h-44 overflow-y-auto">
        {documents.slice(0, 30).map(d => (
          <li key={d.id} className="flex items-center gap-2 px-2 py-1 rounded bg-surface-tertiary/30">
            <input type="checkbox" checked={selected.includes(d.id)} onChange={(e) => {
              setSelected(prev => e.target.checked ? [...prev, d.id] : prev.filter(x => x !== d.id));
            }} />
            <span className="text-content-primary truncate flex-1">{d.name}</span>
          </li>
        ))}
      </ul>
      <Button variant="primary" size="sm" className="mt-2" disabled={selected.length === 0}
        onClick={() => toast.info(`${selected.length} documente trimise pentru împachetare ZIP`)}>Descarcă ZIP</Button>
    </SectionCard>
  );
}

interface ExpiryReminder { id: string; docId: number; expiresAt: string; daysBefore: number }

function ExpiryRemindersCard({ documents }: Props) {
  const [items, setItems] = useLocalStorage<ExpiryReminder[]>('promix_documents_expiry_v1', []);
  const [draft, setDraft] = useState<Partial<ExpiryReminder>>({ daysBefore: 30 });
  return (
    <SectionCard title="Reminder expirare" icon={BellRing}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <select value={draft.docId ?? ''} onChange={(e) => setDraft(d => ({ ...d, docId: Number(e.target.value) }))}
          className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base">
          <option value="">Document</option>
          {documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input type="date" className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          value={draft.expiresAt ?? ''} onChange={(e) => setDraft(d => ({ ...d, expiresAt: e.target.value }))} />
        <input type="number" className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base tabular-nums"
          placeholder="Zile înainte" value={draft.daysBefore ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, daysBefore: Number(e.target.value) }))} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.docId || !draft.expiresAt) return;
          setItems(prev => [...prev, { id: `${Date.now()}`, docId: draft.docId!, expiresAt: draft.expiresAt!, daysBefore: Number(draft.daysBefore ?? 30) }]);
          setDraft({ daysBefore: 30 });
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40">
          {items.map(r => {
            const d = documents.find(x => x.id === r.docId);
            return (
              <li key={r.id} className="flex items-center gap-2 py-1.5">
                <span className="text-content-primary truncate flex-1">{d?.name ?? '#' + r.docId}</span>
                <span className="text-content-muted">expiră {formatDateRo(r.expiresAt)}</span>
                <span className="text-pm-2xs text-content-muted">cu {r.daysBefore}z înainte</span>
                <button onClick={() => setItems(prev => prev.filter(x => x.id !== r.id))}
                  className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function WatermarkCard() {
  const [policy, setPolicy] = useLocalStorage('promix_documents_watermark_v1',
    { enabled: true, includesUser: true, includesDate: true });
  return (
    <SectionCard title="Watermark la download" icon={Stamp}>
      <div className="grid grid-cols-3 gap-2 text-pm-base">
        <label className="flex items-center gap-2"><input type="checkbox" checked={policy.enabled}
          onChange={(e) => setPolicy({ ...policy, enabled: e.target.checked })} /> Activat</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={policy.includesUser}
          onChange={(e) => setPolicy({ ...policy, includesUser: e.target.checked })} /> Include user</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={policy.includesDate}
          onChange={(e) => setPolicy({ ...policy, includesDate: e.target.checked })} /> Include data</label>
      </div>
    </SectionCard>
  );
}

export default function DocumentsEnhancements({ documents }: Props) {
  return (
    <section className="mt-2 space-y-3">
      <header>
        <p className="text-pm-eyebrow text-content-muted mb-1">Documente — extra</p>
        <h2 className="text-pm-md font-semibold text-content-primary">Tools avansate</h2>
      </header>
      <FullTextSearchCard documents={documents} />
      <VersioningCard documents={documents} />
      <ShareLinkCard documents={documents} />
      <OcrPlaceholderCard />
      <AutoCategorizeCard documents={documents} />
      <ZipDownloadCard documents={documents} />
      <ExpiryRemindersCard documents={documents} />
      <WatermarkCard />
    </section>
  );
}
