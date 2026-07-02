import { useState, useCallback } from 'react';
import { Copy, Check } from '@/icons';

// ── shared hook ───────────────────────────────────────────────────────────

function fallbackCopy(text: string, done: () => void) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); } catch { /* ignore */ }
  document.body.removeChild(ta);
  done();
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const confirm = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    };
    const p = navigator.clipboard?.writeText(text);
    if (p) p.then(confirm).catch(() => fallbackCopy(text, confirm));
    else fallbackCopy(text, confirm);
  }, [text]);
  return { copied, copy };
}

// ── CopyButton ────────────────────────────────────────────────────────────
// Standalone icon-button. Use when you want explicit placement.

export interface CopyButtonProps {
  text: string;
  size?: 'xs' | 'sm';
  className?: string;
}

export function CopyButton({ text, size = 'sm', className = '' }: CopyButtonProps) {
  const { copied, copy } = useCopy(text);
  const icon = size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const btn  = size === 'xs' ? 'h-5 w-5'  : 'h-6 w-6';

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? 'Copiat!' : 'Copiază'}
      aria-label={copied ? 'Copiat!' : 'Copiază'}
      className={`inline-flex items-center justify-center rounded-md ${btn} text-content-muted transition-smooth duration-150 hover:bg-surface-tertiary hover:text-content-primary active:scale-90 focus:outline-none focus-visible:shadow-[var(--ring-soft)] ${className}`}
    >
      {copied
        ? <Check className={`${icon} text-status-green`} />
        : <Copy className={icon} />}
    </button>
  );
}

// ── CopyText ──────────────────────────────────────────────────────────────
// Wraps any inline content; shows a copy icon on hover / focus.
//
// Usage:
//   <CopyText text="INV-0042">INV-0042</CopyText>
//   <CopyText text={phone}><a href={`tel:${phone}`}>{phone}</a></CopyText>

export interface CopyTextProps {
  text: string;
  children: React.ReactNode;
  className?: string;
  size?: 'xs' | 'sm';
}

export function CopyText({ text, children, className = '', size = 'xs' }: CopyTextProps) {
  const { copied, copy } = useCopy(text);
  const icon = size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <span className={`group/copy inline-flex items-center gap-1 ${className}`}>
      {children}
      <button
        type="button"
        onClick={copy}
        title={copied ? 'Copiat!' : 'Copiază'}
        aria-label={copied ? 'Copiat!' : 'Copiază'}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-content-muted opacity-0 transition-smooth duration-100 group-hover/copy:opacity-100 hover:bg-surface-tertiary hover:text-content-primary active:scale-90 focus:outline-none focus-visible:opacity-100 focus-visible:shadow-[var(--ring-soft)]"
      >
        {copied
          ? <Check className={`${icon} text-status-green`} />
          : <Copy className={icon} />}
      </button>
    </span>
  );
}

export default CopyButton;
