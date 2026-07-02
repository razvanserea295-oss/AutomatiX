import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { confirmDialog } from '@/components/ConfirmDialog';
import { PAGE_ACCESS_LEVELS, PERMISSION_PAGES, parseCustomPages } from '@/v2/lib/pagePermissions';
import { Page, PageHeader, PageBody, PageToolbar, PageSearch, PageSplit, PagePanel, DataTableCard } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface Role { id: number; name: string }

const EMPTY = { username: '', full_name: '', email: '', password: '', role_id: '' };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [selected, setSelected] = useState<User | null>(null);
  const [customPages, setCustomPages] = useState<Record<string, string>>({});
  const [savingPages, setSavingPages] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiCommand<User[]>('get_users'),
      apiCommand<Role[]>('get_roles'),
    ])
      .then(([u, r]) => {
        setUsers(Array.isArray(u) ? u : []);
        setRoles(Array.isArray(r) ? r : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) =>
      [u.full_name, u.username, u.email, u.role_name].some((v) => (v || '').toLowerCase().includes(needle)),
    );
  }, [users, q]);

  const selectUser = (u: User) => {
    setSelected(u);
    setCustomPages(parseCustomPages(u.custom_pages));
  };

  const setPageAccess = (pageId: string, level: string) => {
    setCustomPages((prev) => {
      const next = { ...prev };
      if (level === 'inherit') delete next[pageId];
      else next[pageId] = level;
      return next;
    });
  };

  const savePages = async () => {
    if (!selected) return;
    setSavingPages(true);
    try {
      await apiCommand('update_user_pages', { user_id: selected.id, pages: customPages });
      toast.success('Permisiuni salvate');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setSavingPages(false);
    }
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      username: u.username,
      full_name: u.full_name || '',
      email: u.email || '',
      password: '',
      role_id: String(u.role_id ?? ''),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.username.trim() || !form.full_name.trim() || !form.email.trim() || !form.role_id) {
      toast.error('Completează câmpurile obligatorii');
      return;
    }
    if (!editing && !form.password) {
      toast.error('Parola este obligatorie la creare');
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        username: form.username.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        role_id: Number(form.role_id),
        active: true,
      };
      if (form.password) payload.password = form.password;
      if (editing) await apiCommand('update_user', { id: editing.id, ...payload });
      else await apiCommand('create_user', payload);
      toast.success(editing ? 'Utilizator actualizat' : 'Utilizator creat');
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const remove = async (u: User) => {
    const ok = await confirmDialog({ title: 'Șterge utilizator', body: u.full_name || u.username, danger: true });
    if (!ok) return;
    try {
      await apiCommand('delete_user', { id: u.id });
      if (selected?.id === u.id) setSelected(null);
      toast.success('Șters');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, typeof PERMISSION_PAGES>();
    for (const p of PERMISSION_PAGES) {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group)!.push(p);
    }
    return [...map.entries()];
  }, []);

  return (
    <Page fill>
      <PageHeader
        title="Utilizatori"
        description={`${filtered.length} conturi`}
        actions={<Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Utilizator nou</Button>}
      />
      <PageBody>
        <PageToolbar>
          <PageSearch placeholder="Caută…" value={q} onChange={(e) => setQ(e.target.value)} />
        </PageToolbar>
        <PageSplit variant="detail">
          <DataTableCard>
            <AsyncContent loading={loading} error={null} empty={filtered.length === 0}>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>Utilizator</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className={selected?.id === u.id ? 'bg-muted/50' : ''}>
                    <TableCell className="font-medium cursor-pointer" onClick={() => selectUser(u)}>{u.full_name}</TableCell>
                    <TableCell className="cursor-pointer" onClick={() => selectUser(u)}>{u.username}</TableCell>
                    <TableCell><StatusBadge status={u.role_name || 'user'} /></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>Editează</Button>
                      <Button size="sm" variant="ghost" onClick={() => void remove(u)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </AsyncContent>
          </DataTableCard>

          <PagePanel scroll>
            {!selected ? (
              <p className="density-meta p-[var(--density-card-p)] text-muted-foreground">Selectează un utilizator pentru permisiuni pagini.</p>
            ) : (
              <div className="space-y-[var(--density-gap-section)] p-[var(--density-card-p)]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{selected.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selected.role_name}</p>
                  </div>
                  <Button size="sm" disabled={savingPages} onClick={() => void savePages()}>
                    <Save className="mr-1 h-3 w-3" />Salvează
                  </Button>
                </div>
                {groups.map(([group, pages]) => (
                  <div key={group}>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{group}</p>
                    <div className="space-y-2">
                      {pages.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                          <span>{p.label}</span>
                          <select
                            className="h-8 rounded border px-2 text-xs"
                            value={customPages[p.id] ?? 'inherit'}
                            onChange={(e) => setPageAccess(p.id, e.target.value)}
                          >
                            {PAGE_ACCESS_LEVELS.map((l) => (
                              <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PagePanel>
        </PageSplit>
      </PageBody>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editează utilizator' : 'Utilizator nou'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label>Username</Label><Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} disabled={!!editing} /></div>
            <div className="grid gap-1.5"><Label>Nume complet</Label><Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="grid gap-1.5">
              <Label>Rol</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={form.role_id} onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}>
                <option value="">Selectează…</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5"><Label>{editing ? 'Parolă nouă (opțional)' : 'Parolă'}</Label><Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
            <Button onClick={() => void save()}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
