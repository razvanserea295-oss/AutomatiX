








import { useEffect, useMemo, useState } from 'react';
import {
  Search, Target, Phone, Mail, MapPin, User as UserIcon, Tag as TagIcon, MessageSquarePlus, Clock,
} from 'lucide-react';
import type { User } from '@/core/types';
import { useSalesStore, type SalesLead } from '@/store/salesStore';
import { toast } from '@/store/toastStore';
import {
  Card, ListRow, RowTitle, RowMeta, Tag, Divider, EmptyState, CenterSpinner, Segmented,
  Sheet, Field, TextArea, MButton, fmtNum, fmtDate, timeAgo, initials, type Tone,
} from './kit';

const LEAD_STATUS: Record<string, { label: string; tone: Tone }> = {
  fara_contact:    { label: 'Fără contact',   tone: 'neutral' },
  decizie_client:  { label: 'Decizie client', tone: 'amber' },
  decizie_noastra: { label: 'Decizia noastră',tone: 'blue' },
  in_negocieri:    { label: 'În negociere',   tone: 'purple' },
  in_negociere:    { label: 'În negociere',   tone: 'purple' },
  converted:       { label: 'Convertit',      tone: 'green' },
  convertit:       { label: 'Convertit',      tone: 'green' },
  castigat:        { label: 'Câștigat',       tone: 'green' },
  pierdut:         { label: 'Pierdut',        tone: 'red' },
};

function statusMeta(status: string): { label: string; tone: Tone } {
  return LEAD_STATUS[(status || '').toLowerCase()] || { label: status || '—', tone: 'neutral' };
}

type Filter = 'toate' | 'fara_contact' | 'in_negocieri' | 'decizie_client' | 'converted';

const FILTERS: { value: Filter; label: string; match: (s: string) => boolean }[] = [
  { value: 'toate',          label: 'Toate',         match: () => true },
  { value: 'fara_contact',   label: 'Fără contact',  match: s => s === 'fara_contact' },
  { value: 'in_negocieri',   label: 'Negociere',     match: s => s === 'in_negocieri' || s === 'in_negociere' },
  { value: 'decizie_client', label: 'Decizie',       match: s => s === 'decizie_client' || s === 'decizie_noastra' },
  { value: 'converted',      label: 'Convertite',    match: s => s === 'converted' || s === 'convertit' || s === 'castigat' },
];

export default function SalesTab({ refreshKey }: { user: User; refreshKey: number }) {
  const leads = useSalesStore(s => s.leads);
  const loading = useSalesStore(s => s.loading);
  const loaded = useSalesStore(s => s.loaded);

  const [filter, setFilter] = useState<Filter>('toate');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => { void useSalesStore.getState().fetchLeads(); }, []);
  useEffect(() => { if (refreshKey > 0) void useSalesStore.getState().fetchLeads(true); }, [refreshKey]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { toate: leads.length, fara_contact: 0, in_negocieri: 0, decizie_client: 0, converted: 0 };
    for (const l of leads) {
      const s = (l.status || '').toLowerCase();
      for (const f of FILTERS) if (f.value !== 'toate' && f.match(s)) c[f.value]++;
    }
    return c;
  }, [leads]);

  const visible = useMemo(() => {
    const active = FILTERS.find(f => f.value === filter)!;
    const q = query.trim().toLowerCase();
    return leads
      .filter(l => active.match((l.status || '').toLowerCase()))
      .filter(l => !q
        || l.client_name?.toLowerCase().includes(q)
        || l.contact_person?.toLowerCase().includes(q)
        || l.location?.toLowerCase().includes(q)
        || l.product_interest?.toLowerCase().includes(q))
      .sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0));
  }, [leads, filter, query]);

  const openLead = leads.find(l => l.id === openId) || null;

  return (
    <div className="pt-3">
      {}
      <div className="px-3.5">
        <div className="flex items-center gap-2 h-11 px-3 rounded-lg border border-line bg-surface-secondary">
          <Search className="h-4 w-4 text-content-muted shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Caută client, contact, locație…"
            
            className="flex-1 bg-transparent text-pm-lg text-content-primary placeholder:text-content-muted outline-none"
            autoCapitalize="none"
          />
        </div>
      </div>

      {}
      <div className="mt-3">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={FILTERS.map(f => ({ value: f.value, label: f.label, count: counts[f.value] }))}
        />
      </div>

      {}
      <div className="px-3.5 mt-3">
        {!loaded && loading ? (
          <CenterSpinner label="Se încarcă lead-urile…" />
        ) : visible.length === 0 ? (
          <Card><EmptyState icon={Target} title="Niciun lead" hint={query ? 'Niciun rezultat pentru căutare.' : 'Nu există lead-uri în această categorie.'} /></Card>
        ) : (
          <Card className="overflow-hidden">
            {visible.map((l, i) => {
              const sm = statusMeta(l.status);
              return (
                <div key={l.id}>
                  {i > 0 && <Divider />}
                  <ListRow onClick={() => setOpenId(l.id)} accent={sm.tone}>
                    <div className="flex items-center gap-2">
                      <RowTitle>{l.client_name}</RowTitle>
                    </div>
                    <RowMeta>
                      <Tag tone={sm.tone}>{sm.label}</Tag>
                      {l.location && <span className="truncate">{l.location}</span>}
                    </RowMeta>
                    <RowMeta>
                      <span className="font-semibold text-content-secondary tabular-nums">€ {fmtNum(l.estimated_value)}</span>
                      {l.next_followup_date && <span>· follow-up {fmtDate(l.next_followup_date)}</span>}
                    </RowMeta>
                  </ListRow>
                </div>
              );
            })}
          </Card>
        )}
        <div className="h-2" />
      </div>

      <LeadSheet lead={openLead} onClose={() => setOpenId(null)} />
    </div>
  );
}





function LeadSheet({ lead, onClose }: { lead: SalesLead | null; onClose: () => void }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  
  useEffect(() => {
    if (lead) { setNote(''); void useSalesStore.getState().reloadLead(lead.id); }
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lead) return null;
  const sm = statusMeta(lead.status);

  const addNote = async () => {
    const content = note.trim();
    if (!content) return;
    setSaving(true);
    try {
      await useSalesStore.getState().addNote(lead.id, content);
      setNote('');
      toast.success('Notă adăugată');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare la salvare');
    } finally {
      setSaving(false);
    }
  };

  const notes = lead.recent_notes || [];

  return (
    <Sheet
      open={!!lead}
      onClose={onClose}
      title={lead.client_name}
      subtitle={<span className="inline-flex items-center gap-2"><Tag tone={sm.tone}>{sm.label}</Tag><span>€ {fmtNum(lead.estimated_value)}</span></span>}
      footer={
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextArea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Scrie o notă…"
              rows={1}
              style={{ minHeight: 44 }}
            />
          </div>
          <MButton onClick={addNote} busy={saving} disabled={!note.trim()} icon={MessageSquarePlus}>Notă</MButton>
        </div>
      }
    >
      {}
      <div className="space-y-1">
        {lead.contact_person && <DetailRow icon={UserIcon} label="Persoană contact" value={lead.contact_person} />}
        {lead.contact_phone && <DetailRow icon={Phone} label="Telefon" value={lead.contact_phone} href={`tel:${lead.contact_phone}`} />}
        {lead.contact_email && <DetailRow icon={Mail} label="Email" value={lead.contact_email} href={`mailto:${lead.contact_email}`} />}
        {lead.location && <DetailRow icon={MapPin} label="Locație" value={lead.location} />}
        {lead.product_interest && <DetailRow icon={TagIcon} label="Interes" value={lead.product_interest} />}
        {lead.assigned_to_name && <DetailRow icon={UserIcon} label="Responsabil" value={lead.assigned_to_name} />}
        {lead.next_followup_date && <DetailRow icon={Clock} label="Follow-up" value={fmtDate(lead.next_followup_date)} />}
      </div>

      {}
      <div className="mt-5">
        <Field label={`Note recente (${notes.length})`}>
          <div />
        </Field>
        {notes.length === 0 ? (
          <p className="text-pm-sm text-content-muted py-2">Nicio notă încă. Adaugă prima mai jos.</p>
        ) : (
          <div className="space-y-2">
            {notes.map(n => (
              <div key={n.id} className="rounded-lg border border-line bg-surface-secondary p-3">
                <p className="text-pm-md text-content-primary whitespace-pre-wrap break-words">{n.content}</p>
                <div className="mt-1.5 flex items-center gap-2 text-pm-xs text-content-muted">
                  <span className="grid place-items-center h-5 w-5 rounded-full bg-surface-tertiary text-pm-2xs font-bold">
                    {initials(n.created_by_name)}
                  </span>
                  <span>{n.created_by_name || 'Anonim'}</span>
                  <span>· {timeAgo(n.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function DetailRow({ icon: Icon, label, value, href }: {
  icon: typeof UserIcon; label: string; value: string; href?: string;
}) {
  const body = (
    <>
      <Icon className="h-4 w-4 text-content-muted shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="text-pm-2xs uppercase tracking-wide text-content-muted">{label}</div>
        <div className={`text-pm-md ${href ? 'text-accent' : 'text-content-primary'} break-words`}>{value}</div>
      </div>
    </>
  );
  return href ? (
    <a href={href} className="flex items-start gap-3 py-2 active:opacity-70">{body}</a>
  ) : (
    <div className="flex items-start gap-3 py-2">{body}</div>
  );
}
