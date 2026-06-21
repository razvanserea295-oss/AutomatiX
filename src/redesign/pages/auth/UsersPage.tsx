




























import { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Pencil, Trash2, Plus, Shield, Loader2, LayoutDashboard, Users, UserCheck, KeyRound, X } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import SaveButton from '@/components/ui/SaveButton';
import { useSaveAction } from '@/hooks/useSaveAction';
import type { User, DashboardWidgetId } from '@/core/types';
import { DASHBOARD_WIDGETS, parseDashboardConfig } from '@/core/types';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
import { useAuthStore } from '@/store/authStore';
import { confirmDialog } from '@/components/ConfirmDialog';

import Page from '@/redesign/ui/Page';
import KpiCard from '@/redesign/ui/KpiCard';
import FilterBar from '@/redesign/ui/FilterBar';
import StatusBadge from '@/redesign/ui/StatusBadge';
import IconButton from '@/redesign/ui/IconButton';
import Button from '@/redesign/ui/Button';
import { GlassCard, EmptyState } from '@/redesign/ui';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';

interface Role { id: number; name: string; description: string; }

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', manager: 'Manager', user: 'Utilizator', viewer: 'Vizitator',
  marketer: 'Marketer', proiectant: 'Proiectant', contabil: 'Contabil', hala: 'Sef Hala',
};

const ROLE_COLORS: Record<string, string> = {
  admin:      '[background:var(--role-admin-bg)] [color:var(--role-admin-text)]',
  manager:    '[background:var(--role-manager-bg)] [color:var(--role-manager-text)]',
  marketer:   '[background:var(--role-marketer-bg)] [color:var(--role-marketer-text)]',
  proiectant: '[background:var(--role-proiectant-bg)] [color:var(--role-proiectant-text)]',
  contabil:   '[background:var(--role-contabil-bg)] [color:var(--role-contabil-text)]',
  hala:       '[background:var(--role-hala-bg)] [color:var(--role-hala-text)]',
};



const ALL_PAGES: { id: string; label: string; group: string }[] = [
  
  { id: 'tasks',           label: 'Task-uri',          group: 'Personal' },
  { id: 'calendar',        label: 'Calendar',          group: 'Personal' },
  { id: 'deplasari',       label: 'Deplasări',         group: 'Personal' },

  
  { id: 'sales-hub',       label: 'Sales Hub',         group: 'Vanzari' },
  { id: 'quotations',      label: 'Oferte',            group: 'Vanzari' },
  { id: 'clients',         label: 'Clienți',           group: 'Vanzari' },

  
  { id: 'projects',        label: 'Proiecte',          group: 'Proiecte' },
  { id: 'contracts',       label: 'Contracte',         group: 'Proiecte' },

  
  { id: 'fisa-proiectant', label: 'Fișa Proiectant',   group: 'Proiectare' },
  { id: 'parts-tree',      label: 'Arbore Piese',      group: 'Proiectare' },
  { id: 'libraries',       label: 'Biblioteci Piese',  group: 'Proiectare' },

  
  { id: 'production',      label: 'Producție (Kanban)', group: 'Productie' },
  { id: 'stations',        label: 'Stații',            group: 'Productie' },
  { id: 'maintenance',     label: 'Service & Mentenanță', group: 'Productie' },

  
  { id: 'warehouse',       label: 'Depozit',           group: 'Aprovizionare' },
  { id: 'materials',       label: 'Inventar materiale', group: 'Aprovizionare' },
  { id: 'suppliers',       label: 'Furnizori',         group: 'Aprovizionare' },
  { id: 'purchase-orders', label: 'Achiziții',         group: 'Aprovizionare' },

  
  { id: 'finance',         label: 'Financiar',         group: 'Financiar' },
  { id: 'documents',       label: 'Documente',         group: 'Financiar' },
  { id: 'reports',         label: 'Rapoarte',          group: 'Financiar' },

  
  { id: 'tutorial',        label: 'Tutorial',          group: 'Instrumente' },
  { id: 'email',           label: 'Email',             group: 'Instrumente' },
  { id: 'chat',            label: 'Mesaje (Chat)',     group: 'Instrumente' },
  { id: 'alerts',          label: 'Alerte',            group: 'Instrumente' },

  
  { id: 'manager-control', label: 'Birou control',     group: 'Sistem' },
];

const ROLE_AVATAR_BG: Record<string, string> = {
  admin:      '[background:var(--role-admin-solid)]',
  manager:    '[background:var(--role-manager-solid)]',
  marketer:   '[background:var(--role-marketer-solid)]',
  proiectant: '[background:var(--role-proiectant-solid)]',
  contabil:   '[background:var(--role-contabil-solid)]',
  hala:       '[background:var(--role-hala-solid)]',
};

function getInitials(name: string): string {
  return name ? name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') : '?';
}

export default function UsersPage(_props: { user: User | null }) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<User | null>(null);
  const [customPages, setCustomPages] = useState<Record<string, string>>({});
  const [dashboardWidgets, setDashboardWidgets] = useState<Record<DashboardWidgetId, boolean>>(
    () => parseDashboardConfig(null),
  );
  
  
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const { isOpen, editingItem, openModal, closeModal, isEditing } = useFormModal();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([apiCommand<User[]>('get_users'), apiCommand<Role[]>('get_roles')]);
      setUsers(u); setRoles(r);
    } catch { }
    finally { setLoading(false); }
  }

  const selectUser = (u: User) => {
    setSelected(u);
    try {
      const parsed = u.custom_pages ? JSON.parse(u.custom_pages) : {};
      if (Array.isArray(parsed)) {
        
        const map: Record<string, string> = {};
        for (const p of parsed) map[p] = 'full';
        setCustomPages(map);
      } else {
        setCustomPages(typeof parsed === 'object' && parsed ? parsed : {});
      }
    } catch { setCustomPages({}); }
    
    
    setDashboardWidgets(parseDashboardConfig(u.dashboard_config));
  };

  
  
  
  const pickUser = (u: User) => {
    startMorphTransition(
      () => flushSync(() => selectUser(u)),
      { dir: 'forward' },
    );
  };

  const toggleDashboardWidget = (id: DashboardWidgetId, visible: boolean) => {
    setDashboardWidgets(prev => ({ ...prev, [id]: visible }));
  };

  const setAllDashboardWidgets = (visible: boolean) => {
    setDashboardWidgets(parseDashboardConfig(JSON.stringify(
      Object.fromEntries(DASHBOARD_WIDGETS.map(w => [w.id, visible])),
    )));
  };

  const setPageAccess = (pageId: string, level: string) => {
    setCustomPages(prev => {
      const next = { ...prev };
      if (level === 'inherit') {
        
        delete next[pageId];
      } else {
        
        
        
        next[pageId] = level;
      }
      return next;
    });
  };

  const doSavePages = useCallback(async () => {
    if (!selected) return;
    
    await apiCommand('update_user_pages', { user_id: selected.id, pages: customPages });
    const [updatedUsers] = await Promise.all([
      apiCommand<User[]>('get_users'),
      apiCommand<Role[]>('get_roles').then(setRoles).catch(() => {}),
    ]);
    setUsers(updatedUsers);
    
    const refreshed = updatedUsers.find(u => u.id === selected.id);
    if (refreshed) selectUser(refreshed);
    
    const currentUser = useAuthStore.getState().user;
    if (currentUser && selected.id === currentUser.id) {
      const updatedSelf = updatedUsers.find(u => u.id === currentUser.id);
      if (updatedSelf) {
        useAuthStore.getState().setUser(updatedSelf);
      }
    }
  }, [selected, customPages]);

  const { save: savePages, saveState } = useSaveAction(doSavePages, {
    successMessage: 'Permisiuni salvate cu succes',
    errorMessage: 'Eroare la salvarea permisiunilor',
  });

  const doSaveDashboardConfig = useCallback(async () => {
    if (!selected) return;
    await apiCommand('update_user_dashboard_config', { user_id: selected.id, config: dashboardWidgets });
    const updated = await apiCommand<User[]>('get_users');
    setUsers(updated);
    const refreshed = updated.find(u => u.id === selected.id);
    if (refreshed) selectUser(refreshed);
    
    
    const currentUser = useAuthStore.getState().user;
    if (currentUser && selected.id === currentUser.id) {
      const updatedSelf = updated.find(u => u.id === currentUser.id);
      if (updatedSelf) useAuthStore.getState().setUser(updatedSelf);
    }
  }, [selected, dashboardWidgets]);

  const { save: saveDashboardConfig, saveState: dashSaveState } = useSaveAction(doSaveDashboardConfig, {
    successMessage: 'Dashboard configurat',
    errorMessage: 'Eroare la salvarea dashboardului',
  });

  const formFields: FormField[] = [
    { name: 'username', label: 'Username', type: 'text', required: true, placeholder: 'username' },
    { name: 'full_name', label: 'Nume complet', type: 'text', required: true },
    { name: 'job_title', label: 'Funcție / titlu', type: 'text', required: false,
      placeholder: 'ex: Inginer proiectant senior, Director vânzări' },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'password', label: 'Parola', type: 'text', required: !isEditing, placeholder: isEditing ? 'Gol = păstrează' : 'Parola' },
    { name: 'role_id', label: 'Rol', type: 'select', required: true,
      options: roles.filter(r => !r.description?.startsWith('[DEZACTIVAT]')).map(r => ({ value: r.id, label: ROLE_LABELS[r.name] || r.name })) },
  ];

  const handleSubmit = async (data: Record<string, unknown>) => {
    const payload: Record<string, unknown> = { ...data, role_id: Number(data.role_id) };
    if (isEditing && !payload.password) delete payload.password;
    if (isEditing) await apiCommand('update_user', { id: editingItem.id, ...payload, active: true });
    else await apiCommand('create_user', { ...payload, active: true });
    
    setLoading(true);
    try {
      const [u, r] = await Promise.all([apiCommand<User[]>('get_users'), apiCommand<Role[]>('get_roles')]);
      setUsers(u); setRoles(r);
      if (isEditing && editingItem?.id) {
        const refreshed = u.find(usr => usr.id === editingItem.id);
        if (refreshed) selectUser(refreshed);
      }
    } catch { }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ title: 'Șterge utilizatorul?', danger: true }))) return;
    await apiCommand('delete_user', { id }); await fetchData();
    if (selected?.id === id) setSelected(null);
  };

  if (loading) return <div className="flex flex-1 items-center justify-center bg-surface-page"><Loader2 className="h-6 w-6 animate-spin text-content-muted" /></div>;

  
  const q = search.trim().toLowerCase();
  const visibleUsers = users.filter(u => {
    if (roleFilter && u.role_name !== roleFilter) return false;
    if (!q) return true;
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.job_title || '').toLowerCase().includes(q)
    );
  });

  const visibleWidgetCount = Object.values(dashboardWidgets).filter(Boolean).length;

  return (
    <Page fit>
      <Page.Body fit padding="comfortable" maxWidth="full">

        {


}
        <div className="enter-up shrink-0 pb-4 border-b border-line/60" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-accent" aria-hidden />
              </span>
              <div className="min-w-0">
                {/* Eyebrow removed — breadcrumb already conveys the workspace. */}
                <h1 className="text-pm-2xl font-semibold text-content-primary leading-tight truncate">Utilizatori</h1>
                <p className="text-pm-sm text-content-muted mt-0.5">Conturi, roluri și acces pe pagini</p>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:ml-auto">
              <div className="hidden sm:block">
                <FilterBar
                  search={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="Caută nume, username, email..."
                  filters={[{
                    key: 'role',
                    label: 'Toate rolurile',
                    value: roleFilter,
                    onChange: setRoleFilter,
                    options: roles
                      .filter(r => !r.description?.startsWith('[DEZACTIVAT]'))
                      .map(r => ({ value: r.name, label: ROLE_LABELS[r.name] || r.name })),
                  }]}
                  clearable
                />
              </div>
              <Button variant="primary" onClick={() => openModal()} className="shrink-0">
                <Plus className="h-4 w-4" /> Adaugă utilizator
              </Button>
            </div>
          </div>
          {}
          <div className="sm:hidden mt-3">
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Caută utilizator..."
              filters={[{
                key: 'role',
                label: 'Toate rolurile',
                value: roleFilter,
                onChange: setRoleFilter,
                options: roles
                  .filter(r => !r.description?.startsWith('[DEZACTIVAT]'))
                  .map(r => ({ value: r.name, label: ROLE_LABELS[r.name] || r.name })),
              }]}
              clearable
            />
          </div>
        </div>

        {

}
        <div className="enter-up shrink-0" style={{ animationDelay: '70ms' }}>
          <Page.Kpis cols={4}>
            <KpiCard label="Total utilizatori" value={users.length}                                       icon={Users}     iconColor="text-accent" />
            <KpiCard label="Admini"            value={users.filter(u => u.role_name === 'admin').length}  icon={Shield}    iconColor="text-status-red" />
            <KpiCard label="Manageri"          value={users.filter(u => u.role_name === 'manager').length} icon={UserCheck} iconColor="text-status-blue" />
            <KpiCard label="Roluri"            value={roles.length}                                       icon={KeyRound}  iconColor="text-status-teal" />
          </Page.Kpis>
        </div>

        {


}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 min-h-0">

          {
}
          <aside className="xl:col-span-4 enter-up min-h-0 flex" style={{ animationDelay: '140ms' }}>
            <GlassCard size="regular" className="!p-0 overflow-hidden flex flex-col min-h-0 w-full">
              <div className="shrink-0 px-4 py-3 border-b border-line/70 flex items-center justify-between">
                <h2 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">
                  {visibleUsers.length} {visibleUsers.length === 1 ? 'Utilizator' : 'Utilizatori'}
                </h2>
                {(q || roleFilter) && (
                  <span className="text-pm-2xs text-content-muted">din {users.length}</span>
                )}
              </div>
              <div key={`${q}|${roleFilter}`} className="flex-1 min-h-0 overflow-y-auto stagger-in">
                {visibleUsers.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Niciun utilizator găsit"
                    description="Ajustează căutarea sau filtrul de rol."
                  />
                ) : (
                  visibleUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => pickUser(u)}
                      style={{ viewTransitionName: selected?.id === u.id ? vtName('user', u.id) : undefined }}
                      className={`group w-full text-left px-4 py-3 border-b border-line/60 last:border-b-0 flex items-center gap-3 hover:bg-surface-tertiary/40 active:scale-[0.99] transition-smooth duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-inset ${selected?.id === u.id ? 'border-l-2 border-l-accent bg-accent/5 vt-morph' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-pm-2xs font-bold text-surface-primary shrink-0 ${ROLE_AVATAR_BG[u.role_name] || '[background:var(--role-hala-solid)]'}`}>
                        {getInitials(u.full_name || u.username)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-pm-base font-medium text-content-primary truncate">{u.full_name || u.username}</p>
                        {u.job_title && (
                          <p className="text-pm-2xs text-accent truncate font-medium" title={u.job_title}>{u.job_title}</p>
                        )}
                        <p className="text-pm-2xs text-content-muted truncate">{u.email}</p>
                      </div>
                      <span className={`text-pm-2xs px-2 py-0.5 rounded-lg shrink-0 ${ROLE_COLORS[u.role_name] || 'bg-surface-tertiary text-content-secondary'}`}>
                        {ROLE_LABELS[u.role_name] || u.role_name}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </GlassCard>
          </aside>

          {
}
          <section className="xl:col-span-8 enter-up min-w-0 min-h-0 overflow-y-auto" style={{ animationDelay: '200ms' }}>
            {!selected ? (
              <GlassCard size="regular" className="!p-0 overflow-hidden">
                <div className="flex flex-col items-center justify-center text-center py-24 px-6">
                  <span className="h-14 w-14 rounded-2xl bg-accent-muted/60 flex items-center justify-center mb-3">
                    <Shield className="h-7 w-7 text-content-muted/60" aria-hidden />
                  </span>
                  <p className="text-pm-md font-semibold text-content-secondary">Selectează un utilizator</p>
                  <p className="text-pm-xs text-content-muted mt-1">din lista alăturată pentru a edita acces și dashboard</p>
                </div>
              </GlassCard>
            ) : (
              <div className="space-y-4">

                {
}
                <GlassCard size="regular" className="!p-0 overflow-hidden vt-morph" vtName={vtName('user', selected.id)}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-pm-md font-bold text-surface-primary shrink-0 ${ROLE_AVATAR_BG[selected.role_name] || '[background:var(--role-hala-solid)]'}`}>
                        {getInitials(selected.full_name || selected.username)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-pm-lg font-semibold text-content-primary truncate">{selected.full_name}</h3>
                        {selected.job_title && (
                          <p className="text-pm-xs text-accent font-medium truncate">{selected.job_title}</p>
                        )}
                        <p className="text-pm-sm text-content-muted truncate">@{selected.username} — {selected.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-pm-2xs px-2 py-0.5 rounded-lg ${ROLE_COLORS[selected.role_name] || 'bg-surface-tertiary text-content-secondary'}`}>
                            {ROLE_LABELS[selected.role_name] || selected.role_name}
                          </span>
                          <StatusBadge tone={selected.active ? 'success' : 'neutral'} label={selected.active ? 'Activ' : 'Inactiv'} size="xs" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-start">
                      <Button variant="secondary" size="sm" onClick={() => openModal(selected)}>
                        <Pencil className="h-3.5 w-3.5" /> Editează
                      </Button>
                      <IconButton intent="danger" onClick={() => handleDelete(selected.id)} title="Șterge utilizator" aria-label={`Șterge ${selected.full_name || selected.username}`}>
                        <Trash2 aria-hidden />
                      </IconButton>
                      <IconButton intent="default" onClick={() => startMorphTransition(() => flushSync(() => setSelected(null)), { dir: 'back' })} title="Închide" aria-label="Închide">
                        <X aria-hidden />
                      </IconButton>
                    </div>
                  </div>
                  <div className="px-6 py-3 border-t border-line/70 bg-surface-secondary/40">
                    <p className="text-pm-xs text-content-muted">Rolul determina ce pagini vede implicit. Folosește panourile de mai jos pentru a adăuga/scoate pagini individuale și a configura dashboardul.</p>
                  </div>
                </GlassCard>

                {


}
                <div key={selected.id} className="grid grid-cols-1 xl:grid-cols-12 gap-5 enter-up">

                  {}
                  <GlassCard size="regular" className="xl:col-span-7 !p-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line/70">
                      <h4 className="text-pm-sm font-semibold uppercase tracking-wide text-content-muted flex items-center gap-2 min-w-0 truncate">
                        <Shield className="h-4 w-4 text-accent shrink-0" /> Acces pagini (override)
                      </h4>
                      <SaveButton onClick={savePages} state={saveState} label="Salvează permisiuni" />
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-pm-sm text-content-muted mb-3">
                        Bifeaza paginile la care userul are acces. Daca nicio pagina nu e bifata, se folosesc setarile implicite ale rolului.
                      </p>

                      {}
                      {['Personal', 'Vanzari', 'Proiecte', 'Proiectare', 'Productie', 'Aprovizionare', 'Financiar', 'Instrumente', 'Sistem'].map(group => {
                        const groupPages = ALL_PAGES.filter(p => p.group === group);
                        return (
                          <div key={group} className="border-b border-line last:border-b-0 pb-3 mb-3 last:mb-0 last:pb-0">
                            <p className="text-pm-2xs font-extrabold uppercase tracking-[0.2em] text-content-muted py-1 mb-2">{group}</p>
                            <div>
                              {groupPages.map(page => {
                                
                                
                                
                                
                                const stored = customPages[page.id];
                                const level = stored === undefined ? 'inherit' : stored;
                                return (
                                  <div key={page.id} className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg border-b border-line/30 last:border-b-0 hover:bg-surface-tertiary/30 transition-smooth duration-150">
                                    <span className="text-pm-sm text-content-primary min-w-0 truncate">{page.label}</span>
                                    <select value={level} onChange={e => setPageAccess(page.id, e.target.value)}
                                      className={`shrink-0 text-pm-sm border px-2 py-1 rounded-lg transition-smooth duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                                        level === 'full'   ? 'border-status-green/40 bg-status-green/10 text-status-green' :
                                        level === 'viewer' ? 'border-status-amber/40 bg-status-amber/10 text-status-amber' :
                                        level === 'denied' ? 'border-status-red/40 bg-status-red/10 text-status-red' :
                                        'border-line bg-surface-primary text-content-muted'
                                      }`}>
                                      <option value="inherit">Implicit (rol)</option>
                                      <option value="denied">Fără acces</option>
                                      <option value="viewer">Viewer</option>
                                      <option value="full">Editor</option>
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>

                  {


}
                  <GlassCard size="regular" className="xl:col-span-5 !p-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line/70">
                      <h4 className="text-pm-sm font-semibold uppercase tracking-wide text-content-muted flex items-center gap-2 min-w-0 truncate">
                        <LayoutDashboard className="h-4 w-4 text-accent shrink-0" /> Configurare dashboard
                      </h4>
                      <SaveButton onClick={saveDashboardConfig} state={dashSaveState} label="Salvează dashboard" />
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-pm-sm text-content-muted mb-3">
                        Bifează ce widget-uri vede acest utilizator când deschide Dashboard. Cele debifate sunt ascunse complet.
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <Button variant="outline" size="sm" onClick={() => setAllDashboardWidgets(true)}>Tot vizibil</Button>
                        <Button variant="outline" size="sm" onClick={() => setAllDashboardWidgets(false)}>Tot ascuns</Button>
                        <span className="ml-auto text-pm-2xs text-content-muted tabular-nums">
                          {visibleWidgetCount} / {DASHBOARD_WIDGETS.length} vizibile
                        </span>
                      </div>
                      <ul className="grid grid-cols-1">
                        {DASHBOARD_WIDGETS.map(w => {
                          const visible = dashboardWidgets[w.id] ?? true;
                          return (
                            <li key={w.id} className="border-b border-line/30 last:border-b-0">
                              <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-surface-tertiary/30 rounded-lg transition-smooth duration-150">
                                <input
                                  type="checkbox"
                                  checked={visible}
                                  onChange={e => toggleDashboardWidget(w.id, e.target.checked)}
                                  className="h-3.5 w-3.5 shrink-0 accent-[var(--color-accent)] rounded focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
                                />
                                <span className={`text-pm-sm flex-1 min-w-0 truncate ${visible ? 'text-content-primary' : 'text-content-muted line-through'}`}>
                                  {w.label}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </GlassCard>
                </div>

                {

}
              </div>
            )}
          </section>
        </div>
      </Page.Body>

      <FormModal isOpen={isOpen} onClose={closeModal}
        title={isEditing ? 'Editează utilizator' : 'Adaugă utilizator'}
        fields={formFields} onSubmit={handleSubmit}
        initialData={editingItem || {}} submitLabel={isEditing ? 'Actualizează' : 'Adaugă'} />
    </Page>
  );
}

