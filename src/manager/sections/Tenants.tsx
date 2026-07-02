import { useEffect, useState } from 'react';
import { Building2, RefreshCw, ExternalLink, ShieldCheck, ShieldAlert } from '@/icons';
import { listTenants, tenantState, type TenantInfo, type TenantState } from '../api';
import { Btn, Spinner, EmptyState, StatusPill, Toasts, useToasts } from '../ui';

interface Row extends TenantInfo { state: TenantState | null; loading: boolean }

export default function Tenants() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const { items, dismiss } = useToasts();

  async function load() {
    setLoading(true);
    const tenants = await listTenants();
    setRows(tenants.map((t) => ({ ...t, state: null, loading: true })));
    setLoading(false);
    // Resolve each tenant's license state independently.
    await Promise.all(
      tenants.map(async (t) => {
        const st = await tenantState(t.slug);
        setRows((prev) => prev.map((r) => (r.slug === t.slug ? { ...r, state: st, loading: false } : r)));
      }),
    );
  }
  useEffect(() => { void load(); }, []);

  const licensedCount = rows.filter((r) => r.state?.licensed).length;

  return (
    <div className="mgr-section">
      <div className="mgr-section-head">
        <div>
          <h2>Clienți</h2>
          <p>Firmele găzduite și starea licenței fiecăreia.</p>
        </div>
        <Btn variant="ghost" size="sm" onClick={() => void load()}><RefreshCw size={14} /> Reîncarcă</Btn>
      </div>

      <div className="mgr-stats">
        <div className="mgr-stat static"><span className="mgr-stat-n">{rows.length}</span><span className="mgr-stat-l">Firme</span></div>
        <div className="mgr-stat static"><span className="mgr-stat-n ok">{licensedCount}</span><span className="mgr-stat-l">Licențiate</span></div>
        <div className="mgr-stat static"><span className="mgr-stat-n warn">{rows.length - licensedCount}</span><span className="mgr-stat-l">Neactivate</span></div>
      </div>

      <div className="mgr-card mgr-card-flush">
        {loading ? (
          <Spinner label="Se încarcă firmele…" />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Building2 size={22} />} title="Nicio firmă înregistrată" text="Firmele din registrul de tenanți apar aici." />
        ) : (
          <div className="mgr-table-wrap">
            <table className="mgr-table">
              <thead><tr><th>Firmă</th><th>Identificator</th><th>Licență</th><th className="mgr-right">Deschide</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.slug || '(host)'}>
                    <td>
                      <div className="mgr-strong">{r.state?.company_name || r.name || '—'}</div>
                      {r.state?.company_name && r.name && r.state.company_name !== r.name && <div className="mgr-muted">{r.name}</div>}
                    </td>
                    <td className="mgr-muted"><code>{r.slug || 'host'}</code></td>
                    <td>
                      {r.loading ? <span className="mgr-muted">…</span>
                        : r.state?.licensed
                          ? <StatusPill tone="green"><ShieldCheck size={12} /> Licențiată</StatusPill>
                          : <StatusPill tone="amber"><ShieldAlert size={12} /> Neactivată</StatusPill>}
                    </td>
                    <td className="mgr-right">
                      <a className="mgr-copy" href={r.slug ? `/t/${r.slug}/` : '/'} target="_blank" rel="noreferrer">
                        <ExternalLink size={13} /> App
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Toasts items={items} onDismiss={dismiss} />
    </div>
  );
}
