import { useEffect, useState, type FormEvent } from 'react';
import {
  KeyRound, Copy, Check, Loader2, AlertCircle, ShieldCheck, Building2,
  RefreshCw,
} from '@/icons';
import { apiCommand } from '@/api/commands';
import Page from '@/redesign/ui/Page';
import KpiCard from '@/redesign/ui/KpiCard';
import Button from '@/redesign/ui/Button';
import { EmptyState } from '@/redesign/ui';
import { THEAD_STICKY } from '@/redesign/ui/SortableTh';
import { PageChrome, DashboardLayout, Panel } from '@/app-ui';

interface Issued {
  license_id: string;
  company_name: string;
  email: string;
  cui: string;
  issued_at: string;
  token: string;
  issued_by: string;
  created_at: string;
}

function fmtDate(s: string): string {
  try { return new Date(s).toLocaleString('ro-RO', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return s || '—'; }
}

function CopyBtn({ text, label = 'Copiază' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1600); } catch { /* ignore */ }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-secondary/60 px-2.5 py-1.5 text-pm-xs font-medium text-content-secondary transition-smooth hover:bg-surface-tertiary hover:text-content-primary"
    >
      {done ? <Check className="h-3.5 w-3.5 text-status-green" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? 'Copiat' : label}
    </button>
  );
}

export default function LicensesPage() {
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [cui, setCui] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Issued | null>(null);
  const [list, setList] = useState<Issued[]>([]);
  const [keyReady, setKeyReady] = useState(true);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const r = await apiCommand<{ issued: Issued[] }>('list_issued_licenses');
      setList(r.issued || []);
    } catch { /* not an issuer / no rows */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    apiCommand<{ can_issue: boolean; key_ready: boolean }>('get_license_issuer_state')
      .then((s) => setKeyReady(!!s.key_ready))
      .catch(() => { /* ignore */ });
    refresh();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const c = company.trim();
    if (!c) { setErr('Numele firmei este obligatoriu.'); return; }
    setBusy(true); setErr(null); setFresh(null);
    try {
      const r = await apiCommand<Issued & { ok: boolean }>('create_license', {
        company_name: c, email: email.trim(), cui: cui.trim(),
      });
      setFresh(r);
      setCompany(''); setEmail(''); setCui('');
      refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Generare eșuată.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardLayout
        
        chrome={(
          <PageChrome
            actions={
              <Button size="md" variant="outline" onClick={() => void refresh()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Reîmprospătează
              </Button>
            }
          />
        )}
      kpis={
        <Page.Kpis cols={4}>
          <KpiCard label="Licențe emise" value={list.length} icon={Building2} />
          <KpiCard label="Cheie semnare" value={keyReady ? 'Activă' : 'Lipsă'} icon={ShieldCheck} iconColor={keyReady ? 'text-status-green' : 'text-status-amber'} />
          <KpiCard label="Ultima emisă" value={list[0]?.company_name || '—'} icon={KeyRound} />
          <KpiCard label="Status server" value={keyReady ? 'Gata' : 'Configurare'} icon={AlertCircle} iconColor={keyReady ? 'text-status-green' : 'text-status-red'} />
        </Page.Kpis>
      }
    >
      <Panel fill scroll className="flex-1 min-h-0" padding="none" bodyClassName="!p-0">
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 lg:p-6">
        {!keyReady && (
          <div className="flex items-start gap-2 rounded-xl border-l-2 border-status-amber bg-status-amber/8 px-4 py-3 text-pm-sm text-content-secondary">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-amber" />
            <span>Cheia privată de semnare nu este configurată pe acest server. Generarea va eșua până când este setată (vezi <code className="text-pm-xs">AUTOMATIX_LICENSE_PRIVKEY_FILE</code>).</span>
          </div>
        )}

        <Panel title="Licență nouă" subtitle="Completează datele firmei și generează cheia">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5 sm:col-span-3">
                <span className="text-pm-xs font-medium text-content-muted">Firmă *</span>
                <input value={company} onChange={(e) => { setCompany(e.target.value); if (err) setErr(null); }}
                  placeholder="Firma SRL"
                  className="rounded-xl border border-line bg-surface-secondary/50 px-3.5 py-2.5 text-pm-sm outline-none transition-smooth focus:border-accent focus-visible:shadow-[var(--ring-soft)]" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-pm-xs font-medium text-content-muted">Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="contact@firma.ro"
                  className="rounded-xl border border-line bg-surface-secondary/50 px-3.5 py-2.5 text-pm-sm outline-none transition-smooth focus:border-accent focus-visible:shadow-[var(--ring-soft)]" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-pm-xs font-medium text-content-muted">CUI</span>
                <input value={cui} onChange={(e) => setCui(e.target.value)} placeholder="RO12345678"
                  className="rounded-xl border border-line bg-surface-secondary/50 px-3.5 py-2.5 text-pm-sm outline-none transition-smooth focus:border-accent focus-visible:shadow-[var(--ring-soft)]" />
              </label>
              <div className="flex items-end">
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {busy ? 'Se generează…' : 'Generează'}
                </Button>
              </div>
            </div>
            {err && (
              <div className="flex items-start gap-2 rounded-lg border-l-2 border-status-red bg-status-red/8 px-3 py-2 text-pm-xs text-content-secondary">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-red" /> <span>{err}</span>
              </div>
            )}
          </form>
        </Panel>

        {fresh && (
          <Panel title="Licență generată" subtitle={fresh.company_name} className="border-status-green/35 bg-status-green/8">
            <p className="mb-3 text-pm-xs text-content-muted">Copiază cheia de mai jos și trimite-o clientului. O găsești oricând în listă.</p>
            <div className="flex items-start gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg border border-line bg-surface-secondary/60 px-3 py-2.5 font-mono text-pm-xs text-content-primary">{fresh.token}</code>
              <CopyBtn text={fresh.token} label="Copiază cheia" />
            </div>
          </Panel>
        )}

        <Panel
          title="Licențe emise"
          subtitle={loading ? 'Se încarcă…' : `${list.length} înregistrări`}
          bodyClassName="!p-0"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-content-muted">
              <Loader2 className="h-5 w-5 animate-spin" /> <span className="text-pm-sm">Se încarcă…</span>
            </div>
          ) : list.length === 0 ? (
            <EmptyState icon={Building2} title="Nicio licență emisă încă" description="Generează prima licență folosind formularul de mai sus." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-pm-sm">
                <thead className={THEAD_STICKY}>
                  <tr className="border-b border-line text-pm-xs uppercase tracking-wide text-content-muted">
                    <th className="px-4 py-3 font-semibold">Firmă</th>
                    <th className="px-4 py-3 font-semibold">CUI</th>
                    <th className="px-4 py-3 font-semibold">Emisă</th>
                    <th className="px-4 py-3 font-semibold">De</th>
                    <th className="px-4 py-3 font-semibold text-right">Cheie</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((l) => (
                    <tr key={l.license_id} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-content-primary">{l.company_name || '—'}</div>
                        {l.email && <div className="text-pm-xs text-content-muted">{l.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-content-secondary">{l.cui || '—'}</td>
                      <td className="px-4 py-3 text-content-muted">{fmtDate(l.created_at || l.issued_at)}</td>
                      <td className="px-4 py-3 text-content-muted">{l.issued_by || '—'}</td>
                      <td className="px-4 py-3 text-right"><CopyBtn text={l.token} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <p className="text-pm-2xs text-content-muted">
          Cheile sunt semnate criptografic pe server. Accesul la această pagină este restricționat la conturile autorizate.
        </p>
      </div>
      </Panel>
    </DashboardLayout>
  );
}
