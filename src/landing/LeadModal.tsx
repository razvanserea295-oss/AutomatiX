import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, CalendarClock, KeyRound } from '@/icons';

export type LeadType = 'access' | 'demo';

const COPY: Record<LeadType, { title: string; sub: string; cta: string; icon: JSX.Element }> = {
  demo: {
    title: 'Cere o demonstrație',
    sub: 'Îți arătăm Automatix pe un caz real, în ~30 de minute. Fără obligații.',
    cta: 'Trimite cererea',
    icon: <CalendarClock size={18} />,
  },
  access: {
    title: 'Cere acces',
    sub: 'Revenim rapid cu pașii de activare — pui cheia și echipa ta e online cu datele voastre.',
    cta: 'Trimite cererea',
    icon: <KeyRound size={18} />,
  },
};

export default function LeadModal({
  open,
  type,
  onClose,
}: {
  open: boolean;
  type: LeadType;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  // Reset transient state whenever the modal (re)opens or switches type.
  useEffect(() => {
    if (open) {
      setDone(false); setErr(null); setBusy(false);
      const t = setTimeout(() => firstField.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open, type]);

  useEffect(() => {
    if (!open) return;
    // Remember what was focused so we can restore it on close.
    lastFocused.current = (document.activeElement as HTMLElement) || null;

    const focusables = (): HTMLElement[] => {
      const root = modalRef.current;
      if (!root) return [];
      return Array.from(root.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
      )).filter((el) => el.offsetParent !== null || el === document.activeElement);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      // Trap focus inside the dialog.
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      else if (!modalRef.current?.contains(active)) { e.preventDefault(); first.focus(); }
    };

    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      // Restore focus to the trigger that opened the modal.
      try { lastFocused.current?.focus(); } catch { /* ignore */ }
    };
  }, [open, onClose]);

  if (!open) return null;
  const c = COPY[type];

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      type,
      name: String(fd.get('name') || ''),
      company: String(fd.get('company') || ''),
      email: String(fd.get('email') || ''),
      phone: String(fd.get('phone') || ''),
      message: String(fd.get('message') || ''),
      website: String(fd.get('website') || ''), // honeypot
    };
    try {
      const r = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) setDone(true);
      else setErr(data.message || 'Nu am putut trimite cererea. Încearcă din nou.');
    } catch {
      setErr('Eroare de rețea. Încearcă din nou.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lp-modal-backdrop" onMouseDown={onClose}>
      <div
        ref={modalRef}
        className="lp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="lp-modal-x" onClick={onClose} aria-label="Închide"><X size={18} /></button>

        {done ? (
          <div className="lp-modal-done">
            <span className="lp-modal-done-ic"><CheckCircle2 size={30} /></span>
            <h3 id="lead-modal-title">Mulțumim!</h3>
            <p>Am primit cererea ta. Te contactăm în cel mai scurt timp.</p>
            <button className="lp-btn lp-btn-primary" onClick={onClose}>Închide</button>
          </div>
        ) : (
          <>
            <div className="lp-modal-head">
              <span className="lp-modal-ic">{c.icon}</span>
              <div>
                <h3 id="lead-modal-title">{c.title}</h3>
                <p>{c.sub}</p>
              </div>
            </div>

            <form className="lp-form" onSubmit={submit}>
              <div className="lp-form-row">
                <label className="lp-field">
                  <span>Nume *</span>
                  <input ref={firstField} name="name" required aria-required="true" autoComplete="name" className="lp-input" placeholder="Ion Popescu" />
                </label>
                <label className="lp-field">
                  <span>Firmă</span>
                  <input name="company" autoComplete="organization" className="lp-input" placeholder="Firma SRL" />
                </label>
              </div>
              <div className="lp-form-row">
                <label className="lp-field">
                  <span>Email</span>
                  <input name="email" type="email" autoComplete="email" className="lp-input" placeholder="nume@firma.ro" />
                </label>
                <label className="lp-field">
                  <span>Telefon</span>
                  <input name="phone" autoComplete="tel" className="lp-input" placeholder="07xx xxx xxx" />
                </label>
              </div>
              <label className="lp-field">
                <span>Mesaj (opțional)</span>
                <textarea name="message" rows={3} className="lp-input lp-textarea" placeholder="Spune-ne pe scurt ce te interesează…" />
              </label>

              {/* honeypot — hidden from humans */}
              <input name="website" tabIndex={-1} autoComplete="off" className="lp-honeypot" aria-hidden="true" />

              <p className="lp-form-hint">Lasă cel puțin un email sau un telefon ca să te putem contacta.</p>

              {err && (
                <div className="lp-msg err" role="status" aria-live="polite"><AlertCircle size={16} /> <span>{err}</span></div>
              )}

              <div className="lp-modal-actions">
                <button type="button" className="lp-btn lp-btn-ghost" onClick={onClose}>Renunță</button>
                <button type="submit" className="lp-btn lp-btn-primary" disabled={busy}>
                  {busy ? <Loader2 size={18} className="spin" /> : c.icon}
                  {busy ? 'Se trimite…' : c.cta}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
