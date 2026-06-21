import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Loader2, AlertTriangle, FileText, Receipt, Wrench, Package, Calendar, CheckCircle } from 'lucide-react';
import { getServerUrl } from '@/config/server';

interface PortalView {
  project: {
    id: number; name: string; status: string;
    stage_name: string | null; deadline: string | null; start_date: string | null;
    description: string | null; estimated_value: number | null;
    client_name: string | null;
  };
  custom_stages: Array<{ id: number; name: string; order_index: number; status: string; }>;
  pieces_summary: { total: number; planificat: number; in_productie: number; fabricat: number; livrat: number; montat: number; testat: number; };
  contracts: Array<{ id: number; contract_code: string; title: string; status: string; sale_price: number; created_at: string; revision: number; }>;
  invoices: Array<{ id: number; invoice_number: string; status: string; total: number; paid_amount: number; remaining: number; issue_date: string; due_date: string; currency: string; }>;
  service_tickets: Array<{ id: number; ticket_number: string; title: string; severity: string; status: string; created_at: string; resolved_at: string | null; }>;
}

const STAGE_TONE: Record<string, string> = {
  finalizat: 'bg-status-green/12 text-status-green ring-1 ring-status-green/20',
  in_desfasurare: 'bg-status-amber/12 text-status-amber ring-1 ring-status-amber/20',
  planificat: 'bg-surface-secondary text-content-secondary ring-1 ring-line/70',
};

const SEVERITY_TONE: Record<string, string> = {
  critical: 'bg-status-red/12 text-status-red ring-1 ring-status-red/20',
  high: 'bg-status-amber/12 text-status-amber ring-1 ring-status-amber/20',
  medium: 'bg-status-teal/12 text-status-teal ring-1 ring-status-teal/20',
  low: 'bg-surface-secondary text-content-secondary ring-1 ring-line/70',
};

function fmtCurrency(v: number, currency = 'RON'): string {
  return `${(v || 0).toFixed(2)} ${currency}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = iso.split('T')[0] || iso;
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return iso;
  return `${day}.${m}.${y}`;
}

export default function CustomerPortalPage() {
  const [, params] = useRoute('/portal/:token');
  const token = params?.token || '';
  const [data, setData] = useState<PortalView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('Token lipsă'); setLoading(false); return; }
    setLoading(true);
    const base = getServerUrl();
    const url = base ? `${base}/api/portal/${token}` : `/api/portal/${token}`;
    fetch(url, { headers: { 'Cache-Control': 'no-store' } })
      .then(r => r.json().then(j => ({ ok: r.ok, body: j })))
      .then(({ ok, body }) => {
        if (!ok) { setError(body.message || 'Eroare la încărcare'); return; }
        setData(body);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Eroare la încărcare'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-page">
        <Loader2 className="h-8 w-8 animate-spin text-content-muted" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-page p-6">
        <div className="max-w-md w-full bg-surface-primary rounded-2xl shadow-[var(--elevation-2)] border border-line p-8 text-center anim-scale-in">
          <AlertTriangle className="h-12 w-12 text-status-red mx-auto mb-4" />
          <h1 className="text-pm-xl font-bold text-content-primary mb-2">Acces invalid</h1>
          <p className="text-pm-base text-content-secondary">{error || 'Link-ul portalului este invalid sau a expirat.'}</p>
        </div>
      </div>
    );
  }

  // Group invoice totals BY CURRENCY — never add EUR and RON into one number
  // (that was a client-facing reporting bug). One summary row per currency.
  const invoiceTotalsByCurrency = (() => {
    const acc: Record<string, { total: number; paid: number; remaining: number }> = {};
    for (const i of data.invoices) {
      const c = (i.currency || 'RON').toUpperCase();
      const b = acc[c] ?? (acc[c] = { total: 0, paid: 0, remaining: 0 });
      b.total = Math.round((b.total + (i.total || 0)) * 100) / 100;
      b.paid = Math.round((b.paid + (i.paid_amount || 0)) * 100) / 100;
      b.remaining = Math.round((b.remaining + (i.remaining || 0)) * 100) / 100;
    }
    return acc;
  })();
  const invoiceCurrencies = Object.keys(invoiceTotalsByCurrency).sort();
  const openTickets = data.service_tickets.filter(t => !t.resolved_at).length;
  const pct = data.pieces_summary.total > 0
    ? Math.round((data.pieces_summary.fabricat + data.pieces_summary.livrat + data.pieces_summary.montat + data.pieces_summary.testat) / data.pieces_summary.total * 100)
    : 0;

  return (
    <div className="min-h-screen bg-surface-page">
      <header className="bg-surface-primary border-b border-line">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-pm-lg font-bold text-content-primary">Portal client</h1>
            <p className="text-pm-sm text-content-muted">Vizualizare proiect — read-only</p>
          </div>
          {data.project.client_name && (
            <span className="min-w-0 truncate text-pm-md text-content-secondary font-medium">{data.project.client_name}</span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <section className="bg-surface-primary rounded-2xl shadow-[var(--elevation-1)] border border-line p-6 anim-slide-up">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <h2 className="text-pm-2xl font-bold text-content-primary truncate">{data.project.name}</h2>
              {data.project.stage_name && (
                <p className="text-pm-base text-content-secondary mt-1">Etapă curentă: <strong className="text-content-primary">{data.project.stage_name}</strong></p>
              )}
            </div>
            <span className="shrink-0 px-3 py-1 rounded-full text-pm-xs font-semibold bg-status-teal/12 text-status-teal ring-1 ring-status-teal/20 uppercase">
              {data.project.status}
            </span>
          </div>

          {data.project.description && (
            <p className="text-pm-base text-content-secondary mb-4">{data.project.description}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <Stat icon={Calendar} label="Start" value={fmtDate(data.project.start_date)} />
            <Stat icon={Calendar} label="Termen" value={fmtDate(data.project.deadline)} />
            <Stat icon={Package} label="Piese" value={`${data.pieces_summary.total}`} />
            <Stat icon={CheckCircle} label="Progres" value={`${pct}%`} />
          </div>

          {data.pieces_summary.total > 0 && (
            <div className="mt-4">
              <div className="h-3 rounded-full bg-surface-secondary overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-status-teal to-status-green" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-pm-sm text-content-muted mt-2">
                {data.pieces_summary.fabricat + data.pieces_summary.livrat + data.pieces_summary.montat + data.pieces_summary.testat} din {data.pieces_summary.total} piese complete
              </p>
            </div>
          )}
        </section>

        {data.custom_stages.length > 0 && (
          <section className="bg-surface-primary rounded-2xl shadow-[var(--elevation-1)] border border-line p-6 anim-slide-up">
            <h3 className="text-pm-sm font-bold uppercase tracking-wide text-content-muted mb-4">Etape proiect</h3>
            <div className="space-y-1">
              {data.custom_stages.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-3 -mx-2 px-2 py-2 rounded-lg transition-smooth duration-150 hover:bg-surface-tertiary">
                  <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-pm-xs font-bold ${
                    s.status === 'finalizat' ? 'bg-status-green text-white'
                    : s.status === 'in_desfasurare' ? 'bg-status-amber text-white'
                    : 'bg-surface-secondary text-content-muted'
                  }`}>
                    {s.status === 'finalizat' ? '✓' : idx + 1}
                  </div>
                  <span className="flex-1 min-w-0 truncate text-pm-base text-content-primary">{s.name}</span>
                  <span className={`shrink-0 text-pm-xs px-2 py-1 rounded-lg ${STAGE_TONE[s.status] || 'bg-surface-secondary text-content-secondary ring-1 ring-line/70'}`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.contracts.length > 0 && (
          <section className="bg-surface-primary rounded-2xl shadow-[var(--elevation-1)] border border-line p-6 anim-slide-up">
            <h3 className="text-pm-sm font-bold uppercase tracking-wide text-content-muted mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Contracte ({data.contracts.length})
            </h3>
            <div className="divide-y divide-line/70">
              {data.contracts.map(c => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-pm-base font-semibold text-content-primary truncate">{c.contract_code} <span className="text-content-muted text-pm-xs">rev. {c.revision}</span></p>
                    <p className="text-pm-xs text-content-secondary truncate">{c.title}</p>
                    <p className="text-pm-xs text-content-muted mt-1">{fmtDate(c.created_at)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-pm-base font-semibold text-content-primary tabular-nums">{fmtCurrency(c.sale_price)}</p>
                    <span className="inline-block mt-1 text-pm-xs px-2 py-1 rounded-lg bg-surface-secondary text-content-secondary uppercase">{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.invoices.length > 0 && (
          <section className="bg-surface-primary rounded-2xl shadow-[var(--elevation-1)] border border-line p-6 anim-slide-up">
            <h3 className="text-pm-sm font-bold uppercase tracking-wide text-content-muted mb-4 flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Facturi ({data.invoices.length})
            </h3>
            {invoiceCurrencies.map(cur => {
              const t = invoiceTotalsByCurrency[cur];
              return (
                <div key={cur} className="mb-4">
                  {invoiceCurrencies.length > 1 && (
                    <p className="text-pm-xs font-semibold text-content-muted mb-1">{cur}</p>
                  )}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="min-w-0 bg-surface-secondary rounded-lg p-3">
                      <p className="text-pm-xs text-content-muted truncate">Total facturat</p>
                      <p className="text-pm-lg font-bold text-content-primary tabular-nums truncate">{fmtCurrency(t.total, cur)}</p>
                    </div>
                    <div className="min-w-0 bg-status-green/12 rounded-lg p-3">
                      <p className="text-pm-xs text-status-green truncate">Plătit</p>
                      <p className="text-pm-lg font-bold text-status-green tabular-nums truncate">{fmtCurrency(t.paid, cur)}</p>
                    </div>
                    <div className="min-w-0 bg-status-red/12 rounded-lg p-3">
                      <p className="text-pm-xs text-status-red truncate">Restant</p>
                      <p className="text-pm-lg font-bold text-status-red tabular-nums truncate">{fmtCurrency(t.remaining, cur)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="overflow-x-auto">
              <table className="w-full text-pm-base">
                <thead>
                  <tr className="text-pm-xs text-content-muted uppercase border-b border-line">
                    <th className="text-left py-2">Nr.</th>
                    <th className="text-left">Emis</th>
                    <th className="text-left">Scadență</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Restant</th>
                    <th className="text-left pl-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map(i => (
                    <tr key={i.id} className="border-b border-line/70 transition-smooth duration-150 hover:bg-surface-tertiary">
                      <td className="py-2 font-mono text-pm-xs text-content-secondary whitespace-nowrap">{i.invoice_number}</td>
                      <td className="text-pm-xs text-content-secondary whitespace-nowrap">{fmtDate(i.issue_date)}</td>
                      <td className="text-pm-xs text-content-secondary whitespace-nowrap">{fmtDate(i.due_date)}</td>
                      <td className="text-right tabular-nums font-semibold text-content-primary whitespace-nowrap">{fmtCurrency(i.total, i.currency)}</td>
                      <td className={`text-right tabular-nums font-semibold whitespace-nowrap ${i.remaining > 0 ? 'text-status-red' : 'text-status-green'}`}>
                        {fmtCurrency(i.remaining, i.currency)}
                      </td>
                      <td className="pl-3">
                        <span className="inline-block text-pm-xs px-2 py-1 rounded-lg bg-surface-secondary text-content-secondary uppercase whitespace-nowrap">{i.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data.service_tickets.length > 0 && (
          <section className="bg-surface-primary rounded-2xl shadow-[var(--elevation-1)] border border-line p-6 anim-slide-up">
            <h3 className="text-pm-sm font-bold uppercase tracking-wide text-content-muted mb-4 flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Tichete service
              <span className="text-pm-xs bg-surface-secondary px-2 py-1 rounded-lg text-content-secondary normal-case">{openTickets} deschise</span>
            </h3>
            <div className="divide-y divide-line/70">
              {data.service_tickets.map(t => (
                <div key={t.id} className="py-3 -mx-2 px-2 rounded-lg transition-smooth duration-150 hover:bg-surface-tertiary">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="min-w-0 truncate text-pm-base font-semibold text-content-primary">{t.ticket_number} — {t.title}</p>
                    <span className={`shrink-0 text-pm-xs px-2 py-1 rounded-lg font-semibold ${SEVERITY_TONE[t.severity] || 'bg-surface-secondary text-content-secondary ring-1 ring-line/70'}`}>
                      {t.severity}
                    </span>
                  </div>
                  <p className="text-pm-xs text-content-muted">
                    Deschis {fmtDate(t.created_at)} • Status: <strong className="text-content-secondary">{t.status}</strong>
                    {t.resolved_at && <> • Rezolvat {fmtDate(t.resolved_at)}</>}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="text-center text-pm-xs text-content-muted py-4">
          Portal client — actualizat live • Read-only
        </footer>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="min-w-0 bg-surface-secondary rounded-lg p-3">
      <div className="flex items-center gap-1 text-pm-xs text-content-muted uppercase mb-1">
        <Icon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{label}</span>
      </div>
      <p className="text-pm-md font-semibold text-content-primary truncate">{value}</p>
    </div>
  );
}
