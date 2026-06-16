import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Loader2, AlertTriangle, Send, CheckCircle, X } from 'lucide-react';
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
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow border p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Acces invalid</h1>
          <p className="text-sm text-slate-600">{error || 'Link invalid'}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow border p-8 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Mulțumim!</h1>
          <p className="text-sm text-slate-600">Răspunsul a fost trimis cu succes. Vă vom contacta în scurt timp.</p>
        </div>
      </div>
    );
  }

  const total = Object.values(responses).reduce((s, v) => s + (v.unit_price * v.available_quantity), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-lg font-bold text-slate-900">{data.rfq.title}</h1>
          <p className="text-xs text-slate-500">Cerere ofertă {data.rfq.rfq_number}{data.invitation.supplier_name ? ` — ${data.invitation.supplier_name}` : ''}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {data.rfq.description && (
          <div className="bg-white rounded-lg shadow border p-4">
            <p className="text-sm text-slate-700">{data.rfq.description}</p>
          </div>
        )}

        {data.rfq.deadline && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
            <strong>Termen răspuns:</strong> {data.rfq.deadline}
          </div>
        )}

        {!showDecline ? (
          <>
            <div className="bg-white rounded-lg shadow border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs uppercase text-slate-600">Articol</th>
                    <th className="text-right px-4 py-2 text-xs uppercase text-slate-600">Cant. solicitată</th>
                    <th className="text-right px-4 py-2 text-xs uppercase text-slate-600">Cant. disponibilă</th>
                    <th className="text-right px-4 py-2 text-xs uppercase text-slate-600">Preț unitar</th>
                    <th className="text-right px-4 py-2 text-xs uppercase text-slate-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rfq.items.map(item => {
                    const r = responses[item.id] || { unit_price: 0, available_quantity: item.quantity, notes: '' };
                    return (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-2">{item.description}{item.notes && <div className="text-xs text-slate-500">{item.notes}</div>}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-600">{item.quantity} {item.unit}</td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" min={0} step="0.01" value={r.available_quantity}
                            onChange={e => setResponses(prev => ({ ...prev, [item.id]: { ...r, available_quantity: Number(e.target.value) } }))}
                            className="w-24 text-right px-2 py-1 border rounded" />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" min={0} step="0.01" value={r.unit_price}
                            onChange={e => setResponses(prev => ({ ...prev, [item.id]: { ...r, unit_price: Number(e.target.value) } }))}
                            className="w-28 text-right px-2 py-1 border rounded" />
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold">{(r.unit_price * r.available_quantity).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right font-semibold">TOTAL OFERTĂ</td>
                    <td className="px-4 py-2 text-right tabular-nums font-bold text-base">{total.toFixed(2)} {currency}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="bg-white rounded-lg shadow border p-4 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs uppercase text-slate-600 mb-1">Termen livrare (zile)</label>
                <input type="number" min={0} value={leadTime} onChange={e => setLeadTime(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase text-slate-600 mb-1">Valabilitate ofertă (zile)</label>
                <input type="number" min={0} value={validity} onChange={e => setValidity(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase text-slate-600 mb-1">Monedă</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-2 py-1 border rounded text-sm">
                  <option value="RON">RON</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs uppercase text-slate-600 mb-1">Observații</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full px-2 py-1 border rounded text-sm" placeholder="Detalii suplimentare, condiții de plată, etc." />
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <button onClick={() => setShowDecline(true)} className="px-4 py-2 rounded border border-slate-300 text-sm text-slate-700 hover:bg-slate-100">
                Refuz cererea
              </button>
              <button onClick={() => submit(false)} disabled={submitting || total <= 0}
                className="px-6 py-2 rounded bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Trimite ofertă
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-base font-semibold mb-2">Confirmăți refuzul</h3>
            <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} rows={3}
              placeholder="Motiv refuz (opțional)" className="w-full px-2 py-1 border rounded text-sm mb-3" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDecline(false)} className="px-4 py-2 rounded border text-sm">
                <X className="h-4 w-4 inline mr-1" /> Anulează
              </button>
              <button onClick={() => submit(true)} disabled={submitting}
                className="px-4 py-2 rounded bg-red-600 text-white text-sm">Confirmă refuz</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
