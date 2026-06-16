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
  finalizat: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  in_desfasurare: 'bg-amber-100 text-amber-700 border-amber-300',
  planificat: 'bg-slate-100 text-slate-600 border-slate-300',
};

const SEVERITY_TONE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-amber-100 text-amber-700',
  medium: 'bg-teal-100 text-teal-700',
  low: 'bg-stone-100 text-stone-600',
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow border border-slate-200 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Acces invalid</h1>
          <p className="text-sm text-slate-600">{error || 'Link-ul portalului este invalid sau a expirat.'}</p>
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Portal client</h1>
            <p className="text-xs text-slate-500">Vizualizare proiect — read-only</p>
          </div>
          {data.project.client_name && (
            <span className="text-sm text-slate-700 font-medium">{data.project.client_name}</span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <section className="bg-white rounded-lg shadow border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{data.project.name}</h2>
              {data.project.stage_name && (
                <p className="text-sm text-slate-600 mt-1">Etapă curentă: <strong>{data.project.stage_name}</strong></p>
              )}
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 uppercase">
              {data.project.status}
            </span>
          </div>

          {data.project.description && (
            <p className="text-sm text-slate-700 mb-4">{data.project.description}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Stat icon={Calendar} label="Start" value={fmtDate(data.project.start_date)} />
            <Stat icon={Calendar} label="Termen" value={fmtDate(data.project.deadline)} />
            <Stat icon={Package} label="Piese" value={`${data.pieces_summary.total}`} />
            <Stat icon={CheckCircle} label="Progres" value={`${pct}%`} />
          </div>

          {data.pieces_summary.total > 0 && (
            <div className="mt-4">
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                {data.pieces_summary.fabricat + data.pieces_summary.livrat + data.pieces_summary.montat + data.pieces_summary.testat} din {data.pieces_summary.total} piese complete
              </p>
            </div>
          )}
        </section>

        {data.custom_stages.length > 0 && (
          <section className="bg-white rounded-lg shadow border border-slate-200 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">Etape proiect</h3>
            <div className="space-y-2">
              {data.custom_stages.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    s.status === 'finalizat' ? 'bg-emerald-500 text-white'
                    : s.status === 'in_desfasurare' ? 'bg-amber-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                  }`}>
                    {s.status === 'finalizat' ? '✓' : idx + 1}
                  </div>
                  <span className="flex-1 text-sm text-slate-800">{s.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border ${STAGE_TONE[s.status] || 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.contracts.length > 0 && (
          <section className="bg-white rounded-lg shadow border border-slate-200 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Contracte ({data.contracts.length})
            </h3>
            <div className="divide-y divide-slate-100">
              {data.contracts.map(c => (
                <div key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.contract_code} <span className="text-slate-400 text-xs">rev. {c.revision}</span></p>
                    <p className="text-xs text-slate-600">{c.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmtDate(c.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">{fmtCurrency(c.sale_price)}</p>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.invoices.length > 0 && (
          <section className="bg-white rounded-lg shadow border border-slate-200 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4 flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Facturi ({data.invoices.length})
            </h3>
            {invoiceCurrencies.map(cur => {
              const t = invoiceTotalsByCurrency[cur];
              return (
                <div key={cur} className="mb-4">
                  {invoiceCurrencies.length > 1 && (
                    <p className="text-xs font-semibold text-slate-400 mb-1">{cur}</p>
                  )}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-50 rounded p-3">
                      <p className="text-xs text-slate-500">Total facturat</p>
                      <p className="text-lg font-bold text-slate-900 tabular-nums">{fmtCurrency(t.total, cur)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded p-3">
                      <p className="text-xs text-emerald-600">Plătit</p>
                      <p className="text-lg font-bold text-emerald-700 tabular-nums">{fmtCurrency(t.paid, cur)}</p>
                    </div>
                    <div className="bg-red-50 rounded p-3">
                      <p className="text-xs text-red-600">Restant</p>
                      <p className="text-lg font-bold text-red-700 tabular-nums">{fmtCurrency(t.remaining, cur)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase border-b border-slate-200">
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
                  <tr key={i.id} className="border-b border-slate-100">
                    <td className="py-2 font-mono text-xs text-slate-700">{i.invoice_number}</td>
                    <td className="text-xs text-slate-600">{fmtDate(i.issue_date)}</td>
                    <td className="text-xs text-slate-600">{fmtDate(i.due_date)}</td>
                    <td className="text-right tabular-nums font-semibold text-slate-900">{fmtCurrency(i.total, i.currency)}</td>
                    <td className={`text-right tabular-nums font-semibold ${i.remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {fmtCurrency(i.remaining, i.currency)}
                    </td>
                    <td className="pl-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">{i.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {data.service_tickets.length > 0 && (
          <section className="bg-white rounded-lg shadow border border-slate-200 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4 flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Tichete service
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 normal-case">{openTickets} deschise</span>
            </h3>
            <div className="divide-y divide-slate-100">
              {data.service_tickets.map(t => (
                <div key={t.id} className="py-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-slate-900">{t.ticket_number} — {t.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${SEVERITY_TONE[t.severity] || 'bg-slate-100 text-slate-600'}`}>
                      {t.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Deschis {fmtDate(t.created_at)} • Status: <strong>{t.status}</strong>
                    {t.resolved_at && <> • Rezolvat {fmtDate(t.resolved_at)}</>}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="text-center text-xs text-slate-400 py-4">
          Portal client — actualizat live • Read-only
        </footer>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase mb-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}
