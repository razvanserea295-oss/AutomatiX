import { useMemo, useState } from 'react';
import {
  Building2, Image as ImageIcon, Receipt, Users, CheckCircle2,
  ArrowRight, ArrowLeft, Loader2, Check, X, Plus, Trash2, Clock,
} from '@/icons';
import GearLogo from '@/components/ui/GearLogo';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import { useSetupStore, type SetupState } from '@/store/setupStore';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type StepId = 'firma' | 'brand' | 'fiscal' | 'utilizatori' | 'verificare';

const STEPS: { id: StepId; label: string; icon: typeof Building2 }[] = [
  { id: 'firma',       label: 'Date firmă',    icon: Building2 },
  { id: 'brand',       label: 'Logo & sigiliu', icon: ImageIcon },
  { id: 'fiscal',      label: 'Setări fiscale', icon: Receipt },
  { id: 'utilizatori', label: 'Utilizatori',   icon: Users },
  { id: 'verificare',  label: 'Verificare',    icon: CheckCircle2 },
];

interface InviteRow {
  full_name: string;
  username: string;
  email: string;
  password: string;
  role_id: number;
}

const ROLE_OPTIONS = [
  { id: 2, label: 'Utilizator' },
  { id: 3, label: 'Manager' },
];






export default function AdminSetupWizard() {
  const storeSettings = useSetupStore(s => s.settings);
  const snooze = useSetupStore(s => s.snooze);
  const markCompleted = useSetupStore(s => s.markCompleted);
  const refresh = useSetupStore(s => s.refresh);
  const reduce = useReducedMotion();

  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<SetupState>(() => ({
    company_name: '', cui: '', reg_com: '', address: '', city: '', county: '',
    phone: '', email: '', bank_name: '', iban: '',
    default_currency: 'RON',
    invoice_series: 'FAC', offer_series: 'OFR', aviz_series: 'AVZ',
    number_format: '{serie}-{nr}',
    logo_base64: '', seal_base64: '',
    ...storeSettings,
    
    tva_rate: storeSettings.tva_rate != null
      ? (storeSettings.tva_rate <= 1 ? Math.round(storeSettings.tva_rate * 100) : storeSettings.tva_rate)
      : 21,
  }));

  const [invites, setInvites] = useState<InviteRow[]>([]);

  const step = STEPS[stepIdx];
  const set = (patch: Partial<SetupState>) => setForm(f => ({ ...f, ...patch }));

  const transition = reduce ? '' : 'transition-all duration-300';

  async function persistStep(id: StepId): Promise<boolean> {
    setSaving(true);
    try {
      if (id === 'firma') {
        if (!form.company_name?.trim()) { toast.error('Numele firmei este obligatoriu'); return false; }
        await apiCommand('save_company_profile', {
          request: {
            company_name: form.company_name, cui: form.cui, reg_com: form.reg_com,
            address: form.address, city: form.city, county: form.county,
            phone: form.phone, email: form.email, bank_name: form.bank_name, iban: form.iban,
          },
        });
      } else if (id === 'brand') {
        await apiCommand('save_company_branding', {
          request: { logo_base64: form.logo_base64 || '', seal_base64: form.seal_base64 || '' },
        });
      } else if (id === 'fiscal') {
        await apiCommand('save_fiscal_settings', {
          request: {
            tva_rate: form.tva_rate, default_currency: form.default_currency,
            invoice_series: form.invoice_series, invoice_next_number: form.invoice_next_number ?? 1,
            offer_series: form.offer_series, offer_next_number: form.offer_next_number ?? 1,
            aviz_series: form.aviz_series, aviz_next_number: form.aviz_next_number ?? 1,
            number_format: form.number_format,
          },
        });
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la salvare');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function next() {
    if (!(await persistStep(step.id))) return;
    setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
  }

  function back() {
    setStepIdx(i => Math.max(i - 1, 0));
  }

  async function createInvites(): Promise<boolean> {
    const rows = invites.filter(r => r.username.trim() && r.email.trim() && r.password);
    if (rows.length === 0) return true;
    let ok = 0;
    for (const r of rows) {
      try {
        await apiCommand('create_user', {
          request: {
            username: r.username.trim(), email: r.email.trim(),
            full_name: r.full_name.trim() || r.username.trim(),
            password: r.password, role_id: r.role_id,
          },
        });
        ok++;
      } catch (err) {
        toast.error(`${r.username}: ${err instanceof Error ? err.message : 'eroare'}`);
      }
    }
    if (ok > 0) toast.success(`${ok} utilizator(i) creat(i)`);
    return true;
  }

  async function finalize() {
    setSaving(true);
    try {
      await createInvites();
      await apiCommand('complete_initial_setup');
      markCompleted();
      await refresh();
      toast.success('Configurare inițială finalizată');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la finalizare');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center aurora-backdrop p-4" role="dialog" aria-modal="true" aria-label="Configurare inițială">
      <div className="aurora-backdrop-orb" aria-hidden />

      <div className={`relative z-10 w-full max-w-2xl bg-surface-secondary/95 backdrop-blur-xl border border-line rounded-2xl shadow-soft-lg overflow-hidden ${transition}`}>
        {}
        <div className="px-6 pt-5 pb-4 border-b border-line">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
                <GearLogo size={20} />
              </div>
              <div>
                <h1 className="text-base font-bold text-content-primary leading-tight">Configurare inițială</h1>
                <p className="text-pm-xs text-content-muted">Pasul {stepIdx + 1} din {STEPS.length} · {step.label}</p>
              </div>
            </div>
            <button
              onClick={snooze}
              className="inline-flex items-center gap-1.5 text-pm-xs text-content-muted hover:text-content-primary transition-colors"
              title="Continuă mai târziu din Setări"
            >
              <Clock className="h-3.5 w-3.5" /> Mai târziu
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                <div className={`h-1 w-full rounded-full ${i <= stepIdx ? 'bg-accent' : 'bg-surface-tertiary'} ${transition}`} />
                <s.icon className={`h-3.5 w-3.5 ${i === stepIdx ? 'text-accent' : i < stepIdx ? 'text-status-green' : 'text-content-muted'}`} />
              </div>
            ))}
          </div>
        </div>

        {}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {step.id === 'firma' && <FirmaStep form={form} set={set} />}
          {step.id === 'brand' && <BrandStep form={form} set={set} />}
          {step.id === 'fiscal' && <FiscalStep form={form} set={set} />}
          {step.id === 'utilizatori' && <UsersStep invites={invites} setInvites={setInvites} />}
          {step.id === 'verificare' && <VerifyStep form={form} invites={invites} />}
        </div>

        {}
        <div className="px-6 py-4 border-t border-line flex items-center justify-between">
          <button
            onClick={back}
            disabled={stepIdx === 0 || saving}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-pm-xs font-semibold text-content-secondary hover:bg-surface-tertiary disabled:opacity-40 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Înapoi
          </button>

          {step.id === 'verificare' ? (
            <button
              onClick={finalize}
              disabled={saving}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-accent text-on-accent font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Finalizează
            </button>
          ) : (
            <button
              onClick={next}
              disabled={saving}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-accent text-on-accent font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continuă <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-pm-2xs font-semibold uppercase tracking-wide text-content-muted mb-1">{label}</span>
      {children}
      {hint && <span className="block text-pm-2xs text-content-muted mt-1">{hint}</span>}
    </label>
  );
}

const inputCls =
  'w-full h-9 rounded-lg border border-line bg-surface-primary px-3 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent';

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} />;
}



function FirmaStep({ form, set }: { form: SetupState; set: (p: Partial<SetupState>) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Nume firmă *">
        <TextInput value={form.company_name ?? ''} onChange={e => set({ company_name: e.target.value })} placeholder="SC Exemplu SRL" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CUI"><TextInput value={form.cui ?? ''} onChange={e => set({ cui: e.target.value })} placeholder="RO12345678" /></Field>
        <Field label="Nr. Reg. Com. (J)"><TextInput value={form.reg_com ?? ''} onChange={e => set({ reg_com: e.target.value })} placeholder="J40/123/2020" /></Field>
      </div>
      <Field label="Sediu (stradă, nr.)">
        <TextInput value={form.address ?? ''} onChange={e => set({ address: e.target.value })} placeholder="Str. Industriei nr. 1" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Localitate"><TextInput value={form.city ?? ''} onChange={e => set({ city: e.target.value })} /></Field>
        <Field label="Județ"><TextInput value={form.county ?? ''} onChange={e => set({ county: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Telefon"><TextInput value={form.phone ?? ''} onChange={e => set({ phone: e.target.value })} placeholder="07xx xxx xxx" /></Field>
        <Field label="Email"><TextInput type="email" value={form.email ?? ''} onChange={e => set({ email: e.target.value })} placeholder="contact@firma.ro" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bancă"><TextInput value={form.bank_name ?? ''} onChange={e => set({ bank_name: e.target.value })} /></Field>
        <Field label="IBAN principal"><TextInput value={form.iban ?? ''} onChange={e => set({ iban: e.target.value })} placeholder="RO49 AAAA 1B31..." /></Field>
      </div>
    </div>
  );
}

function ImageUpload({ label, value, onChange }: { label: string; value: string; onChange: (b64: string) => void }) {
  const [loading, setLoading] = useState(false);
  const onFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 2_500_000) { toast.error('Imaginea depășește 2.5 MB'); return; }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => { onChange(String(reader.result || '')); setLoading(false); };
    reader.onerror = () => { toast.error('Nu am putut citi fișierul'); setLoading(false); };
    reader.readAsDataURL(file);
  };
  return (
    <div className="rounded-lg border border-line bg-surface-tertiary/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">{label}</span>
        {value && (
          <button onClick={() => onChange('')} className="text-content-muted hover:text-status-red" title="Elimină">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {value ? (
        <div className="flex items-center justify-center bg-white rounded-md p-3 border border-line">
          <img src={value} alt={label} className="max-h-20 object-contain" />
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-md border-2 border-dashed border-line cursor-pointer hover:border-accent/50 transition-colors">
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-content-muted" /> : <ImageIcon className="h-5 w-5 text-content-muted" />}
          <span className="text-pm-xs text-content-muted">Încarcă imagine (PNG/JPG)</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => onFile(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );
}

function BrandStep({ form, set }: { form: SetupState; set: (p: Partial<SetupState>) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-content-secondary">
        Logo-ul apare pe documentele oficiale (facturi, oferte, contracte). Sigiliul este opțional.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <ImageUpload label="Logo" value={form.logo_base64 ?? ''} onChange={b => set({ logo_base64: b })} />
        <ImageUpload label="Sigiliu (opțional)" value={form.seal_base64 ?? ''} onChange={b => set({ seal_base64: b })} />
      </div>
    </div>
  );
}

function FiscalStep({ form, set }: { form: SetupState; set: (p: Partial<SetupState>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cotă TVA implicită (%)">
          <TextInput type="number" min={0} max={100} value={form.tva_rate ?? 21} onChange={e => set({ tva_rate: Number(e.target.value) })} />
        </Field>
        <Field label="Monedă implicită">
          <select className={inputCls} value={form.default_currency ?? 'RON'} onChange={e => set({ default_currency: e.target.value })}>
            <option value="RON">RON</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Serie factură"><TextInput value={form.invoice_series ?? ''} onChange={e => set({ invoice_series: e.target.value })} /></Field>
        <Field label="Serie ofertă"><TextInput value={form.offer_series ?? ''} onChange={e => set({ offer_series: e.target.value })} /></Field>
        <Field label="Serie aviz"><TextInput value={form.aviz_series ?? ''} onChange={e => set({ aviz_series: e.target.value })} /></Field>
      </div>
      <Field label="Format numerotare" hint="Placeholdere: {serie} și {nr}. Ex: {serie}-{nr} → FAC-001">
        <TextInput value={form.number_format ?? ''} onChange={e => set({ number_format: e.target.value })} placeholder="{serie}-{nr}" />
      </Field>
    </div>
  );
}

function UsersStep({ invites, setInvites }: { invites: InviteRow[]; setInvites: (v: InviteRow[]) => void }) {
  const add = () => setInvites([...invites, { full_name: '', username: '', email: '', password: '', role_id: 2 }]);
  const update = (i: number, patch: Partial<InviteRow>) =>
    setInvites(invites.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const remove = (i: number) => setInvites(invites.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <p className="text-sm text-content-secondary">
        Opțional — invită câțiva utilizatori cheie acum. Poți sări acest pas și adăuga utilizatori oricând din Setări.
      </p>
      {invites.map((r, i) => (
        <div key={i} className="rounded-lg border border-line bg-surface-tertiary/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Utilizator {i + 1}</span>
            <button onClick={() => remove(i)} className="text-content-muted hover:text-status-red"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextInput placeholder="Nume complet" value={r.full_name} onChange={e => update(i, { full_name: e.target.value })} />
            <TextInput placeholder="Utilizator (login)" value={r.username} onChange={e => update(i, { username: e.target.value })} />
            <TextInput type="email" placeholder="Email" value={r.email} onChange={e => update(i, { email: e.target.value })} />
            <TextInput type="password" placeholder="Parolă temporară (min. 8)" value={r.password} onChange={e => update(i, { password: e.target.value })} />
          </div>
          <select className={inputCls} value={r.role_id} onChange={e => update(i, { role_id: Number(e.target.value) })}>
            {ROLE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      ))}
      {invites.length < 3 && (
        <button onClick={add} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-dashed border-line text-pm-xs font-semibold text-content-secondary hover:border-accent/50 transition-colors">
          <Plus className="h-4 w-4" /> Adaugă utilizator
        </button>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-line/60 last:border-0">
      <span className="text-pm-xs text-content-muted">{label}</span>
      <span className="text-pm-xs text-content-primary font-medium text-right">{value || '—'}</span>
    </div>
  );
}

function VerifyStep({ form, invites }: { form: SetupState; invites: InviteRow[] }) {
  const addr = useMemo(() => [form.address, form.city, form.county].filter(Boolean).join(', '), [form]);
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-surface-tertiary/40 p-4">
        <h3 className="text-pm-xs font-semibold text-content-primary mb-2 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-accent" /> Firmă</h3>
        <Row label="Nume" value={form.company_name ?? ''} />
        <Row label="CUI" value={form.cui ?? ''} />
        <Row label="Reg. Com." value={form.reg_com ?? ''} />
        <Row label="Sediu" value={addr} />
        <Row label="Contact" value={[form.phone, form.email].filter(Boolean).join(' · ')} />
        <Row label="IBAN" value={form.iban ?? ''} />
      </div>
      <div className="rounded-lg border border-line bg-surface-tertiary/40 p-4">
        <h3 className="text-pm-xs font-semibold text-content-primary mb-2 flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5 text-accent" /> Fiscal</h3>
        <Row label="TVA implicit" value={`${form.tva_rate ?? 21}%`} />
        <Row label="Monedă" value={form.default_currency ?? 'RON'} />
        <Row label="Serii" value={[form.invoice_series, form.offer_series, form.aviz_series].filter(Boolean).join(' · ')} />
        <Row label="Format nr." value={form.number_format ?? ''} />
        <Row label="Logo" value={form.logo_base64 ? 'încărcat' : 'lipsă'} />
      </div>
      {invites.filter(r => r.username.trim()).length > 0 && (
        <div className="rounded-lg border border-line bg-surface-tertiary/40 p-4">
          <h3 className="text-pm-xs font-semibold text-content-primary mb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-accent" /> Utilizatori de invitat</h3>
          {invites.filter(r => r.username.trim()).map((r, i) => (
            <Row key={i} label={r.username} value={ROLE_OPTIONS.find(o => o.id === r.role_id)?.label ?? '—'} />
          ))}
        </div>
      )}
      <p className="text-pm-xs text-content-muted">
        La finalizare, configurarea nu va mai apărea la următoarele autentificări. O poți relua oricând din Setări.
      </p>
    </div>
  );
}
