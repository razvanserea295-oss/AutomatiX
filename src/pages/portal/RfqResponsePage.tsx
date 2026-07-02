import { PageToolbar } from '@/app-ui';
import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Loader2, AlertTriangle, Send, CheckCircle, X } from '@/icons';
import { getServerUrl } from '@/config/server';

interface RfqItem {
  id: number; description: string; quantity: number; unit: string; notes: string | null;
}
interface RfqView {
  rfq: { rfq_number: string; title: string; description: string | null; deadline: string | null; items: RfqItem[]; };
  invitation: { id: number; status: string; supplier_name: string | null; };
}

export default function RfqResponsePage() {
  const [, params] = useRoute('/rfq/:token');
  const token = params?.token || '';
  const [data, setData] = useState<RfqView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [responses, setResponses] = useState<Record<number, { unit_price: number; available_quantity: number; notes: string }>>({});
  const [leadTime, setLeadTime] = useState('');
  const [validity, setValidity] = useState('');
  const [currency, setCurrency] = useState('RON');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    if (!token) { setError('Token lipsă'); setLoading(false); return; }
    const base = getServerUrl();
    const url = base ? `${base}/api/rfq/${token}` : `/api/rfq/${token}`;
    fetch(url).then(r => r.json().then(j => ({ ok: r.ok, body: j })))
      .then(({ ok, body }) => {
        if (!ok) { setError(body.message || 'Eroare'); return; }
        setData(body);
        const init: Record<number, any> = {};
        for (const it of body.rfq.items) init[it.id] = { unit_price: 0, available_quantity: it.quantity, notes: '' };
        setResponses(init);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Eroare'))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (decline = false) => {
    setSubmitting(true);
    const base = getServerUrl();
    const url = base ? `${base}/api/rfq/${token}/submit` : `/api/rfq/${token}/submit`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decline
          ? { decline: true, decline_reason: declineReason, items: [] }
          : {
            lead_time_days: leadTime ? Number(leadTime) : undefined,
            validity_days: validity ? Number(validity) : undefined,
            currency, notes,
            items: Object.entries(responses).map(([id, v]) => ({
              rfq_item_id: Number(id), unit_price: v.unit_price,
              available_quantity: v.available_quantity, notes: v.notes,
            })),
          }),
      });
      const body = await r.json();
      if (!r.ok) { setError(body.message || 'Eroare trimitere'); return; }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare');
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-page"><Loader2 className="h-8 w-8 animate-spin text-content-muted" /></div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-page p-6">
        <div className="max-w-md w-full bg-surface-primary rounded-2xl shadow-[var(--elevation-2)] border border-line p-8 text-center anim-scale-in">
          <AlertTriangle className="h-12 w-12 text-status-red mx-auto mb-4" />
          <h1 className="text-pm-xl font-bold text-content-primary mb-2">Acces invalid</h1>
          <p className="text-pm-base text-content-secondary">{error || 'Link invalid'}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-page p-6">
        <div className="max-w-md w-full bg-surface-primary rounded-2xl shadow-[var(--elevation-2)] border border-line p-8 text-center anim-scale-in">
          <CheckCircle className="h-12 w-12 text-status-green mx-auto mb-4" />
          <h1 className="text-pm-xl font-bold text-content-primary mb-2">Mulțumim!</h1>
          <p className="text-pm-base text-content-secondary">Răspunsul a fost trimis cu succes. Vă vom contacta în scurt timp.</p>
        </div>
      </div>
    );
  }

  const total = Object.values(responses).reduce((s, v) => s + (v.unit_price * v.available_quantity), 0);

  return (
    <div className="min-h-screen bg-surface-page">
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        <PageToolbar />
        {data.rfq.description && (
          <div className="bg-surface-primary rounded-2xl shadow-[var(--elevation-1)] border border-line p-4 anim-slide-up">
            <p className="text-pm-base text-content-secondary">{data.rfq.description}</p>
          </div>
        )}

        {data.rfq.deadline && (
          <div className="bg-status-amber/12 border border-status-amber/20 rounded-xl p-3 text-pm-base text-status-amber anim-fade-slide-in">
            <strong>Termen răspuns:</strong> {data.rfq.deadline}
          </div>
        )}

        {!showDecline ? (
          <>
            <div className="bg-surface-primary rounded-2xl shadow-[var(--elevation-1)] border border-line overflow-hidden anim-slide-up">
              <table className="w-full text-pm-base">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="text-left px-4 py-2 text-pm-eyebrow uppercase text-content-muted">Articol</th>
                    <th className="text-right px-4 py-2 text-pm-eyebrow uppercase text-content-muted">Cant. solicitată</th>
                    <th className="text-right px-4 py-2 text-pm-eyebrow uppercase text-content-muted">Cant. disponibilă</th>
                    <th className="text-right px-4 py-2 text-pm-eyebrow uppercase text-content-muted">Preț unitar</th>
                    <th className="text-right px-4 py-2 text-pm-eyebrow uppercase text-content-muted">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rfq.items.map(item => {
                    const r = responses[item.id] || { unit_price: 0, available_quantity: item.quantity, notes: '' };
                    return (
                      <tr key={item.id} className="border-t border-line/70 transition-smooth duration-150 hover:bg-surface-tertiary">
                        <td className="px-4 py-2 text-content-primary"><span className="block min-w-0 truncate">{item.description}</span>{item.notes && <div className="text-pm-xs text-content-muted truncate">{item.notes}</div>}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-content-secondary">{item.quantity} {item.unit}</td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" min={0} step="0.01" value={r.available_quantity}
                            onChange={e => setResponses(prev => ({ ...prev, [item.id]: { ...r, available_quantity: Number(e.target.value) } }))}
                            className="w-24 h-8 text-right px-2 border border-line rounded-lg bg-surface-primary text-content-primary transition-smooth duration-150 hover:border-content-muted focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-[var(--ring-soft)]" />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" min={0} step="0.01" value={r.unit_price}
                            onChange={e => setResponses(prev => ({ ...prev, [item.id]: { ...r, unit_price: Number(e.target.value) } }))}
                            className="w-28 h-8 text-right px-2 border border-line rounded-lg bg-surface-primary text-content-primary transition-smooth duration-150 hover:border-content-muted focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-[var(--ring-soft)]" />
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold text-content-primary">{(r.unit_price * r.available_quantity).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-surface-secondary">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right font-semibold text-content-primary">TOTAL OFERTĂ</td>
                    <td className="px-4 py-2 text-right tabular-nums font-bold text-pm-md text-content-primary">{total.toFixed(2)} {currency}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="bg-surface-primary rounded-2xl shadow-[var(--elevation-1)] border border-line p-6 grid grid-cols-3 gap-4 anim-slide-up">
              <div className="min-w-0">
                <label className="block text-pm-eyebrow uppercase text-content-muted mb-1">Termen livrare (zile)</label>
                <input type="number" min={0} value={leadTime} onChange={e => setLeadTime(e.target.value)}
                  className="w-full h-10 px-3 border border-line rounded-xl bg-surface-primary text-pm-base text-content-primary transition-smooth duration-150 hover:border-content-muted focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-[var(--ring-soft)]" />
              </div>
              <div className="min-w-0">
                <label className="block text-pm-eyebrow uppercase text-content-muted mb-1">Valabilitate ofertă (zile)</label>
                <input type="number" min={0} value={validity} onChange={e => setValidity(e.target.value)}
                  className="w-full h-10 px-3 border border-line rounded-xl bg-surface-primary text-pm-base text-content-primary transition-smooth duration-150 hover:border-content-muted focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-[var(--ring-soft)]" />
              </div>
              <div className="min-w-0">
                <label className="block text-pm-eyebrow uppercase text-content-muted mb-1">Monedă</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-10 px-3 border border-line rounded-xl bg-surface-primary text-pm-base text-content-primary transition-smooth duration-150 hover:border-content-muted focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-[var(--ring-soft)]">
                  <option value="RON">RON</option>
                </select>
              </div>
              <div className="col-span-3 min-w-0">
                <label className="block text-pm-eyebrow uppercase text-content-muted mb-1">Observații</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-line rounded-xl bg-surface-primary text-pm-base text-content-primary transition-smooth duration-150 hover:border-content-muted focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-[var(--ring-soft)]" placeholder="Detalii suplimentare, condiții de plată, etc." />
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <button onClick={() => setShowDecline(true)} className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-line text-pm-base text-content-secondary transition-smooth duration-150 hover:bg-surface-tertiary hover:text-content-primary active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">
                Refuz cererea
              </button>
              <button onClick={() => submit(false)} disabled={submitting || total <= 0}
                className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl bg-accent text-white text-pm-base font-semibold transition-smooth duration-150 hover:shadow-[var(--elevation-2)] active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Trimite ofertă
              </button>
            </div>
          </>
        ) : (
          <div className="bg-surface-primary rounded-2xl shadow-[var(--elevation-1)] border border-line p-6 anim-scale-in">
            <h3 className="text-pm-md font-semibold text-content-primary mb-2">Confirmăți refuzul</h3>
            <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} rows={3}
              placeholder="Motiv refuz (opțional)" className="w-full px-3 py-2 border border-line rounded-xl bg-surface-primary text-pm-base text-content-primary transition-smooth duration-150 hover:border-content-muted focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-[var(--ring-soft)] mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDecline(false)} className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl border border-line text-pm-base text-content-secondary transition-smooth duration-150 hover:bg-surface-tertiary hover:text-content-primary active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">
                <X className="h-4 w-4" /> Anulează
              </button>
              <button onClick={() => submit(true)} disabled={submitting}
                className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-status-red text-white text-pm-base font-semibold transition-smooth duration-150 hover:shadow-[var(--elevation-2)] active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-50">Confirmă refuz</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
