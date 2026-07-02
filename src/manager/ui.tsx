import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Loader2, Copy, Check, X } from '@/icons';

export function GearMark({ size = 30 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="mgr-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#16307A" />
          <stop offset="0.55" stopColor="#2F7CF0" />
          <stop offset="1" stopColor="#16C7FF" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="20" fill="url(#mgr-g)" />
      <g transform="translate(14 14) scale(0.68)" stroke="#FFFFFF" fill="none">
        <path d="M50 8 L86.4 29 L86.4 71 L50 92 L13.6 71 L13.6 29 Z" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M29 50 H71" strokeWidth="5" strokeLinecap="round" />
        <circle cx="29" cy="50" r="7" strokeWidth="5" fill="none" />
        <circle cx="50" cy="50" r="4.5" fill="#FFFFFF" stroke="none" />
        <circle cx="71" cy="50" r="6" fill="#FFFFFF" stroke="none" />
      </g>
    </svg>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'subtle';
  size?: 'sm' | 'md';
  loading?: boolean;
};
export function Btn({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...rest }: BtnProps) {
  return (
    <button
      className={`mgr-btn mgr-btn-${variant} mgr-btn-${size} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 size={size === 'sm' ? 14 : 16} className="mgr-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="mgr-field">
      <span className="mgr-field-label">{label}</span>
      {children}
      {hint && <span className="mgr-field-hint">{hint}</span>}
    </label>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="mgr-spinner">
      <Loader2 size={20} className="mgr-spin" />
      {label && <span>{label}</span>}
    </div>
  );
}

export function EmptyState({ icon, title, text }: { icon?: ReactNode; title: string; text?: string }) {
  return (
    <div className="mgr-empty">
      {icon && <div className="mgr-empty-ic">{icon}</div>}
      <div className="mgr-empty-title">{title}</div>
      {text && <div className="mgr-empty-text">{text}</div>}
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'blue' | 'gray'; children: ReactNode }) {
  return <span className={`mgr-pill mgr-pill-${tone}`}>{children}</span>;
}

export function CopyBtn({ text, label = 'Copiază' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="mgr-copy"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1600); } catch { /* ignore */ }
      }}
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
      {done ? 'Copiat' : label}
    </button>
  );
}

export interface ToastMsg { id: number; kind: 'ok' | 'err'; text: string }
export function Toasts({ items, onDismiss }: { items: ToastMsg[]; onDismiss: (id: number) => void }) {
  return (
    <div className="mgr-toasts">
      {items.map((t) => (
        <div key={t.id} className={`mgr-toast mgr-toast-${t.kind}`} role="status">
          <span>{t.text}</span>
          <button onClick={() => onDismiss(t.id)} aria-label="Închide"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

let toastSeq = 1;
export function useToasts() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  function push(kind: 'ok' | 'err', text: string) {
    const id = toastSeq++;
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4200);
  }
  const dismiss = (id: number) => setItems((s) => s.filter((t) => t.id !== id));
  return { items, push, dismiss };
}

export function Modal({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="mgr-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mgr-modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="mgr-modal-head">
          <h3>{title}</h3>
          <button className="mgr-modal-x" onClick={onClose} aria-label="Închide"><X size={18} /></button>
        </div>
        <div className="mgr-modal-body">{children}</div>
        {footer && <div className="mgr-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function fmtDate(s?: string): string {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('ro-RO', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return s; }
}

export function fmtDay(s?: string): string {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('ro-RO', { dateStyle: 'medium' }); }
  catch { return s; }
}
