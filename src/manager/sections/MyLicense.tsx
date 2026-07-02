import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw, KeyRound, Building2 } from '@/icons';
import { cmd, tenantState, currentSlug, type TenantState } from '../api';
import { Btn, Field, Spinner, StatusPill, fmtDate, useToasts, Toasts } from '../ui';

interface Activated {
  license_id: string; company_name: string; email: string; cui: string;
  issued_at: string; status: string; imported_by?: string; created_at: string;
}

export default function MyLicense() {
  const [state, setState] = useState<TenantState | null>(null);
  const [licenses, setLicenses] = useState<Activated[]>([]);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const { items, push, dismiss } = useToasts();

  async function load() {
    setLoading(true);
    try {
      const [st, lic] = await Promise.all([
        tenantState(currentSlug()),
        cmd<{ licenses: Activated[] }>('list_licenses').catch(() => ({ licenses: [] })),
      ]);
      setState(st);
      setLicenses(lic.licenses || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function activate(e: FormEvent) {
    e.preventDefault();
    const token = key.trim();
    if (!token) { push('err', 'Introdu cheia de licență.'); return; }
    setBusy(true);
    try {
      const r = await cmd<{ ok: boolean; company_name?: string }>('import_license', { token, license_token: token, key: token });
      push('ok', `Licență activată${r.company_name ? ` — ${r.company_name}` : ''}`);
      setKey('');
      void load();
    } catch (e2) {
      push('err', e2 instanceof Error ? e2.message : 'Activare eșuată');
    } finally { setBusy(false); }
  }

  const licensed = !!state?.licensed;
  const active = licenses.find((l) => l.status !== 'revoked') || licenses[0];

  return (
    <div className="mgr-section">
      <div className="mgr-section-head">
        <div>
          <h2>Licența mea</h2>
          <p>Starea licenței firmei tale și activarea unei chei noi.</p>
        </div>
        <Btn variant="ghost" size="sm" onClick={() => void load()}><RefreshCw size={14} /> Reîncarcă</Btn>
      </div>

      {loading ? <Spinner label="Se verifică licența…" /> : (
        <>
          <div className={`mgr-license-hero ${licensed ? 'ok' : 'warn'}`}>
            <div className="mgr-license-ic">{licensed ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}</div>
            <div className="mgr-license-body">
              <div className="mgr-license-status">
                {licensed ? <StatusPill tone="green">Licență activă</StatusPill> : <StatusPill tone="amber">Neactivată</StatusPill>}
              </div>
              <div className="mgr-license-company">{state?.company_name || active?.company_name || 'Firma ta'}</div>
              {active && (
                <div className="mgr-license-meta">
                  {active.cui && <span><Building2 size={12} /> {active.cui}</span>}
                  <span>Activată: {fmtDate(active.created_at)}</span>
                  {active.imported_by && <span>de {active.imported_by}</span>}
                </div>
              )}
              {!licensed && <p className="mgr-muted">Aplicația rămâne blocată până la activarea unei licențe valide. Introdu cheia primită mai jos.</p>}
            </div>
          </div>

          <div className="mgr-card">
            <div className="mgr-card-head"><h3><KeyRound size={16} /> Activează o cheie</h3><p>Lipește cheia de licență primită de la furnizor.</p></div>
            <form onSubmit={activate} className="mgr-activate">
              <Field label="Cheie de licență">
                <textarea className="mgr-input mgr-textarea" rows={2} spellCheck={false} value={key} onChange={(e) => setKey(e.target.value)} placeholder="AX1.…" />
              </Field>
              <Btn type="submit" loading={busy}><ShieldCheck size={16} /> Activează</Btn>
            </form>
          </div>
        </>
      )}
      <Toasts items={items} onDismiss={dismiss} />
    </div>
  );
}
