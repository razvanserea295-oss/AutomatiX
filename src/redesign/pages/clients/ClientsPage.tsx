import { useEffect, useMemo, useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import {
  Users, Plus, Search, Building2, Mail, Phone, MapPin, Pencil, Trash2,
  FolderKanban, DollarSign, Landmark, Hash, Loader2, X as XIcon, FileText,
} from 'lucide-react';

import type { User, Project, Client } from '@/core/types';
import { cn } from '@/lib/cn';
import { useClientStore } from '@/store/clientStore';
import { useProjectStore } from '@/store/projectStore';
import { useMoney } from '@/store/settingsStore';
import { apiCommand } from '@/api/commands';
import { useViewerMode } from '@/hooks/useViewerMode';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import { projectStatus } from '@/lib/statusTokens';
import type { AnafCompanyInfo } from '@/components/AnafLookupButton';
import ClientsEnhancements from '@/pages/clients/ClientsEnhancements';

import Page from '@/redesign/ui/Page';
import Card from '@/redesign/ui/Card';
import KpiCard from '@/redesign/ui/KpiCard';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import StatusBadge from '@/redesign/ui/StatusBadge';
import SectionHeader from '@/redesign/ui/SectionHeader';
import EmptyState from '@/redesign/ui/EmptyState';
import { filterSearchInputCls, filterSearchIconCls } from '@/redesign/ui/filterControls';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';

// DB-backed fiscal/banking fields not in the base Client type.
type ClientRow = Client & {
  cui?: string; reg_com?: string; city?: string; county?: string;
  bank_name?: string; iban?: string; notes?: string;
};

type FormState = {
  name: string; cui: string; reg_com: string; contact_person: string;
  email: string; phone: string; address: string; city: string; county: string;
  bank_name: string; iban: string; notes: string;
};
const EMPTY_FORM: FormState = {
  name: '', cui: '', reg_com: '', contact_person: '', email: '', phone: '',
  address: '', city: '', county: '', bank_name: '', iban: '', notes: '',
};

// Projects carry their value in estimated_value (budget is legacy/empty). The
// old page summed `budget` only → "Valoare proiecte" was always 0.
function projectValue(p: Project): number {
  return (p as { estimated_value?: number; budget?: number }).estimated_value ?? p.budget ?? 0;
}
function isProjectActive(p: Project): boolean {
  return p.status !== 'finalizat' && p.status !== 'anulat';
}
function initials(name: string): string {
  return (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() || '?';
}

const inputCls =
  'w-full h-9 rounded-lg border border-line/70 bg-surface-secondary/40 px-3 text-pm-sm text-content-primary ' +
  'placeholder:text-content-muted/70 focus:outline-none focus:border-accent/50';
const fieldLabelCls = 'text-pm-2xs font-bold uppercase tracking-wide text-content-muted';

export default function ClientsPage({ user: _user }: { user: User | null }) {
  const isViewer = useViewerMode('clients');
  const clients = useClientStore(s => s.clients) as ClientRow[];
  const loading = useClientStore(s => s.loading);
  const fetchClients = useClientStore(s => s.fetchClients);
  const createClient = useClientStore(s => s.createClient);
  const updateClient = useClientStore(s => s.updateClient);
  const deleteClient = useClientStore(s => s.deleteClient);

  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const money = useMoney();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Create / edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [anafLoading, setAnafLoading] = useState(false);

  useEffect(() => { void fetchClients(); void fetchProjects(); }, [fetchClients, fetchProjects]);

  const projectsByClient = useMemo(() => {
    const map = new Map<number, Project[]>();
    projects.forEach(p => { const arr = map.get(p.client_id) || []; arr.push(p); map.set(p.client_id, arr); });
    return map;
  }, [projects]);

  const statsFor = useCallback((id: number) => {
    const ps = projectsByClient.get(id) || [];
    const active = ps.filter(isProjectActive);
    return { count: ps.length, active: active.length, value: ps.reduce((s, p) => s + projectValue(p), 0), isActive: active.length > 0 };
  }, [projectsByClient]);

  const activeProjects = useMemo(() => projects.filter(isProjectActive), [projects]);
  const metrics = useMemo(() => ({
    total: clients.length,
    activeClients: new Set(activeProjects.map(p => p.client_id)).size,
    activeProjects: activeProjects.length,
    // FIX: value lives in estimated_value, not budget.
    portfolio: activeProjects.reduce((s, p) => s + projectValue(p), 0),
  }), [clients.length, activeProjects]);

  // Filter + sort most-valuable-first so the portfolio prioritises itself.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = !q ? clients : clients.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.contact_person || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q),
    );
    return [...base].sort((a, b) => statsFor(b.id).value - statsFor(a.id).value);
  }, [clients, search, statsFor]);

  const selected = useMemo(() => clients.find(c => c.id === selectedId) ?? null, [clients, selectedId]);
  const selectedProjects = useMemo(
    () => (selected ? [...(projectsByClient.get(selected.id) || [])].sort((a, b) => projectValue(b) - projectValue(a)) : []),
    [selected, projectsByClient],
  );

  // Auto-select the first (most valuable) client so the detail isn't blank.
  useEffect(() => {
    if (selectedId != null) return;
    if (filtered.length > 0) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selectClient = (id: number) => startMorphTransition(() => flushSync(() => setSelectedId(id)), { dir: 'forward' });

  // ── CRUD ──
  const openCreate = useCallback(() => { setEditId(null); setForm(EMPTY_FORM); setDialogOpen(true); }, []);
  const openEdit = useCallback((c: ClientRow) => {
    setEditId(c.id);
    setForm({
      name: c.name ?? '', cui: c.cui ?? '', reg_com: c.reg_com ?? '',
      contact_person: c.contact_person ?? '', email: c.email ?? '', phone: c.phone ?? '',
      address: c.address ?? '', city: c.city ?? '', county: c.county ?? '',
      bank_name: c.bank_name ?? '', iban: c.iban ?? '', notes: c.notes ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (c: ClientRow) => {
    const linked = projects.filter(p => p.client_id === c.id).length;
    const msg = linked > 0
      ? `Sigur ștergi acest client? Are ${linked} proiect(e) asociat(e) ce vor rămâne fără client.`
      : 'Sigur ștergi acest client?';
    if (!(await confirmDialog({ title: 'Șterge clientul?', body: msg, danger: true }))) return;
    try {
      await deleteClient(c.id);
      if (selectedId === c.id) setSelectedId(null);
      toast.success('Client șters');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la ștergere'); }
  }, [deleteClient, projects, selectedId]);

  const save = useCallback(async () => {
    if (!form.name.trim()) { toast.error('Nume obligatoriu'); return; }
    setSubmitting(true);
    try {
      if (editId != null) await updateClient(editId, { ...form });
      else await createClient({ ...form });
      toast.success('Client salvat');
      setDialogOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la salvare'); }
    finally { setSubmitting(false); }
  }, [form, editId, createClient, updateClient]);

  const anafLookup = useCallback(async () => {
    if (!form.cui.trim()) { toast.error('Introdu CUI-ul'); return; }
    setAnafLoading(true);
    try {
      const info = await apiCommand<AnafCompanyInfo>('anaf_lookup_cui', { cui: form.cui });
      setForm(f => ({
        ...f,
        name: info.denumire || f.name, cui: info.cui || f.cui, reg_com: info.reg_com || f.reg_com,
        address: info.adresa || f.address, city: info.oras || f.city, county: info.judet || f.county,
        phone: info.telefon || f.phone,
      }));
      toast.success('Date ANAF preluate');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare ANAF'); }
    finally { setAnafLoading(false); }
  }, [form.cui]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  if (loading && clients.length === 0) {
    return <div className="flex flex-1 items-center justify-center bg-surface-page"><Loader2 className="h-6 w-6 animate-spin text-content-muted" /></div>;
  }

  const selStats = selected ? statsFor(selected.id) : null;

  return (
    <Page fit>
      <Page.Body fit maxWidth="wide" padding="comfortable" className="relative">

        <header className="enter-up shrink-0 flex flex-col gap-4 pb-3.5 border-b border-line/60 xl:flex-row xl:items-center xl:justify-between" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-4 min-w-0">
            <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-pm-lg font-semibold text-content-primary leading-tight truncate">Portofoliu clienți</h1>
              <p className="mt-0.5 text-pm-sm text-content-muted">Clienți, proiecte asociate și instrumente CRM</p>
            </div>
          </div>
          {!isViewer && (
            <div className="flex items-center gap-3 shrink-0">
              <Button size="md" onClick={openCreate}><Plus className="h-4 w-4" /> Adaugă client</Button>
            </div>
          )}
        </header>

        {/* KPI strip — Valoare portofoliu is the hero (and now correct). */}
        <div className="enter-up shrink-0 grid grid-cols-2 lg:grid-cols-5 gap-4" style={{ animationDelay: '80ms' }}>
          <KpiCard label="Total clienți" icon={Users} value={metrics.total} />
          <KpiCard label="Clienți activi" icon={Building2} value={metrics.activeClients} iconColor="text-status-green" />
          <KpiCard label="Proiecte active" icon={FolderKanban} value={metrics.activeProjects} iconColor="text-status-amber" />
          <KpiCard hero className="col-span-2 lg:col-span-2" label="Valoare portofoliu" icon={DollarSign} value={money(metrics.portfolio, 'RON')} />
        </div>

        {/* Master-detail */}
        <div className="enter-up flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-5" style={{ animationDelay: '160ms' }}>

          {/* List */}
          <Card padding="none" className="xl:col-span-4 min-w-0 min-h-0 flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-line/70">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <h2 className="text-pm-eyebrow font-semibold uppercase tracking-wide text-content-muted">Clienți</h2>
                <span className="text-pm-2xs text-content-muted tabular-nums px-1.5 py-0.5 rounded-md bg-surface-tertiary">{filtered.length}</span>
              </div>
              <div className="relative">
                <Search className={filterSearchIconCls} aria-hidden />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Client, contact, email, telefon…" aria-label="Caută client"
                  className={`${filterSearchInputCls} !w-full`}
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {filtered.length === 0 ? (
                <EmptyState icon={Search} title="Niciun client găsit" description="Încearcă alți termeni sau adaugă unul nou." />
              ) : (
                <div className="stagger-in">
                  {filtered.map(c => {
                    const st = statsFor(c.id);
                    const isSelected = c.id === selectedId;
                    return (
                      <div
                        key={c.id} role="button" tabIndex={0}
                        onClick={() => selectClient(c.id)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectClient(c.id); } }}
                        aria-label={`Selectează ${c.name}`}
                        style={{ viewTransitionName: isSelected ? vtName('client', c.id) : undefined }}
                        className={cn(
                          'group relative w-full cursor-pointer border-b border-line/60 px-3.5 py-2.5 text-left transition-all duration-150',
                          isSelected ? 'bg-accent/8 vt-morph' : 'hover:bg-surface-tertiary/40',
                        )}
                      >
                        <span aria-hidden className={cn('absolute left-0 top-0 bottom-0 w-[3px] transition-all', isSelected ? 'bg-accent' : 'bg-transparent group-hover:bg-content-muted/30')} />
                        <div className="flex items-center gap-3">
                          <span className={cn('h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-pm-2xs font-bold', isSelected ? 'bg-accent/15 text-accent' : 'bg-surface-tertiary text-content-secondary')}>
                            {initials(c.name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-pm-sm font-semibold text-content-primary">{c.name}</p>
                            <p className="truncate text-pm-2xs text-content-muted">{c.contact_person || '—'}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            {st.value > 0 && <p className="text-pm-2xs font-semibold tabular-nums text-content-primary">{money(st.value, 'RON')}</p>}
                            <p className="text-pm-2xs text-content-muted tabular-nums">{st.count} {st.count === 1 ? 'proiect' : 'proiecte'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* Detail */}
          <div className="xl:col-span-8 min-w-0 min-h-0 overflow-y-auto flex flex-col gap-5 pr-0.5">
            {!selected ? (
              <Card padding="lg" className="flex flex-col items-center justify-center min-h-[60vh]">
                <EmptyState icon={Users} title="Niciun client selectat" description="Alege un client din listă pentru a-i vedea fișa completă." />
              </Card>
            ) : (
              <div key={selected.id} className="stagger-in contents">
                {/* Identity */}
                <Card padding="lg" tone="elevated" vtName={vtName('client', selected.id)} className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="h-12 w-12 shrink-0 rounded-2xl bg-accent/15 text-accent flex items-center justify-center text-pm-sm font-bold">{initials(selected.name)}</span>
                      <div className="min-w-0">
                        <div className="mb-1"><StatusBadge tone={selStats?.isActive ? 'success' : 'neutral'} label={selStats?.isActive ? 'Activ' : 'Inactiv'} size="xs" /></div>
                        <h2 className="text-pm-xl font-semibold text-content-primary leading-tight truncate">{selected.name}</h2>
                        <p className="mt-0.5 text-pm-sm text-content-muted">{selected.contact_person || '—'}</p>
                      </div>
                    </div>
                    {!isViewer && (
                      <div className="flex items-center gap-1 shrink-0">
                        <IconButton intent="primary" onClick={() => openEdit(selected)} aria-label="Editează clientul"><Pencil aria-hidden /></IconButton>
                        <IconButton intent="danger" onClick={() => handleDelete(selected)} aria-label="Șterge clientul"><Trash2 aria-hidden /></IconButton>
                      </div>
                    )}
                  </div>
                </Card>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {/* Contact */}
                  <Card padding="lg" className="min-w-0">
                    <SectionHeader title="Date de contact" icon={Mail} className="mb-4" />
                    <dl className="space-y-3">
                      <DetailRow icon={Mail} label="Email" value={selected.email} href={selected.email ? `mailto:${selected.email}` : undefined} />
                      <DetailRow icon={Phone} label="Telefon" value={selected.phone} href={selected.phone ? `tel:${selected.phone}` : undefined} />
                      <DetailRow icon={MapPin} label="Adresă" value={[selected.address, selected.city, selected.county].filter(Boolean).join(', ')} />
                    </dl>
                  </Card>

                  {/* Fiscal & banking — data that was collected but never shown before */}
                  <Card padding="lg" className="min-w-0">
                    <SectionHeader title="Date fiscale & bancare" icon={Landmark} className="mb-4" />
                    <dl className="space-y-3">
                      <DetailRow icon={Hash} label="CUI" value={selected.cui} mono />
                      <DetailRow icon={FileText} label="Reg. Com." value={selected.reg_com} mono />
                      <DetailRow icon={Landmark} label="Bancă" value={selected.bank_name} />
                      <DetailRow icon={Landmark} label="IBAN" value={selected.iban} mono />
                    </dl>
                  </Card>
                </div>

                {selected.notes && (
                  <Card padding="lg" className="min-w-0">
                    <SectionHeader title="Note" icon={FileText} className="mb-3" />
                    <p className="text-pm-sm text-content-secondary whitespace-pre-wrap leading-relaxed">{selected.notes}</p>
                  </Card>
                )}

                {/* Projects */}
                <Card padding="lg" className="min-w-0">
                  <SectionHeader
                    title="Proiecte" icon={FolderKanban} className="mb-3"
                    meta={selStats ? `${selStats.count} total · ${money(selStats.value, 'RON')}` : undefined}
                  />
                  {selectedProjects.length === 0 ? (
                    <p className="text-pm-xs text-content-muted">Niciun proiect asociat.</p>
                  ) : (
                    <ul className="-mx-1">
                      {selectedProjects.map(p => (
                        <li key={p.id} className="flex items-center justify-between gap-3 px-1 py-2 border-b border-line/40 last:border-b-0">
                          <span className="text-pm-sm text-content-primary truncate min-w-0">{p.name}</span>
                          <span className="flex items-center gap-3 shrink-0">
                            {projectValue(p) > 0 && <span className="text-pm-xs font-medium tabular-nums text-content-secondary">{money(projectValue(p), 'RON')}</span>}
                            <StatusBadge {...projectStatus(p.status)} size="xs" />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                {/* CRM tools (timeline, scoring, tags, import, communication) */}
                <Card padding="lg" className="min-w-0">
                  <SectionHeader title="Instrumente CRM" icon={Users} className="mb-3" />
                  <ClientsEnhancements clients={clients} />
                </Card>
              </div>
            )}
          </div>
        </div>
      </Page.Body>

      {/* Create / edit client */}
      {dialogOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4" onClick={() => { if (!submitting) setDialogOpen(false); }}>
          <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-line bg-surface-primary shadow-[var(--elevation-4)]" onClick={e => e.stopPropagation()}>
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line/70 bg-surface-primary px-4 py-3">
              <h3 className="text-pm-sm font-semibold text-content-primary">{editId != null ? 'Editează client' : 'Adaugă client'}</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1 rounded-lg text-content-muted hover:bg-surface-tertiary hover:text-content-primary" aria-label="Închide"><XIcon className="h-4 w-4" /></button>
            </header>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={fieldLabelCls}>CUI</label>
                  <div className="mt-1 flex gap-2">
                    <input className={inputCls} value={form.cui} placeholder="ex: RO12345678" onChange={set('cui')} />
                    <Button variant="secondary" size="sm" onClick={anafLookup} disabled={anafLoading || !form.cui.trim()}>
                      {anafLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} ANAF
                    </Button>
                  </div>
                </div>
                <div><label className={fieldLabelCls}>Reg. Com.</label><input className={`${inputCls} mt-1`} value={form.reg_com} placeholder="J40/1234/2020" onChange={set('reg_com')} /></div>
              </div>
              <div><label className={fieldLabelCls}>Nume firmă *</label><input className={`${inputCls} mt-1`} value={form.name} onChange={set('name')} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={fieldLabelCls}>Persoană contact</label><input className={`${inputCls} mt-1`} value={form.contact_person} onChange={set('contact_person')} /></div>
                <div><label className={fieldLabelCls}>Email</label><input type="email" className={`${inputCls} mt-1`} value={form.email} onChange={set('email')} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className={fieldLabelCls}>Telefon</label><input type="tel" className={`${inputCls} mt-1`} value={form.phone} onChange={set('phone')} /></div>
                <div><label className={fieldLabelCls}>Oraș</label><input className={`${inputCls} mt-1`} value={form.city} onChange={set('city')} /></div>
                <div><label className={fieldLabelCls}>Județ</label><input className={`${inputCls} mt-1`} value={form.county} onChange={set('county')} /></div>
              </div>
              <div><label className={fieldLabelCls}>Adresă</label><input className={`${inputCls} mt-1`} value={form.address} onChange={set('address')} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={fieldLabelCls}>Bancă</label><input className={`${inputCls} mt-1`} value={form.bank_name} onChange={set('bank_name')} /></div>
                <div><label className={fieldLabelCls}>IBAN</label><input className={`${inputCls} mt-1`} value={form.iban} onChange={set('iban')} /></div>
              </div>
              <div><label className={fieldLabelCls}>Note</label><textarea rows={2} className={`${inputCls} mt-1 h-auto py-2 resize-none`} value={form.notes} onChange={set('notes')} /></div>
            </div>
            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-line/70 bg-surface-primary px-4 py-3">
              <Button variant="secondary" size="sm" onClick={() => setDialogOpen(false)} disabled={submitting}>Anulează</Button>
              <Button size="sm" onClick={save} disabled={submitting}>{submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Salvează</Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

function DetailRow({ icon: Icon, label, value, href, mono }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value?: string | null; href?: string; mono?: boolean;
}) {
  const v = (value || '').trim();
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-content-muted shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0 flex-1">
        <dt className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">{label}</dt>
        <dd className={cn('text-pm-sm mt-0.5 break-words', v ? 'text-content-primary' : 'text-content-muted', mono && v && 'font-mono text-pm-xs')}>
          {v ? (href ? <a href={href} className="hover:text-accent hover:underline">{v}</a> : v) : '—'}
        </dd>
      </div>
    </div>
  );
}
