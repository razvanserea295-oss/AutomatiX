










import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, type LucideIcon } from 'lucide-react';





const nf = new Intl.NumberFormat('ro-RO');

export function fmtNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return nf.format(Math.round(Number(n)));
}


export function fmtMoneyShort(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace('.', ',') + 'M';
  if (abs >= 10_000) return Math.round(v / 1000) + 'k';
  return nf.format(Math.round(v));
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'acum';
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  const d = Math.floor(h / 24);
  if (d < 30) return d + 'z';
  return Math.floor(d / 30) + 'l';
}

export function initials(name: string | null | undefined): string {
  const s = (name || '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}





export type Tone = 'green' | 'red' | 'amber' | 'blue' | 'teal' | 'purple' | 'neutral';

const TONE_CHIP: Record<Tone, string> = {
  green:  'bg-status-green/15 text-status-green',
  red:    'bg-status-red/15 text-status-red',
  amber:  'bg-status-amber/15 text-status-amber',
  blue:   'bg-status-blue/15 text-status-blue',
  teal:   'bg-status-teal/15 text-status-teal',
  purple: 'bg-status-purple/15 text-status-purple',
  neutral:'bg-surface-tertiary text-content-secondary',
};

const TONE_TEXT: Record<Tone, string> = {
  green:  'text-status-green',
  red:    'text-status-red',
  amber:  'text-status-amber',
  blue:   'text-status-blue',
  teal:   'text-status-teal',
  purple: 'text-status-purple',
  neutral:'text-content-primary',
};





export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-line bg-surface-secondary surface-card ${onClick ? 'active:bg-surface-tertiary transition-colors cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, count, action }: { children: ReactNode; count?: number; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-2 mt-4 first:mt-0">
      <h2 className="text-pm-eyebrow uppercase text-content-muted">{children}</h2>
      {count != null && (
        <span className="text-pm-2xs font-semibold text-content-muted tabular-nums">{count}</span>
      )}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

export function Tag({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-pm-2xs font-bold uppercase tracking-wide ${TONE_CHIP[tone]}`}>
      {children}
    </span>
  );
}

export function KpiTile({ label, value, sub, tone = 'neutral', icon: Icon, onClick }: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-line bg-surface-secondary surface-card p-3.5 ${onClick ? 'active:bg-surface-tertiary transition-colors cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-1.5 text-content-muted">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="text-pm-2xs font-bold uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className={`mt-2 text-pm-3xl font-semibold tabular-nums leading-none ${TONE_TEXT[tone]}`}>{value}</div>
      {sub != null && <div className="mt-1.5 text-pm-xs text-content-muted truncate">{sub}</div>}
    </div>
  );
}


export function ListRow({ children, right, onClick, accent }: {
  children: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  accent?: Tone;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="w-full flex items-stretch gap-3 px-3.5 py-3 text-left active:bg-surface-tertiary transition-colors disabled:opacity-100"
    >
      {accent && <span className={`w-1 rounded-full shrink-0 ${TONE_CHIP[accent].split(' ')[0].replace('/15', '')}`} />}
      <div className="min-w-0 flex-1">{children}</div>
      {right && <div className="shrink-0 self-center flex items-center">{right}</div>}
    </button>
  );
}

export function RowTitle({ children }: { children: ReactNode }) {
  return <div className="text-pm-md font-medium text-content-primary truncate">{children}</div>;
}

export function RowMeta({ children }: { children: ReactNode }) {
  return <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-pm-xs text-content-muted">{children}</div>;
}

export function Divider() {
  return <div className="h-px bg-line mx-3.5" />;
}

export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="grid place-items-center h-14 w-14 rounded-full bg-surface-tertiary text-content-muted mb-3">
        <Icon className="h-7 w-7" />
      </div>
      <p className="text-pm-md font-medium text-content-secondary">{title}</p>
      {hint && <p className="mt-1 text-pm-sm text-content-muted max-w-[15rem]">{hint}</p>}
    </div>
  );
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <Loader2 className={`animate-spin text-content-muted ${className}`} />;
}

export function CenterSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Spinner className="h-6 w-6" />
      {label && <p className="text-pm-sm text-content-muted">{label}</p>}
    </div>
  );
}





type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary:   'bg-accent text-surface-primary active:opacity-90',
  secondary: 'bg-surface-tertiary text-content-primary active:bg-surface-elevated',
  danger:    'bg-status-red/15 text-status-red active:bg-status-red/25',
  ghost:     'bg-transparent text-content-secondary active:bg-surface-tertiary',
};

export function MButton({ children, onClick, variant = 'primary', icon: Icon, disabled, busy, full, type = 'button' }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  icon?: LucideIcon;
  disabled?: boolean;
  busy?: boolean;
  full?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg text-pm-md font-semibold transition-all disabled:opacity-50 ${BTN_VARIANT[variant]} ${full ? 'w-full' : ''}`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}





export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3.5 px-3.5 py-0.5">
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-pm-sm font-medium transition-colors ${
              active ? 'bg-accent text-surface-primary' : 'bg-surface-secondary text-content-secondary border border-line active:bg-surface-tertiary'
            }`}
          >
            {o.label}
            {o.count != null && o.count > 0 && (
              <span className={`text-pm-2xs font-bold tabular-nums ${active ? 'opacity-80' : 'text-content-muted'}`}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}





export function Sheet({ open, onClose, title, subtitle, children, footer }: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setShown(false); return; }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const r = requestAnimationFrame(() => setShown(true));
    return () => { document.body.style.overflow = prev; cancelAnimationFrame(r); };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col justify-end" role="dialog" aria-modal="true">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`relative flex max-h-[88dvh] flex-col rounded-t-2xl border-t border-line bg-surface-primary shadow-2xl transition-transform duration-300 ease-out ${shown ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {}
        <div className="shrink-0 px-4 pt-2.5">
          <div className="mx-auto h-1 w-10 rounded-full bg-line" />
          {(title || subtitle) && (
            <div className="flex items-start gap-3 pt-3 pb-3 border-b border-line">
              <div className="min-w-0 flex-1">
                {title && <div className="text-pm-lg font-semibold text-content-primary leading-tight">{title}</div>}
                {subtitle && <div className="mt-0.5 text-pm-sm text-content-muted">{subtitle}</div>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 grid place-items-center h-9 w-9 -mr-1.5 rounded-full text-content-muted active:bg-surface-tertiary"
                aria-label="Închide"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-surface-primary">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}





export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-pm-xs font-semibold uppercase tracking-wide text-content-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      
      
      className="w-full min-h-[96px] rounded-lg border border-line bg-surface-secondary px-3 py-2.5 text-pm-lg text-content-primary placeholder:text-content-muted outline-none focus:border-accent transition-colors resize-none"
    />
  );
}
