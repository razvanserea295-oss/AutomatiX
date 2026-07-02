import React, { useEffect, useRef } from 'react';
import { X } from '@/icons';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

export type PageDrawerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface PageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: PageDrawerSize;
  /** If true (default), clicking the scrim closes the drawer */
  closeOnBackdrop?: boolean;
  /** Light scrim over page content. Default true */
  scrim?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  /** Block Escape / backdrop close (e.g. while saving) */
  preventClose?: boolean;
  className?: string;
  panelClassName?: string;
  bodyClassName?: string;
  ariaLabel?: string;
}

const sizeClasses: Record<PageDrawerSize, string> = {
  sm: 'w-full sm:w-[400px]',
  md: 'w-full sm:w-[520px]',
  lg: 'w-full sm:w-[720px]',
  xl: 'w-full sm:w-[960px]',
  '2xl': 'w-full sm:w-[1100px]',
  full: 'w-full',
};

export default function PageDrawer({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  scrim = true,
  header,
  footer,
  showCloseButton = true,
  preventClose = false,
  className,
  panelClassName,
  bodyClassName,
  ariaLabel,
}: PageDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const prevFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    prevFocusedElement.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    if (!panel) {
      return () => {
        document.body.style.overflow = '';
        prevFocusedElement.current?.focus();
      };
    }

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>(focusableSelectors),
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || focusableElements.length === 0) return;
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.body.style.overflow = '';
      prevFocusedElement.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || preventClose) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, preventClose]);

  if (!isOpen) return null;

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (preventClose || !closeOnBackdrop) return;
    if (e.target === e.currentTarget) onClose();
  };

  const content = (
    <div
      className={cn('page-drawer-host fixed inset-0 z-40 flex justify-end', className)}
      onMouseDown={handleBackdrop}
    >
      {scrim && (
        <div
          className="pointer-events-none absolute inset-0 bg-content-primary/12 backdrop-blur-[1px] anim-fade-in"
          aria-hidden
        />
      )}

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={header ? undefined : title ? 'page-drawer-title' : undefined}
        aria-label={ariaLabel ?? (!header && !title ? 'Panou' : undefined)}
        tabIndex={-1}
        className={cn(
          'relative z-[1] flex h-full max-h-[100dvh] flex-col',
          'bg-surface-primary border-l border-line/70',
          'shadow-[var(--elevation-3)]',
          'anim-slide-in-right ixn-base',
          sizeClasses[size],
          panelClassName,
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {header ? (
          <div className="shrink-0 border-b border-line/70 px-5 h-14 flex items-center justify-between gap-3">
            {header}
          </div>
        ) : title ? (
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 h-14 border-b border-line/70">
            <h2 id="page-drawer-title" className="min-w-0 flex-1 text-pm-md font-semibold text-content-primary truncate">
              {title}
            </h2>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                disabled={preventClose}
                className="ixn-base ixn-press ixn-focus inline-flex shrink-0 items-center justify-center rounded-xl p-2 text-content-muted transition-smooth duration-150 hover:bg-surface-tertiary hover:text-content-primary focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:opacity-50"
                aria-label="Închide"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : null}

        <div className={cn('flex-1 min-h-0 overflow-y-auto overscroll-contain p-5', bodyClassName)}>
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-line/70 bg-surface-secondary/40 px-5 py-3">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );

  return createPortal(content, document.body);
}
