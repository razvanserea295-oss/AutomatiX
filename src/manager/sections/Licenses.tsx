import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, ShieldCheck, AlertCircle, RefreshCw, Building2, ShieldX, RotateCcw } from '@/icons';
import { cmd } from '../api';
import { Btn, Field, Spinner, EmptyState, StatusPill, CopyBtn, fmtDate, useToasts, Toasts } from '../ui';

interface Issued {
  license_id: string; company_name: string; email: string; cui: string;
  issued_at: string; token: string; issued_by: string; created_at: string;
}
interface Activated {
  license_id: string; company_name: string; email: string; cui: string;
  issued_at: string; status: string; revoked_at?: string; revoked_reason?: string;
  imported_by?: string; created_at: string;
}
interface Revocation { license_id: string; revoked_at: string; reason: string; source: string }

export default function Licenses() {
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [cui, setCui] = useState('');
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<Issued | null>(null);
  const [issued, setIssued] = useState<Issued[]>([]);
  const [activated, setActivated] = useState<Activated[]>([]);
  const [revs, setRevs] = useState<Revocation[]>([]);
  const [keyReady, setKeyReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const { items, push, dismiss } = useToasts();

  async function refresh() {
    setLoading(true);
    try {
      const [iss, lic] = await Promise.all([
        cmd<{ issued: Issued[] }>('list_issued_licenses').catch(() => ({ issued: [] })),
        cmd<{ licenses: Activated[]; revocations: Revocation[] }>('list_licenses').catch(() => ({ licenses: [], revocations: [] })),
      ]);
      setIssued(iss.issued || []);
      setActivated(lic.licenses || []);
      setRevs(lic.revocations || []);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    cmd<{ can_issue: boolean; key_ready: boolean }>('get_license_issuer_state')
      .then((s) => setKeyReady(!!s.key_ready)).catch(() => { /* ignore */ });
    void refresh();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const c = company.trim();
    if (!c) { push('err', 'Numele firmei este obligatoriu.'); return; }
    setBusy(true); setFresh(null);
    try {
      const r = await cmd<Issued & { ok: boolean }>('create_license', { company_name: c, email: email.trim(), cui: cui.trim() });
      setFresh(r);
      setCompany(''); setEmail(''); setCui('');
      push('ok', `Licență generată pentru ${r.company_name}`);
      void refresh();
    } catch (e2) {
      push('err', e2 instanceof Error ? e2.message : 'Generare eșuată.');
    } finally { setBusy(false); }
  }

  const isRevoked = (id: string) => revs.some((r) => r.license_id === id);

  async function revoke(id: string) {
    const reason = window.prompt('Motivul revocării (opțional):') ?? '';
    try { await cmd('revoke_license', { license_id: id, reason }); push('ok', 'Licență revocată'); void refresh(); }
    catch (e) { push('err', e instanceof Error ? e.message : 'Revocare eșuată'); }
  }
  async function unrevoke(id: string) {
    try { await cmd('unrevoke_license', { license_id: id }); push('ok', 'Revocare anulată'); void refresh(); }
    catch (e) { push('err', e instanceof Error ? e.message : 'Operație eșuată'); }
  }

  return (
    <div className="mgr-section">
      <div className="mgr-section-head">
        <div>
          <h2>Licențe</h2>
          <p>Emite chei pentru clienți și administrează licențele activate.</p>
        </div>
        <Btn variant="ghost" size="sm" onClick={() => void refresh()}><RefreshCw size={14} /> Reîncarcă</Btn>
      </div>

      <div className="mgr-stats">
        <div className="mgr-stat static"><span className="mgr-stat-n">{issued.length}</span><span className="mgr-stat-l">Chei emise</span></div>
        <div className="mgr-stat static"><span className="mgr-stat-n">{activated.length}</span><span className="mgr-stat-l">Active pe server</span></div>
        <div className="mgr-stat static"><span className="mgr-stat-n">{revs.length}</span><span className="mgr-stat-l">Revocate</span></div>
        <div className="mgr-stat static">
          <span className={`mgr-stat-n ${keyReady ? 'ok' : 'warn'}`}>{keyReady ? 'Activă' : 'Lipsă'}</span>
          <span className="mgr-stat-l">Cheie semnare</span>
        </div>
      </div>

      {!keyReady && (
        <div className="mgr-banner warn">
          <AlertCircle size={16} />
          <span>Cheia privată de semnare nu este configurată pe acest server. Generarea va eșua până când este setată (<code>AUTOMATIX_LICENSE_PRIVKEY_FILE</code>).</span>
        </div>
      )}

      <div className="mgr-card">
        <div className="mgr-card-head"><h3><KeyRound size={16} /> Licență nouă</h3><p>Completează datele firmei și generează cheia.</p></div>
        <form onSubmit={onSubmit} className="mgr-form-grid">
          <Field label="Firmă *"><input className="mgr-input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Firma SRL" /></Field>
          <Field label="Email"><input className="mgr-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@firma.ro" /></Field>
          <Field label="CUI"><input className="mgr-input" value={cui} onChange={(e) => setCui(e.target.value)} placeholder="RO12345678" /></Field>
          <div className="mgr-form-action">
            <Btn type="submit" loading={busy}><KeyRound size={16} /> Generează</Btn>
          </div>
        </form>
        {fresh && (
          <div className="mgr-fresh">
            <div className="mgr-fresh-head"><ShieldCheck size={15} /> Cheie generată — {fresh.company_name}</div>
            <div className="mgr-fresh-key">
              <code>{fresh.token}</code>
              <CopyBtn text={fresh.token} label="Copiază cheia" />
            </div>
            <p className="mgr-muted">Trimite cheia clientului. O găsești oricând în lista de mai jos.</p>
          </div>
        )}
      </div>

      <div className="mgr-card mgr-card-flush">
        <div className="mgr-card-head pad"><h3>Chei emise</h3><p>{loading ? 'Se încarcă…' : `${issued.length} înregistrări`}</p></div>
        {loading ? <Spinner /> : issued.length === 0 ? (
          <EmptyState icon={<Building2 size={22} />} title="Nicio cheie emisă încă" text="Generează prima licență folosind formularul de mai sus." />
        ) : (
          <div className="mgr-table-wrap">
            <table className="mgr-table">
              <thead><tr><th>Firmă</th><th>CUI</th><th>Emisă</th><th>De</th><th>Status</th><th className="mgr-right">Cheie</th></tr></thead>
              <tbody>
                {issued.map((l) => (
                  <tr key={l.license_id}>
                    <td><div className="mgr-strong">{l.company_name || '—'}</div>{l.email && <div className="mgr-muted">{l.email}</div>}</td>
                    <td className="mgr-muted">{l.cui || '—'}</td>
                    <td className="mgr-muted mgr-nowrap">{fmtDate(l.created_at || l.issued_at)}</td>
                    <td className="mgr-muted">{l.issued_by || '—'}</td>
                    <td>{isRevoked(l.license_id) ? <StatusPill tone="red">Revocată</StatusPill> : <StatusPill tone="green">Validă</StatusPill>}</td>
                    <td className="mgr-right"><CopyBtn text={l.token} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mgr-card mgr-card-flush">
        <div className="mgr-card-head pad"><h3>Licențe active pe acest server</h3><p>Chei importate în instanța curentă.</p></div>
        {loading ? <Spinner /> : activated.length === 0 ? (
          <EmptyState icon={<ShieldCheck size={22} />} title="Nicio licență activată aici" text="Licențele importate de clienți pe această instanță apar aici." />
        ) : (
          <div className="mgr-table-wrap">
            <table className="mgr-table">
              <thead><tr><th>Firmă</th><th>Importată de</th><th>Activată</th><th>Status</th><th className="mgr-right">Acțiuni</th></tr></thead>
              <tbody>
                {activated.map((l) => {
                  const revoked = l.status === 'revoked' || isRevoked(l.license_id);
                  return (
                    <tr key={l.license_id}>
                      <td><div className="mgr-strong">{l.company_name || '—'}</div>{l.cui && <div className="mgr-muted">{l.cui}</div>}</td>
                      <td className="mgr-muted">{l.imported_by || '—'}</td>
                      <td className="mgr-muted mgr-nowrap">{fmtDate(l.created_at)}</td>
                      <td>{revoked ? <StatusPill tone="red">Revocată</StatusPill> : <StatusPill tone="green">Activă</StatusPill>}</td>
                      <td className="mgr-right">
                        {revoked
                          ? <Btn variant="ghost" size="sm" onClick={() => void unrevoke(l.license_id)}><RotateCcw size={13} /> Reactivează</Btn>
                          : <Btn variant="danger" size="sm" onClick={() => void revoke(l.license_id)}><ShieldX size={13} /> Revocă</Btn>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Toasts items={items} onDismiss={dismiss} />
    </div>
  );
}
