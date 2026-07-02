import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Users as UsersIcon, UserPlus, RefreshCw, Pencil, Trash2, ShieldCheck } from '@/icons';
import { cmd, currentUser } from '../api';
import { Btn, Field, Spinner, EmptyState, StatusPill, Modal, fmtDate, useToasts, Toasts } from '../ui';

interface User {
  id: number; username: string; email: string; full_name: string;
  role_id: number; role_name: string; active: boolean;
  job_title?: string | null; last_login?: string | null;
}
interface Role { id: number; name: string; description: string }

interface Draft {
  id?: number; full_name: string; username: string; email: string;
  password: string; role_id: number; job_title: string; active: boolean;
}
const emptyDraft = (roleId: number): Draft => ({
  full_name: '', username: '', email: '', password: '', role_id: roleId, job_title: '', active: true,
});

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const { items, push, dismiss } = useToasts();
  const me = currentUser();

  async function load() {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([
        cmd<User[]>('get_users'),
        cmd<Role[]>('get_roles').catch(() => [] as Role[]),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setRoles(Array.isArray(r) ? r : []);
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Eroare la încărcare');
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const defaultRole = roles.find((r) => r.name === 'user')?.id ?? roles[0]?.id ?? 2;
  const roleLabel = (id: number) => roles.find((r) => r.id === id)?.name ?? '—';

  function openNew() { setDraft(emptyDraft(defaultRole)); }
  function openEdit(u: User) {
    setDraft({ id: u.id, full_name: u.full_name, username: u.username, email: u.email, password: '', role_id: u.role_id, job_title: u.job_title || '', active: u.active });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (!draft.full_name.trim() || !draft.username.trim() || !draft.email.trim()) { push('err', 'Nume, utilizator și email sunt obligatorii.'); return; }
    if (!draft.id && draft.password.length < 8) { push('err', 'Parola trebuie să aibă minim 8 caractere.'); return; }
    setBusy(true);
    try {
      if (draft.id) {
        const body: Record<string, unknown> = {
          id: draft.id, full_name: draft.full_name.trim(), username: draft.username.trim(),
          email: draft.email.trim(), role_id: draft.role_id, job_title: draft.job_title.trim() || null, active: draft.active,
        };
        if (draft.password.trim()) body.password = draft.password.trim();
        await cmd('update_user', body);
        push('ok', 'Utilizator actualizat');
      } else {
        await cmd('create_user', {
          full_name: draft.full_name.trim(), username: draft.username.trim(), email: draft.email.trim(),
          password: draft.password.trim(), role_id: draft.role_id, job_title: draft.job_title.trim() || null, active: draft.active,
        });
        push('ok', 'Utilizator creat');
      }
      setDraft(null);
      void load();
    } catch (e2) {
      push('err', e2 instanceof Error ? e2.message : 'Salvare eșuată');
    } finally { setBusy(false); }
  }

  async function remove(u: User) {
    if (u.id === me?.id) { push('err', 'Nu te poți șterge pe tine.'); return; }
    if (!window.confirm(`Ștergi utilizatorul „${u.full_name || u.username}"?`)) return;
    try { await cmd('delete_user', { id: u.id }); push('ok', 'Utilizator șters'); void load(); }
    catch (e) { push('err', e instanceof Error ? e.message : 'Ștergere eșuată'); }
  }

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.active).length,
    admins: users.filter((u) => u.role_name === 'admin').length,
  }), [users]);

  return (
    <div className="mgr-section">
      <div className="mgr-section-head">
        <div>
          <h2>Utilizatori</h2>
          <p>Gestionează conturile echipei firmei tale.</p>
        </div>
        <div className="mgr-head-actions">
          <Btn variant="ghost" size="sm" onClick={() => void load()}><RefreshCw size={14} /> Reîncarcă</Btn>
          <Btn size="sm" onClick={openNew}><UserPlus size={14} /> Adaugă utilizator</Btn>
        </div>
      </div>

      <div className="mgr-stats">
        <div className="mgr-stat static"><span className="mgr-stat-n">{stats.total}</span><span className="mgr-stat-l">Total</span></div>
        <div className="mgr-stat static"><span className="mgr-stat-n ok">{stats.active}</span><span className="mgr-stat-l">Activi</span></div>
        <div className="mgr-stat static"><span className="mgr-stat-n">{stats.admins}</span><span className="mgr-stat-l">Administratori</span></div>
      </div>

      <div className="mgr-card mgr-card-flush">
        {loading ? (
          <Spinner label="Se încarcă utilizatorii…" />
        ) : users.length === 0 ? (
          <EmptyState icon={<UsersIcon size={22} />} title="Niciun utilizator" text="Adaugă primul membru al echipei." />
        ) : (
          <div className="mgr-table-wrap">
            <table className="mgr-table">
              <thead><tr><th>Utilizator</th><th>Rol</th><th>Ultima autentificare</th><th>Status</th><th className="mgr-right">Acțiuni</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="mgr-strong">{u.full_name || u.username}{u.id === me?.id && <span className="mgr-you">tu</span>}</div>
                      <div className="mgr-muted">@{u.username}{u.email ? ` · ${u.email}` : ''}</div>
                    </td>
                    <td><StatusPill tone={u.role_name === 'admin' ? 'blue' : 'gray'}>{roleLabel(u.role_id)}</StatusPill></td>
                    <td className="mgr-muted mgr-nowrap">{u.last_login ? fmtDate(u.last_login) : 'Niciodată'}</td>
                    <td>{u.active ? <StatusPill tone="green">Activ</StatusPill> : <StatusPill tone="red">Inactiv</StatusPill>}</td>
                    <td className="mgr-right">
                      <div className="mgr-row-actions">
                        <button className="mgr-icon-btn" onClick={() => openEdit(u)} aria-label="Editează"><Pencil size={14} /></button>
                        <button className="mgr-icon-btn danger" onClick={() => void remove(u)} aria-label="Șterge" disabled={u.id === me?.id}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Editează utilizator' : 'Utilizator nou'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDraft(null)}>Anulează</Btn>
            <Btn loading={busy} onClick={(e) => void save(e as unknown as FormEvent)}><ShieldCheck size={15} /> Salvează</Btn>
          </>
        }
      >
        {draft && (
          <form className="mgr-modal-form" onSubmit={save}>
            <div className="mgr-form-grid two">
              <Field label="Nume complet *"><input className="mgr-input" value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} autoFocus /></Field>
              <Field label="Funcție"><input className="mgr-input" value={draft.job_title} onChange={(e) => setDraft({ ...draft, job_title: e.target.value })} placeholder="ex. Inginer proiectant" /></Field>
              <Field label="Utilizator *"><input className="mgr-input" value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} autoComplete="off" /></Field>
              <Field label="Email *"><input className="mgr-input" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} autoComplete="off" /></Field>
              <Field label="Rol">
                <select className="mgr-input" value={draft.role_id} onChange={(e) => setDraft({ ...draft, role_id: Number(e.target.value) })}>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>)}
                </select>
              </Field>
              <Field label={draft.id ? 'Parolă nouă (opțional)' : 'Parolă *'} hint={draft.id ? 'Lasă gol pentru a păstra parola actuală.' : 'Minim 8 caractere.'}>
                <input className="mgr-input" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} autoComplete="new-password" />
              </Field>
            </div>
            <label className="mgr-check">
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
              <span>Cont activ</span>
            </label>
          </form>
        )}
      </Modal>
      <Toasts items={items} onDismiss={dismiss} />
    </div>
  );
}
