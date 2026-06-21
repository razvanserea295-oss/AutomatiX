import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface CenteredDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** If true, clicking the backdrop closes the dialog */
  closeOnBackdrop?: boolean;
  /** Custom header content (replaces title bar) */
  header?: React.ReactNode;
  /** Custom footer content */
  footer?: React.ReactNode;
  /** Show default close button (only if no custom header) */
  showCloseButton?: boolean;
}

export default function CenteredDialog({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  header,
  footer,
  showCloseButton = true,
}: CenteredDialogProps) {
  const focusRef = useRef<HTMLDivElement>(null);
  const prevFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      prevFocusedElement.current = document.activeElement as HTMLElement;
      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Trap focus within the dialog
      const container = focusRef.current;
      if (!container) return;

      const focusableSelectors = [
        'a[href]',
        'area[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors)
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Focus the first element
      if (firstElement) {
        firstElement.focus();
      }

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (focusableElements.length === 0) return;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      };

      document.addEventListener('keydown', handleTabKey);
      return () => document.removeEventListener('keydown', handleTabKey);
    }

    return () => {
      document.body.style.overflow = '';
      // Restore focus when dialog closes
      if (prevFocusedElement.current) {
        prevFocusedElement.current.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'w-full sm:w-[400px]',
    md: 'w-full sm:w-[520px]',
    lg: 'w-full sm:w-[720px]',
    xl: 'w-full sm:w-[960px]',
    '2xl': 'w-full sm:w-[1100px]',
  };

  const dialogContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in"
      onMouseDown={closeOnBackdrop ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
      aria-hidden="true"
    >
      <div
        ref={focusRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={header ? undefined : "centered-dialog-title"}
        className={`bg-surface-elevated border border-line rounded-2xl shadow-[var(--elevation-4)] flex flex-col ${sizeClasses[size]} max-h-[90vh] animate-scale-in`}
        style={{ animationDuration: '200ms', animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        tabIndex={-1}
      >
        {header ? (
          <div className="shrink-0 flex items-center justify-between px-5 h-14 border-b border-line/70 bg-surface-secondary">
            {header}
          </div>
        ) : title ? (
          <div className="shrink-0 flex items-center justify-between px-5 h-14 border-b border-line/70 bg-surface-secondary">
            <h2 id="centered-dialog-title" className="text-pm-sm font-semibold text-content-primary truncate">
              {title}
            </h2>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-all duration-150 cursor-pointer focus-ring-soft"
                aria-label="Închide"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : null}

        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-line/70 bg-surface-secondary px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}