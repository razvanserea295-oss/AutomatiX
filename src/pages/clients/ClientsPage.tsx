import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Users, Briefcase, DollarSign, X, Search as SearchIcon, Building2 } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { SkeletonTable, Skeleton } from '@/components/Skeleton';
import type { User, Project } from '@/core/types';
import { useProjectStore } from '@/store/projectStore';
import { useClientStore } from '@/store/clientStore';
import AnafLookupButton from '@/components/AnafLookupButton';
import { useFormModal } from '@/hooks/useFormModal';

import ClientsEnhancements from '@/pages/clients/ClientsEnhancements';

import FilterBar from '@/components/ui/FilterBar';
import TableFiller from '@/components/ui/TableFiller';
import { useMoney } from '@/store/settingsStore';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import SortableTh from '@/components/ui/SortableTh';
import { useSort } from '@/hooks/useSort';
import type { Client } from '@/core/types';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Page from '@/components/ui/Page';
import { ErrorState, HeroHeader, GlassCard, MetricValue } from '@/components/ui';

interface ClientsPageProps {
  user: User | null;
}

export default function ClientsPage(_props: ClientsPageProps) {
  const clients = useClientStore(s => s.clients);
  const loading = useClientStore(s => s.loading);
  const fetchClients = useClientStore(s => s.fetchClients);
  const createClientStore = useClientStore(s => s.createClient);
  const updateClientStore = useClientStore(s => s.updateClient);
  const deleteClientStore = useClientStore(s => s.deleteClient);
  const error: string | null = null;
  const { isOpen, editingItem, openModal, closeModal, isEditing } = useFormModal();

  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const money = useMoney();

  useEffect(() => {
    void fetchClients();
    void fetchProjects();
  }, [fetchClients, fetchProjects]);

  
  
  
  const activeProjects = useMemo(() => projects.filter(p => p.status !== 'finalizat' && p.status !== 'anulat'), [projects]);
  const activeProjectCount = activeProjects.length;
  const totalRevenue = useMemo(() => activeProjects.reduce((s, p) => s + (p.budget || 0), 0), [activeProjects]);
  
  const activeClientCount = useMemo(() => new Set(activeProjects.map(p => p.client_id)).size, [activeProjects]);
  const projectsByClient = useMemo(() => {
    const map = new Map<number, Project[]>();
    projects.forEach(p => { const arr = map.get(p.client_id) || []; arr.push(p); map.set(p.client_id, arr); });
    return map;
  }, [projects]);

  type ClientSortKey = 'name' | 'contact_person' | 'email' | 'phone';
  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.contact_person.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const { sorted: sortedClients, sort, toggle } = useSort<Client, ClientSortKey>(
    filteredClients,
    (row, key) => row[key] ?? '',
    { key: 'name', dir: 'asc' },
  );

  const selectedClientData = useMemo(() => {
    if (selectedClient === null) return null;
    return clients.find(c => c.id === selectedClient) || null;
  }, [clients, selectedClient]);

  const handleSubmit = async (data: Record<string, any>) => {
    if (isEditing) {
      await updateClientStore(editingItem.id, data);
    } else {
      await createClientStore(data);
    }
  };

  const handleDelete = async (id: number) => {
    const linkedProjects = projects.filter(p => p.client_id === id).length;
    const msg = linkedProjects > 0
      ? `Sigur Doriți sa ștergeți acest client? Atenție: are ${linkedProjects} proiect(e) asociat(e) ce vor rămâne fără client.`
      : 'Sigur Doriți sa ștergeți acest client?';
    if (!(await confirmDialog({ title: 'Șterge clientul?', body: msg, danger: true }))) return;
    try {
      await deleteClientStore(id);
      toast.success('Client sters cu succes');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la ștergere');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-surface-page">
        <div className="h-11 border-b border-line px-4 flex items-center">
          <Skeleton w="w-32" h="h-4" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 border-b border-line">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`bg-surface-secondary p-3 space-y-2 ${i < 2 ? 'border-r border-line' : ''}`}>
                <Skeleton w="w-20" h="h-2.5" />
                <Skeleton w="w-12" h="h-5" />
              </div>
            ))}
          </div>
          <div className="border-b border-line px-4 py-2">
            <Skeleton w="w-full" h="h-9" />
          </div>
          <div className="bg-surface-secondary overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <th key={i} className="px-4 py-2.5"><Skeleton w="w-20" h="h-2.5" /></th>
                  ))}
                </tr>
              </thead>
              <SkeletonTable rows={8} cols={5} />
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <ErrorState title="Eroare la încărcarea clienților" description={error} />
      </div>
    );
  }

  return (
    <Page className="mod-shell">
      <div className="mod-canvas density-compact">

        {}
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Vânzări"
          icon={Users}
          title="Clienți"
          subtitle="Portofoliul de clienți, contactele și proiectele asociate"
          actions={
            <Button size="sm" onClick={() => openModal()} aria-label="Adaugă client">
              <Plus className="h-3.5 w-3.5" aria-hidden /> Adaugă client
            </Button>
          }
        />

        {}
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={Users}      label="Total clienți"    value={clients.length} />
          <KpiMini icon={Building2}  label="Clienți activi"   value={activeClientCount} />
          <KpiMini icon={Briefcase}  label="Proiecte active"  value={activeProjectCount} />
          <KpiMini icon={DollarSign} label="Valoare proiecte" value={totalRevenue} format={(n) => money(n, 'RON')} />
        </div>

        {}
        <div className="mod-bento">

          {}
          <GlassCard size="regular" className="enter-up !p-0 overflow-hidden" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center gap-3 px-5 pt-5 pb-3 flex-wrap">
              <p className="text-pm-xs text-content-muted shrink-0">
                {sortedClients.length} {sortedClients.length === 1 ? 'client' : 'clienți'}{search ? ` găsiți pentru „${search}"` : ''}
              </p>
              <div className="flex-1" />
              <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Caută client, contact, email..." />
            </div>
            <div
              style={{ ['--table-row-height' as never]: '40px' }}
              className="overflow-auto table-fill min-h-[52vh] max-h-[72vh] border-t border-line/40 px-2"
            >
              <table className="table-density w-full text-left table-fixed min-w-[800px]">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[22%]" />
              <col className="w-[24%]" />
              <col className="w-[16%]" />
              <col className="w-20" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-surface-secondary shadow-[inset_0_-1px_0_var(--color-border)]">
              <tr>
                <SortableTh sortKey="name"           sort={sort} onSort={toggle}>Nume</SortableTh>
                <SortableTh sortKey="contact_person" sort={sort} onSort={toggle}>Persoană contact</SortableTh>
                <SortableTh sortKey="email"          sort={sort} onSort={toggle}>Email</SortableTh>
                <SortableTh sortKey="phone"          sort={sort} onSort={toggle}>Telefon</SortableTh>
                <th className="sticky right-0 z-20 bg-surface-secondary border-l border-line px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {sortedClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-0">
                    {search ? (
                      <EmptyState
                        icon={SearchIcon}
                        title="Niciun client găsit"
                        body={`Filtrul "${search}" nu se potrivește cu niciun client. Încearcă alt termen.`}
                      />
                    ) : (
                      <EmptyState
                        icon={Users}
                        title="Nu există clienți încă"
                        body="Adaugă primul client pentru a începe să creezi proiecte și contracte."
                        actionLabel="Adaugă client"
                        onAction={() => openModal()}
                      />
                    )}
                  </td>
                </tr>
              ) : (
                sortedClients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => setSelectedClient(client.id === selectedClient ? null : client.id)}
                    className={`group border-b border-line cursor-pointer transition-colors ${client.id === selectedClient ? 'bg-accent/5' : 'hover:bg-surface-tertiary/30'}`}
                  >
                    <td className="px-3 py-2.5 text-pm-sm font-medium text-content-primary truncate" title={client.name}>{client.name}</td>
                    <td className="px-3 py-2.5 text-pm-xs text-content-secondary truncate" title={client.contact_person}>{client.contact_person}</td>
                    <td className="px-3 py-2.5 text-pm-xs text-content-secondary truncate" title={client.email}>{client.email}</td>
                    <td className="px-3 py-2.5 text-pm-xs text-content-secondary font-mono truncate" title={client.phone}>{client.phone}</td>
                    <td className={`sticky right-0 z-[5] border-l border-line px-3 py-2.5 ${client.id === selectedClient ? 'bg-surface-secondary' : 'bg-surface-secondary group-hover:bg-surface-tertiary'}`}>
                      <div className="flex items-center gap-1 justify-end">
                        <IconButton
                          intent="primary"
                          onClick={(e) => { e.stopPropagation(); openModal(client); }}
                          aria-label={`Editează ${client.name}`}
                        >
                          <Pencil aria-hidden />
                        </IconButton>
                        <IconButton
                          intent="danger"
                          onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                          aria-label={`Șterge ${client.name}`}
                        >
                          <Trash2 aria-hidden />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              <TableFiller cols={5} count={Math.max(0, 18 - sortedClients.length)} />
            </tbody>
              </table>
            </div>
          </GlassCard>

          {}
          <div className="mod-aside enter-up" style={{ animationDelay: '240ms' }}>
            <GlassCard size="regular" className="!p-0 overflow-hidden">
            {!selectedClientData ? (
              <div className="flex flex-col items-center justify-center text-center py-20">
                <Users className="h-8 w-8 text-content-muted/40 mb-2" />
                <p className="text-pm-xs text-content-muted">Selectează un client pentru detalii</p>
                <p className="text-pm-2xs text-content-muted/70 mt-1">din tabelul alăturat</p>
              </div>
            ) : (
              <div className="max-h-[78vh] overflow-y-auto">

            {}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-line">
              <h3 className="text-pm-sm font-semibold text-content-primary truncate flex-1 min-w-0">{selectedClientData.name}</h3>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openModal(selectedClientData)}
                  title="Editează client"
                  aria-label={`Editează ${selectedClientData.name}`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-pm-2xs font-semibold text-accent hover:bg-accent/10 transition-colors"
                >
                  <Pencil className="h-3 w-3" aria-hidden /> Editează
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedClientData.id)}
                  title="Șterge client"
                  aria-label={`Șterge ${selectedClientData.name}`}
                  className="p-1 rounded text-content-muted hover:bg-status-red/10 hover:text-status-red transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  title="Închide"
                  className="p-1 text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {}
            <div className="px-4 py-3 border-b border-line space-y-2">
              <div>
                <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Contact</p>
                <p className="text-pm-xs text-content-secondary mt-0.5">{selectedClientData.contact_person}</p>
              </div>
              <div>
                <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Email</p>
                <p className="text-pm-xs text-content-secondary mt-0.5">{selectedClientData.email}</p>
              </div>
              <div>
                <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Telefon</p>
                <p className="text-pm-xs text-content-secondary font-mono mt-0.5">{selectedClientData.phone}</p>
              </div>
              {selectedClientData.address && (
                <div>
                  <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Adresa</p>
                  <p className="text-pm-xs text-content-secondary mt-0.5">{selectedClientData.address}</p>
                </div>
              )}
            </div>

            {}
            <div className="px-4 py-3">
              <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1.5">
                Proiecte ({(projectsByClient.get(selectedClientData.id) || []).length})
              </p>
              {(projectsByClient.get(selectedClientData.id) || []).length === 0 ? (
                <p className="text-pm-xs text-content-muted">Niciun proiect asociat.</p>
              ) : (
                <div>
                  {(projectsByClient.get(selectedClientData.id) || []).map((p, idx, arr) => (
                    <div key={p.id} className={`px-2.5 py-1.5 ${idx < arr.length - 1 ? 'border-b border-line/40' : ''}`}>
                      <p className="text-pm-xs font-medium text-content-primary">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-pm-2xs text-content-muted capitalize">{p.status}</span>
                        {(() => { const b = p.estimated_value ?? p.budget ?? 0; return b > 0 ? <span className="text-pm-2xs text-content-muted">{money(b, 'RON')}</span> : null; })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
              </div>
            )}
            </GlassCard>
          </div>
        </div>

        {}
        <ClientsEnhancements clients={clients} />
      </div>

      {isOpen && (
        <ClientFormModal
          initialData={editingItem || {}}
          isEditing={isEditing}
          onClose={closeModal}
          onSubmit={async (data) => { await handleSubmit(data); closeModal(); }}
        />
      )}
    </Page>
  );
}




function KpiMini({ icon: Icon, label, value, warn, format }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; warn?: boolean; format?: (n: number) => string;
}) {
  return (
    <GlassCard size="compact" className="flex items-center gap-3.5 !p-5">
      <span className="h-11 w-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted truncate">{label}</p>
        <MetricValue value={value} size="display" warn={warn} format={format} className="mt-0.5 block" />
      </div>
    </GlassCard>
  );
}

function ClientFormModal({ initialData, isEditing, onClose, onSubmit }: {
  initialData: Record<string, any>;
  isEditing: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => Promise<void>;
}) {
  const [data, setData] = useState({
    name: initialData.name || '',
    cui: initialData.cui || '',
    reg_com: initialData.reg_com || '',
    contact_person: initialData.contact_person || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    address: initialData.address || '',
    city: initialData.city || '',
    county: initialData.county || '',
    bank_name: initialData.bank_name || '',
    iban: initialData.iban || '',
    notes: initialData.notes || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!data.name?.trim()) { toast.error('Nume obligatoriu'); return; }
    setSubmitting(true);
    try { await onSubmit(data); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-primary border border-line w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface-primary border-b border-line p-4 flex items-center justify-between">
          <h3 className="text-pm-sm font-semibold text-content-primary">{isEditing ? 'Editează client' : 'Adaugă client'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-tertiary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">CUI</label>
              <div className="flex gap-1">
                <input value={data.cui} onChange={e => setData({ ...data, cui: e.target.value })}
                  placeholder="ex: 12345678 sau RO12345678"
                  className="flex-1 input" />
                <AnafLookupButton cui={data.cui} onResult={info => {
                  setData(prev => ({
                    ...prev,
                    name: info.denumire || prev.name,
                    cui: info.cui,
                    reg_com: info.reg_com || prev.reg_com,
                    address: info.adresa || prev.address,
                    city: info.oras || prev.city,
                    county: info.judet || prev.county,
                    phone: info.telefon || prev.phone,
                  }));
                }} />
              </div>
            </div>
            <div>
              <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">Reg. Com</label>
              <input value={data.reg_com} onChange={e => setData({ ...data, reg_com: e.target.value })} className="input" placeholder="J40/1234/2020" />
            </div>
            <div className="col-span-2">
              <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">Nume firmă *</label>
              <input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} className="input" />
            </div>
            <div>
              <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">Persoană contact</label>
              <input value={data.contact_person} onChange={e => setData({ ...data, contact_person: e.target.value })} className="input" />
            </div>
            <div>
              <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">Email</label>
              <input type="email" value={data.email} onChange={e => setData({ ...data, email: e.target.value })} className="input" />
            </div>
            <div>
              <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">Telefon</label>
              <input type="tel" value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} className="input" />
            </div>
            <div>
              <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">Oraș</label>
              <input value={data.city} onChange={e => setData({ ...data, city: e.target.value })} className="input" />
            </div>
            <div>
              <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">Județ</label>
              <input value={data.county} onChange={e => setData({ ...data, county: e.target.value })} className="input" />
            </div>
            <div className="col-span-2">
              <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">Adresă</label>
              <input value={data.address} onChange={e => setData({ ...data, address: e.target.value })} className="input" />
            </div>
            <div>
              <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">Bancă</label>
              <input value={data.bank_name} onChange={e => setData({ ...data, bank_name: e.target.value })} className="input" />
            </div>
            <div>
              <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">IBAN</label>
              <input value={data.iban} onChange={e => setData({ ...data, iban: e.target.value })} className="input" />
            </div>
            <div className="col-span-2">
              <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">Note</label>
              <textarea value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} rows={2} className="input resize-none" />
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-surface-primary border-t border-line p-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-pm-xs border border-line hover:bg-surface-tertiary">
            Anulează
          </button>
          <button onClick={submit} disabled={submitting}
            className="px-4 py-1.5 text-pm-xs bg-accent text-surface-primary font-semibold hover:bg-accent/90 disabled:opacity-50">
            {submitting ? 'Se salvează...' : isEditing ? 'Actualizează' : 'Adaugă'}
          </button>
        </div>
      </div>
      <style>{`
        .input { width: 100%; border: 1px solid var(--color-border);
                 background-color: var(--color-bg-primary); padding: 0.375rem 0.625rem;
                 font-size: 0.75rem; color: var(--color-text-primary); }
        .input:focus { outline: none; box-shadow: 0 0 0 1px var(--color-accent); }
      `}</style>
    </div>
  );
}
